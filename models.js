const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  userId: { 
    type: String, 
    required: true, 
    unique: true,
    match: /^[A-Za-z0-9]{6}$/
  },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff', 'admin'], default: 'student' },
});

const RoomSchema = new mongoose.Schema({
  number: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['available', 'occupied'], default: 'available' },
});

const MaintenanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
});

const EventSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
});

const FeeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  amount: { type: Number, required: true },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
});

const VisitorSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  visitDate: { type: String, required: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
});

const FeedbackSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  feedback: { type: String, required: true },
});

module.exports = {
  User: mongoose.model('User', UserSchema),
  Room: mongoose.model('Room', RoomSchema),
  Maintenance: mongoose.model('Maintenance', MaintenanceSchema),
  Event: mongoose.model('Event', EventSchema),
  Fee: mongoose.model('Fee', FeeSchema),
  Visitor: mongoose.model('Visitor', VisitorSchema),
  Feedback: mongoose.model('Feedback', FeedbackSchema),
};
