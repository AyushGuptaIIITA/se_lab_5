const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    index: true 
  },
  actor: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  type: { 
    type: String, 
    enum: [
      'PRESCRIPTION_CREATED',
      'PRESCRIPTION_SENT_TO_PHARMACY', 
      'APPOINTMENT_BOOKED',
      'APPOINTMENT_REMINDER',
      'APPOINTMENT_CANCELLED',
      'CONSULTATION_STARTED',
      'CONSULTATION_ENDED',
      'REFILL_REQUESTED',
      'REFILL_APPROVED',
      'REFILL_DECLINED',
      'LAB_RESULT_READY',
      'SYSTEM_ANNOUNCEMENT'
    ],
    required: true 
  },
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  read: { type: Boolean, default: false, index: true },
  readAt: { type: Date },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'], 
    default: 'normal' 
  },
  actionUrl: { type: String },
}, { timestamps: true });

// Compound index for efficient queries
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);