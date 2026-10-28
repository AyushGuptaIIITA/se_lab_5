const express = require('express');
const Appointment = require('../models/Appointment');
const User = require('../models/User');
const { auth, patientOnly, doctorOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');

const router = express.Router();

// POST /api/appointments — Book a new appointment (patient only)
router.post('/', auth, patientOnly, async (req, res) => {
  try {
    const { doctor, date, timeSlot, type, symptoms } = req.body;

    if (!doctor || !date || !timeSlot || !timeSlot.start || !timeSlot.end) {
      return res.status(400).json({ message: 'Doctor, date, and timeSlot are required.' });
    }

    // Verify doctor exists
    const doctorUser = await User.findOne({ _id: doctor, role: 'doctor', status: 'active' });
    if (!doctorUser) {
      return res.status(404).json({ message: 'Doctor not found or inactive.' });
    }

    // Check for double-booking
    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      doctor,
      date: { $gte: startOfDay, $lte: endOfDay },
      'timeSlot.start': timeSlot.start,
      'timeSlot.end': timeSlot.end,
      status: { $nin: ['cancelled', 'rescheduled'] }
    });

    if (existingAppointment) {
      return res.status(409).json({ message: 'This time slot is already booked.' });
    }

    const appointment = new Appointment({
      patient: req.user._id,
      doctor,
      date: appointmentDate,
      timeSlot,
      type: type || 'general',
      symptoms,
      status: 'pending'
    });

    await appointment.save();

    // Populate for response
    const populatedAppointment = await Appointment.findById(appointment._id)
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization consultationFee');

    // Create audit log
    await createAuditLog(
      'APPOINTMENT_BOOKED',
      req.user._id,
      req.user.role,
      req.user.name,
      'Appointment',
      appointment._id,
      {
        doctor: doctorUser.name,
        date: appointmentDate,
        timeSlot,
        type: type || 'general'
      },
      req.ip
    );

    res.status(201).json({
      message: 'Appointment booked successfully.',
      appointment: populatedAppointment
    });
  } catch (err) {
    console.error('Book appointment error:', err);
    res.status(500).json({ message: 'Server error booking appointment.' });
  }
});

// GET /api/appointments — Get user's appointments
router.get('/', auth, async (req, res) => {
  try {
    const { status, page = 1, limit = 10, from, to } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const filter = {};

    // Filter by role
    if (req.user.role === 'patient') {
      filter.patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    }
    // Admin sees all — no filter by user

    if (status) {
      filter.status = status;
    }

    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = new Date(from);
      if (to) filter.date.$lte = new Date(to);
    }

    const total = await Appointment.countDocuments(filter);
    const appointments = await Appointment.find(filter)
      .populate('patient', 'name email phone profileImage')
      .populate('doctor', 'name email specialization consultationFee profileImage')
      .populate('prescription')
      .populate('consultationSession')
      .sort({ date: -1, 'timeSlot.start': -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      appointments,
      total,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Get appointments error:', err);
    res.status(500).json({ message: 'Server error fetching appointments.' });
  }
});

// GET /api/appointments/:id — Get single appointment
router.get('/:id', auth, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email phone gender dateOfBirth bloodGroup address emergencyContact profileImage')
      .populate('doctor', 'name email specialization consultationFee bio licenseNumber profileImage')
      .populate('prescription')
      .populate('consultationSession');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    // Check authorization
    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      appointment.patient._id.toString() !== userId &&
      appointment.doctor._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ appointment });
  } catch (err) {
    console.error('Get appointment error:', err);
    res.status(500).json({ message: 'Server error fetching appointment.' });
  }
});

// PATCH /api/appointments/:id/status — Update appointment status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { status, cancelReason } = req.body;

    if (!status) {
      return res.status(400).json({ message: 'Status is required.' });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const userId = req.user._id.toString();

    // Authorization: doctors can confirm/cancel, patients can cancel
    if (req.user.role === 'doctor') {
      if (appointment.doctor._id.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      if (!['confirmed', 'cancelled'].includes(status)) {
        return res.status(400).json({ message: 'Doctors can only confirm or cancel appointments.' });
      }
    } else if (req.user.role === 'patient') {
      if (appointment.patient._id.toString() !== userId) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ message: 'Patients can only cancel appointments.' });
      }
    } else if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    appointment.status = status;
    if (cancelReason) {
      appointment.cancelReason = cancelReason;
    }

    await appointment.save();

    // Create audit log
    await createAuditLog(
      'APPOINTMENT_STATUS_CHANGED',
      req.user._id,
      req.user.role,
      req.user.name,
      'Appointment',
      appointment._id,
      { status, cancelReason: cancelReason || null },
      req.ip
    );

    res.json({
      message: `Appointment ${status} successfully.`,
      appointment
    });
  } catch (err) {
    console.error('Update appointment status error:', err);
    res.status(500).json({ message: 'Server error updating appointment status.' });
  }
});

// PATCH /api/appointments/:id/reschedule — Reschedule appointment (doctor)
router.patch('/:id/reschedule', auth, doctorOnly, async (req, res) => {
  try {
    const { date, timeSlot } = req.body;

    if (!date || !timeSlot || !timeSlot.start || !timeSlot.end) {
      return res.status(400).json({ message: 'Date and timeSlot are required.' });
    }

    const appointment = await Appointment.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    if (appointment.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    // Check for double-booking on new slot
    const newDate = new Date(date);
    const startOfDay = new Date(newDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(newDate);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAppointment = await Appointment.findOne({
      _id: { $ne: appointment._id },
      doctor: appointment.doctor._id,
      date: { $gte: startOfDay, $lte: endOfDay },
      'timeSlot.start': timeSlot.start,
      'timeSlot.end': timeSlot.end,
      status: { $nin: ['cancelled', 'rescheduled'] }
    });

    if (existingAppointment) {
      return res.status(409).json({ message: 'This time slot is already booked.' });
    }

    appointment.date = newDate;
    appointment.timeSlot = timeSlot;
    appointment.status = 'rescheduled';
    await appointment.save();

    // Create audit log
    await createAuditLog(
      'APPOINTMENT_RESCHEDULED',
      req.user._id,
      req.user.role,
      req.user.name,
      'Appointment',
      appointment._id,
      { newDate: date, newTimeSlot: timeSlot },
      req.ip
    );

    res.json({
      message: 'Appointment rescheduled successfully.',
      appointment
    });
  } catch (err) {
    console.error('Reschedule appointment error:', err);
    res.status(500).json({ message: 'Server error rescheduling appointment.' });
  }
});

module.exports = router;
