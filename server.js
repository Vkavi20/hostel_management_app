const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const models = require('./models');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your_jwt_secret'; // Replace with a secure secret in production

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/hostel_management', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('Connected to MongoDB'));

// Authentication Middleware
const authMiddleware = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    const decoded = jwt.verify(token.split(' ')[1], JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new models.User({
      name,
      email,
      password: hashedPassword,
      role,
    });
    await user.save();
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ message: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await models.User.findOne({ email });
    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { _id: user._id, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// Room Routes
app.get('/api/rooms', authMiddleware, async (req, res) => {
  const rooms = await models.Room.find({ userId: req.user.id });
  res.json(rooms);
});

app.post('/api/rooms', authMiddleware, async (req, res) => {
  const { number, userId } = req.body;
  const room = new models.Room({ number, userId });
  await room.save();
  res.status(201).json(room);
});

// Maintenance Routes
app.get('/api/maintenance', authMiddleware, async (req, res) => {
  const requests = await models.Maintenance.find();
  res.json(requests);
});

app.post('/api/maintenance', authMiddleware, async (req, res) => {
  const { userId, description } = req.body;
  const request = new models.Maintenance({ userId, description, status: 'Pending' });
  await request.save();
  res.status(201).json(request);
});

app.put('/api/maintenance/:id', authMiddleware, async (req, res) => {
  const { status } = req.body;
  const request = await models.Maintenance.findByIdAndUpdate(req.params.id, { status }, { new: true });
  res.json(request);
});

// Event Routes
app.get('/api/events', authMiddleware, async (req, res) => {
  const events = await models.Event.find();
  res.json(events);
});

app.post('/api/events', authMiddleware, async (req, res) => {
  const { title, date } = req.body;
  const event = new models.Event({ title, date });
  await event.save();
  res.status(201).json(event);
});

// Fees Routes
app.get('/api/fees', authMiddleware, async (req, res) => {
  const fees = await models.Fee.find({ userId: req.user.id });
  res.json(fees);
});

app.post('/api/fees', authMiddleware, async (req, res) => {
  const { userId, amount, dueDate } = req.body;
  const fee = new models.Fee({ userId, amount, dueDate });
  await fee.save();
  res.status(201).json(fee);
});

// Lost & Found Routes
app.get('/api/lost-found', authMiddleware, async (req, res) => {
  const items = await models.LostFound.find();
  res.json(items);
});

app.post('/api/lost-found', authMiddleware, async (req, res) => {
  const { description } = req.body;
  const item = new models.LostFound({ description });
  await item.save();
  res.status(201).json(item);
});

// Visitor Routes
app.get('/api/visitors', authMiddleware, async (req, res) => {
  const visitors = await models.Visitor.find();
  res.json(visitors);
});

app.post('/api/visitors', authMiddleware, async (req, res) => {
  const { name, status } = req.body;
  const visitor = new models.Visitor({ name, status });
  await visitor.save();
  res.status(201).json(visitor);
});

// Message Routes
app.get('/api/messages', authMiddleware, async (req, res) => {
  const messages = await models.Message.find();
  res.json(messages);
});

app.post('/api/messages', authMiddleware, async (req, res) => {
  const { sender, content } = req.body;
  const message = new models.Message({ sender, content });
  await message.save();
  res.status(201).json(message);
});

// Feedback Routes
app.get('/api/feedback', authMiddleware, async (req, res) => {
  const feedbacks = await models.Feedback.find();
  res.json(feedbacks);
});

app.post('/api/feedback', authMiddleware, async (req, res) => {
  const { userId, feedback } = req.body;
  const fb = new models.Feedback({ userId, feedback });
  await fb.save();
  res.status(201).json(fb);
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
