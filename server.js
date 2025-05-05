const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const models = require('./models');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'qTa1Oet2o7ijxFcCPJe2AEjeQHZlxeFmsCHNDJmOxSeQi0NmRaQC6YRfXl192uZd/QX4Ge6sqPRtrMqUpTGnOw==';

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

// Utility to generate 6-digit alphanumeric userId
function generateUserId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Routes

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password, role } = req.body;
  try {
    if (role === 'admin') {
      const adminExists = await models.User.findOne({ role: 'admin' });
      if (adminExists) {
        return res.status(400).json({ message: 'Admin already exists' });
      }
    }

    let userId;
    do {
      userId = generateUserId();
    } while (await models.User.findOne({ userId }));

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new models.User({
      userId,
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

    const token = jwt.sign({ id: user._id, role: user.role, userId: user.userId }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ token, user: { _id: user._id, userId: user.userId, name: user.name, role: user.role } });
  } catch (err) {
    res.status(500).json({ message: 'Login failed' });
  }
});

// Room Routes
app.get('/api/rooms', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const rooms = await models.Room.find().populate('userId', 'userId name');
      res.json(rooms);
    } else {
      const rooms = await models.Room.find({ userId: req.user.id });
      res.json(rooms);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch rooms' });
  }
});

app.get('/api/rooms/available', authMiddleware, async (req, res) => {
  try {
    const rooms = await models.Room.find({ status: 'available' });
    res.json(rooms);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch available rooms' });
  }
});

app.post('/api/rooms', authMiddleware, async (req, res) => {
  const { number, userId } = req.body;
  try {
    // Validate room number uniqueness
    const existingRoom = await models.Room.findOne({ number });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room number already exists' });
    }

    // If userId is provided, check if the user already has a room (for non-admins)
    if (userId && req.user.role !== 'admin') {
      const userRoom = await models.Room.findOne({ userId: req.user.id });
      if (userRoom) {
        return res.status(400).json({ message: 'You already have a room assigned' });
      }
    }

    // Restrict non-admins to assigning rooms only to themselves
    if (userId && req.user.role !== 'admin' && userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to assign room to another user' });
    }

    const room = new models.Room({ 
      number, 
      userId: userId || null, 
      status: userId ? 'occupied' : 'available' 
    });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create room' });
  }
});

app.delete('/api/rooms/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const room = await models.Room.findByIdAndUpdate(
      req.params.id,
      { userId: null, status: 'available' },
      { new: true }
    );
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json({ message: 'Room unassigned' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to unassign room' });
  }
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
  try {
    if (req.user.role === 'admin') {
      const fees = await models.Fee.find().populate('userId', 'userId name');
      res.json(fees);
    } else {
      const fees = await models.Fee.find({ userId: req.user.id });
      res.json(fees);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch fees' });
  }
});

app.post('/api/fees', authMiddleware, async (req, res) => {
  const { userId, amount, dueDate } = req.body;
  const fee = new models.Fee({ userId, amount, dueDate, status: 'Pending' });
  await fee.save();
  res.status(201).json(fee);
});

app.put('/api/fees/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { status } = req.body;
  try {
    const fee = await models.Fee.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    res.json(fee);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update fee status' });
  }
});

// Visitor Routes
app.get('/api/visitors', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const visitors = await models.Visitor.find().populate('userId', 'userId name');
      res.json(visitors);
    } else {
      const visitors = await models.Visitor.find();
      res.json(visitors);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch visitors' });
  }
});

app.post('/api/visitors', authMiddleware, async (req, res) => {
  const { name, contactNumber, visitDate, purpose, status } = req.body;
  const visitor = new models.Visitor({ name, contactNumber, visitDate, purpose, status: status || 'Pending' });
  await visitor.save();
  res.status(201).json(visitor);
});

app.put('/api/visitors/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { status } = req.body;
  try {
    const visitor = await models.Visitor.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update visitor status' });
  }
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
