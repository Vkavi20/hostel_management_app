const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// User Schema
const userSchema = new Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'staff', 'admin'], required: true },
}, { timestamps: true });

// Room Schema
const roomSchema = new Schema({
  number: { type: String, required: true, unique: true },
  roomType: { type: String, enum: ['single', 'double', 'triple'], required: true },
  hostelBlock: { type: String, enum: ['Block A', 'Block B', 'Block C'], required: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['available', 'occupied'], default: 'available' },
}, { timestamps: true });

// Room Request Schema
const roomRequestSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
}, { timestamps: true });

// Maintenance Schema
const maintenanceSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'In Progress', 'Completed'], default: 'Pending' },
  assignedStaff: { type: Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

// Event Schema
const eventSchema = new Schema({
  title: { type: String, required: true },
  date: { type: String, required: true },
}, { timestamps: true });

// Fee Schema
const feeSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  amount: { type: Number, required: true },
  dueDate: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Paid'], default: 'Pending' },
}, { timestamps: true });

// Visitor Schema
const visitorSchema = new Schema({
  name: { type: String, required: true },
  contactNumber: { type: String, required: true },
  visitDate: { type: String, required: true },
  purpose: { type: String, required: true },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
}, { timestamps: true });

// Feedback Schema
const feedbackSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  feedback: { type: String, required: true },
}, { timestamps: true });

module.exports = {
  User: mongoose.model('User', userSchema),
  Room: mongoose.model('Room', roomSchema),
  RoomRequest: mongoose.model('RoomRequest', roomRequestSchema),
  Maintenance: mongoose.model('Maintenance', maintenanceSchema),
  Event: mongoose.model('Event', eventSchema),
  Fee: mongoose.model('Fee', feeSchema),
  Visitor: mongoose.model('Visitor', visitorSchema),
  Feedback: mongoose.model('Feedback', feedbackSchema),
};
