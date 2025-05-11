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
mongoose.connect('mongodb://localhost:27017/hostel_management')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

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
  const { number, roomType, hostelBlock, userId } = req.body;
  try {
    const existingRoom = await models.Room.findOne({ number });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room number already exists' });
    }
    if (userId && req.user.role !== 'admin') {
      const userRoom = await models.Room.findOne({ userId: req.user.id });
      if (userRoom) {
        return res.status(400).json({ message: 'You already have a room assigned' });
      }
      if (userId !== req.user.id) {
        return res.status(403).json({ message: 'Unauthorized to assign room to another user' });
      }
    }
    const room = new models.Room({ 
      number, 
      roomType,
      hostelBlock,
      userId: userId || null, 
      status: userId ? 'occupied' : 'available' 
    });
    await room.save();
    res.status(201).json(room);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create room' });
  }
});

app.put('/api/rooms/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { number, roomType, hostelBlock, userId, status } = req.body;
  try {
    const existingRoom = await models.Room.findOne({ number, _id: { $ne: req.params.id } });
    if (existingRoom) {
      return res.status(400).json({ message: 'Room number already exists' });
    }
    const room = await models.Room.findByIdAndUpdate(
      req.params.id,
      { number, roomType, hostelBlock, userId, status },
      { new: true }
    ).populate('userId', 'userId name');
    if (!room) return res.status(404).json({ message: 'Room not found' });
    res.json(room);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update room' });
  }
});

app.delete('/api/rooms/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const room = await models.Room.findById(req.params.id);
    if (!room) return res.status(404).json({ message: 'Room not found' });
    if (req.query.action === 'unassign') {
      room.userId = null;
      room.status = 'available';
      await room.save();
      res.json({ message: 'Room unassigned' });
    } else {
      await models.Room.findByIdAndDelete(req.params.id);
      res.json({ message: 'Room deleted' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to process room deletion' });
  }
});

// Room Request Routes
app.post('/api/room-requests', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can request rooms' });
  }
  try {
    const existingRequest = await models.RoomRequest.findOne({ userId: req.user.id, status: 'pending' });
    if (existingRequest) {
      return res.status(400).json({ message: 'You already have a pending room request' });
    }
    const existingRoom = await models.Room.findOne({ userId: req.user.id });
    if (existingRoom) {
      return res.status(400).json({ message: 'You already have a room assigned' });
    }
    const request = new models.RoomRequest({ userId: req.user.id });
    await request.save();
    res.status(201).json({ message: 'Room request submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to submit room request' });
  }
});

app.get('/api/room-requests', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const requests = await models.RoomRequest.find({ status: 'pending' }).populate('userId', 'userId name');
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch room requests' });
  }
});

app.put('/api/room-requests/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { status, number, roomType, hostelBlock } = req.body;
  try {
    const request = await models.RoomRequest.findById(req.params.id).populate('userId');
    if (!request) {
      return res.status(404).json({ message: 'Request not found' });
    }
    if (status === 'approved') {
      const existingRoom = await models.Room.findOne({ number });
      if (existingRoom) {
        return res.status(400).json({ message: 'Room number already exists' });
      }
      const room = new models.Room({
        number,
        roomType,
        hostelBlock,
        userId: request.userId._id,
        status: 'occupied',
      });
      await room.save();
    }
    request.status = status;
    await request.save();
    res.json({ message: `Request ${status}` });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update request' });
  }
});

// Maintenance Routes
app.get('/api/maintenance', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'student') {
      const requests = await models.Maintenance.find({ userId: req.user.id }).populate('userId', 'userId name');
      res.json(requests);
    } else {
      const requests = await models.Maintenance.find().populate('userId', 'userId name');
      res.json(requests);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch maintenance requests' });
  }
});

app.post('/api/maintenance', authMiddleware, async (req, res) => {
  const { userId, description, status } = req.body;
  try {
    if (req.user.role === 'student' && userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized to create request for another user' });
    }
    const request = new models.Maintenance({ userId, description, status: status || 'Pending' });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create maintenance request' });
  }
});

