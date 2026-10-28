const mongoose = require('mongoose');

const appointmentSchema = new mongoose.Schema({
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  timeSlot: {
    start: { type: String, required: true },
    end: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in-progress', 'completed', 'cancelled', 'rescheduled', 'incomplete'],
    default: 'pending'
  },
  type: {
    type: String,
    enum: ['general', 'follow-up', 'emergency'],
    default: 'general'
  },
  symptoms: { type: String },
  notes: { type: String },
  cancelReason: { type: String },
  consultationSession: { type: mongoose.Schema.Types.ObjectId, ref: 'ConsultationSession' },
  prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }
}, { timestamps: true, versionKey: '__v' });

module.exports = mongoose.model('Appointment', appointmentSchema);
