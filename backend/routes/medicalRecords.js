const express = require('express');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const ConsultationSession = require('../models/ConsultationSession');
const { auth, patientOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/medical-records — Patient's own medical records
router.get('/', auth, patientOnly, async (req, res) => {
  try {
    const appointments = await Appointment.find({ patient: req.user._id })
      .populate('doctor', 'name email specialization consultationFee profileImage')
      .populate('prescription')
      .populate('consultationSession')
      .sort({ date: -1 });

    const prescriptions = await Prescription.find({ patient: req.user._id })
      .populate('doctor', 'name email specialization')
      .populate('appointment', 'date timeSlot status type')
      .sort({ createdAt: -1 });

    res.json({
      appointments,
      prescriptions,
      totalAppointments: appointments.length,
      totalPrescriptions: prescriptions.length
    });
  } catch (err) {
    console.error('Get medical records error:', err);
    res.status(500).json({ message: 'Server error fetching medical records.' });
  }
});

// GET /api/medical-records/patient/:patientId — Doctor/admin view patient records
router.get('/patient/:patientId', auth, async (req, res) => {
  try {
    // Only doctors who treated this patient or admins can access
    if (req.user.role === 'patient') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const patientId = req.params.patientId;

    // If doctor, verify they have appointments with this patient
    if (req.user.role === 'doctor') {
      const hasAppointment = await Appointment.findOne({
        doctor: req.user._id,
        patient: patientId
      });
      if (!hasAppointment) {
        return res.status(403).json({ message: 'Access denied. You have no appointments with this patient.' });
      }
    }

    const appointments = await Appointment.find({ patient: patientId })
      .populate('doctor', 'name email specialization consultationFee profileImage')
      .populate('prescription')
      .populate('consultationSession')
      .sort({ date: -1 });

    const prescriptions = await Prescription.find({ patient: patientId })
      .populate('doctor', 'name email specialization')
      .populate('appointment', 'date timeSlot status type')
      .sort({ createdAt: -1 });

    res.json({
      appointments,
      prescriptions,
      totalAppointments: appointments.length,
      totalPrescriptions: prescriptions.length
    });
  } catch (err) {
    console.error('Get patient medical records error:', err);
    res.status(500).json({ message: 'Server error fetching patient medical records.' });
  }
});

module.exports = router;
