const mongoose = require('mongoose');

const networkEventSchema = new mongoose.Schema({
  event: {
    type: String,
    enum: ['connected', 'disconnected', 'reconnected', 'quality-degraded', 'quality-restored'],
    required: true
  },
  timestamp: { type: Date, default: Date.now },
  details: { type: String }
}, { _id: true });

const consultationSessionSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: {
    type: String,
    enum: ['waiting', 'in-progress', 'completed', 'disconnected'],
    default: 'waiting'
  },
  startedAt: { type: Date },
  endedAt: { type: Date },
  consultationNotes: { type: String },
  networkEvents: [networkEventSchema],
  duration: { type: Number }
}, { timestamps: true });

module.exports = mongoose.model('ConsultationSession', consultationSessionSchema);