app.put('/api/maintenance/:id', authMiddleware, async (req, res) => {
  if (req.user.role === 'student') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { description, status } = req.body;
  try {
    const request = await models.Maintenance.findByIdAndUpdate(
      req.params.id, 
      { description, status }, 
      { new: true }
    ).populate('userId', 'userId name');
    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });
    res.json(request);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update maintenance request' });
  }
});

app.delete('/api/maintenance/:id', authMiddleware, async (req, res) => {
  if (req.user.role === 'student') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const request = await models.Maintenance.findByIdAndDelete(req.params.id);
    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });
    res.json({ message: 'Maintenance request deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete maintenance request' });
  }
});

// Event Routes
app.get('/api/events', authMiddleware, async (req, res) => {
  try {
    const events = await models.Event.find();
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch events' });
  }
});

app.post('/api/events', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { title, date } = req.body;
  try {
    const event = new models.Event({ title, date });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create event' });
  }
});

app.put('/api/events/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { title, date } = req.body;
  try {
    const event = await models.Event.findByIdAndUpdate(
      req.params.id,
      { title, date },
      { new: true }
    );
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json(event);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update event' });
  }
});

app.delete('/api/events/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const event = await models.Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    res.json({ message: 'Event deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete event' });
  }
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
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { userId, amount, dueDate, status } = req.body;
  try {
    const fee = new models.Fee({ userId, amount, dueDate, status: status || 'Pending' });
    await fee.save();
    res.status(201).json(fee);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create fee' });
  }
});

app.put('/api/fees/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  const { userId, amount, dueDate, status } = req.body;
  try {
    const fee = await models.Fee.findByIdAndUpdate(
      req.params.id,
      { userId, amount, dueDate, status },
      { new: true }
    ).populate('userId', 'userId name');
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    res.json(fee);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update fee' });
  }
});

app.delete('/api/fees/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Unauthorized' });
  }
  try {
    const fee = await models.Fee.findByIdAndDelete(req.params.id);
    if (!fee) return res.status(404).json({ message: 'Fee not found' });
    res.json({ message: 'Fee deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete fee' });
  }
});

// Visitor Routes
app.get('/api/visitors', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'staff') {
      const visitors = await models.Visitor.find();
      res.json(visitors);
    } else if (req.user.role === 'student') {
      const visitors = await models.Visitor.find();
      res.json(visitors);
    } else {
      return res.status(403).json({ message: 'Unauthorized' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch visitors' });
  }
});

app.post('/api/visitors', authMiddleware, async (req, res) => {
  if (req.user.role !== 'student') {
    return res.status(403).json({ message: 'Only students can register visitors' });
  }
  const { name, contactNumber, visitDate, purpose, status } = req.body;
  try {
    const visitor = new models.Visitor({ name, contactNumber, visitDate, purpose, status: status || 'Pending' });
    await visitor.save();
    res.status(201).json(visitor);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create visitor' });
  }
});

app.put('/api/visitors/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'staff') {
    return res.status(403).json({ message: 'Only staff can update visitor status' });
  }
  const { status } = req.body;
  try {
    const visitor = await models.Visitor.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    );
    if (!visitor) return res.status(404).json({ message: 'Visitor not found' });
    res.json(visitor);
  } catch (err) {
    res.status(500).json({ message: 'Failed to update visitor status' });
  }
});

// Feedback Routes
app.get('/api/feedback', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'admin') {
      const feedbacks = await models.Feedback.find().populate('userId', 'userId name');
      res.json(feedbacks);
    } else {
      const feedbacks = await models.Feedback.find({ userId: req.user.id });
      res.json(feedbacks);
    }
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch feedback' });
  }
});

app.post('/api/feedback', authMiddleware, async (req, res) => {
  const { userId, feedback } = req.body;
  try {
    if (req.user.role !== 'student' || userId !== req.user.id) {
      return res.status(403).json({ message: 'Unauthorized' });
    }
    const fb = new models.Feedback({ userId, feedback });
    await fb.save();
    res.status(201).json(fb);
  } catch (err) {
    res.status(500).json({ message: 'Failed to create feedback' });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
