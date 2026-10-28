const express = require('express');
const crypto = require('crypto');
const Prescription = require('../models/Prescription');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth, doctorOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');
const { sendToPharmacy } = require('../utils/pharmacyAdapter');

const router = express.Router();

// POST /api/prescriptions — Create a prescription (doctor only)
router.post('/', auth, doctorOnly, async (req, res) => {
  try {
    const { appointmentId, diagnosis, medications, additionalNotes } = req.body;

    if (!appointmentId || !diagnosis || !medications || !medications.length) {
      return res.status(400).json({ message: 'appointmentId, diagnosis, and medications are required.' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied. This is not your appointment.' });
    }

    // Check if prescription already exists for this appointment
    const existingPrescription = await Prescription.findOne({ appointment: appointmentId });
    if (existingPrescription) {
      return res.status(400).json({ message: 'A prescription already exists for this appointment.' });
    }

    // Generate digital signature
    const signedAt = new Date();
    const contentToSign = `${diagnosis}|${req.user.name}|${signedAt.toISOString()}`;
    const signatureHash = crypto.createHash('sha256').update(contentToSign).digest('hex');
    const certificateId = `CERT-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    const prescription = new Prescription({
      appointment: appointmentId,
      patient: appointment.patient._id,
      doctor: req.user._id,
      diagnosis,
      medications,
      additionalNotes: additionalNotes || '',
      digitalSignature: {
        signedBy: req.user.name,
        signedAt,
        signatureHash,
        certificateId
      },
      pharmacyStatus: 'pending'
    });

    await prescription.save();

    // Link prescription to appointment
    appointment.prescription = prescription._id;
    await appointment.save();

    // Create audit log
    await createAuditLog(
      'PRESCRIPTION_CREATED',
      req.user._id,
      req.user.role,
      req.user.name,
      'Prescription',
      prescription._id,
      {
        appointmentId,
        patientName: appointment.patient.name,
        diagnosis,
        medicationCount: medications.length
      },
      req.ip
    );

    res.status(201).json({
      message: 'Prescription created successfully.',
      prescription
    });
  } catch (err) {
    console.error('Create prescription error:', err);
    res.status(500).json({ message: 'Server error creating prescription.' });
  }
});

// GET /api/prescriptions — List prescriptions based on role
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const filter = {};

    if (req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    } else if (req.user.role === 'patient') {
      filter.patient = req.user._id;
    }
    // Admin sees all

    const total = await Prescription.countDocuments(filter);
    const prescriptions = await Prescription.find(filter)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization')
      .populate('appointment', 'date timeSlot status type')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      prescriptions,
      total,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Get prescriptions error:', err);
    res.status(500).json({ message: 'Server error fetching prescriptions.' });
  }
});

// GET /api/prescriptions/patient/:patientId — Get prescriptions for a specific patient (doctor/admin)
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    if (req.user.role === 'patient') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const prescriptions = await Prescription.find({ patient: req.params.patientId })
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization')
      .populate('appointment', 'date timeSlot status type')
      .sort({ createdAt: -1 });

    res.json({ prescriptions });
  } catch (err) {
    console.error('Get patient prescriptions error:', err);
    res.status(500).json({ message: 'Server error fetching patient prescriptions.' });
  }
});

// GET /api/prescriptions/:id — Get single prescription
router.get('/:id', auth, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email phone gender dateOfBirth bloodGroup address')
      .populate('doctor', 'name email specialization licenseNumber')
      .populate('appointment', 'date timeSlot status type symptoms notes');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    // Check authorization
    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      prescription.doctor._id.toString() !== userId &&
      prescription.patient._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ prescription });
  } catch (err) {
    console.error('Get prescription error:', err);
    res.status(500).json({ message: 'Server error fetching prescription.' });
  }
});

// POST /api/prescriptions/:id/send-to-pharmacy — Send prescription to pharmacy (doctor)
router.post('/:id/send-to-pharmacy', auth, doctorOnly, async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!prescription) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    if (prescription.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Send to pharmacy adapter
    const pharmacyResponse = await sendToPharmacy(prescription);

    prescription.pharmacyStatus = 'sent';
    prescription.pharmacyResponse = pharmacyResponse;
    prescription.sentToPharmacyAt = new Date();
    await prescription.save();

    // Create audit log
    await createAuditLog(
      'PRESCRIPTION_SENT_TO_PHARMACY',
      req.user._id,
      req.user.role,
      req.user.name,
      'Prescription',
      prescription._id,
      {
        pharmacyRefId: pharmacyResponse.pharmacyRefId,
        patientName: prescription.patient.name
      },
      req.ip
    );

    res.json({
      message: 'Prescription sent to pharmacy successfully.',
      prescription,
      pharmacyResponse
    });
  } catch (err) {
    console.error('Send to pharmacy error:', err);
    res.status(500).json({ message: 'Server error sending prescription to pharmacy.' });
  }
});

module.exports = router;
