const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['sick', 'casual', 'emergency', 'personal', 'conference'],
    default: 'casual'
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewNote: {
    type: String,
    trim: true
  },
  reviewedAt: {
    type: Date
  },
  appointmentHandling: {
    type: String,
    enum: ['reschedule', 'cancel', 'transfer'],
    default: 'reschedule'
  },
  attachmentUrl: {
    type: String
  }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
