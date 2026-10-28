const mongoose = require('mongoose');

const medicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  duration: { type: String, required: true },
  instructions: { type: String }
}, { _id: true });

const digitalSignatureSchema = new mongoose.Schema({
  signedBy: { type: String },
  signedAt: { type: Date },
  signatureHash: { type: String },
  certificateId: { type: String }
}, { _id: false });

const prescriptionSchema = new mongoose.Schema({
  appointment: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
  patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  diagnosis: { type: String, required: true },
  medications: [medicationSchema],
  additionalNotes: { type: String },
  digitalSignature: digitalSignatureSchema,
  pharmacyStatus: {
    type: String,
    enum: ['pending', 'sent', 'received', 'dispensed', 'failed'],
    default: 'pending'
  },
  pharmacyResponse: { type: mongoose.Schema.Types.Mixed },
  sentToPharmacyAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);
