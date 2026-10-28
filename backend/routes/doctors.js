const express = require('express');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const { auth, doctorOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/doctors — List doctors with filtering and search
router.get('/', async (req, res) => {
  try {
    const { specialization, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const filter = { role: 'doctor', status: 'active' };

    if (specialization) {
      filter.specialization = specialization;
    }

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const total = await User.countDocuments(filter);
    const doctors = await User.find(filter)
      .select('-password')
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .sort({ name: 1 });

    res.json({
      doctors,
      total,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Get doctors error:', err);
    res.status(500).json({ message: 'Server error fetching doctors.' });
  }
});

// GET /api/doctors/specializations — Distinct specialization list
router.get('/specializations', async (req, res) => {
  try {
    const specializations = await User.distinct('specialization', {
      role: 'doctor',
      status: 'active',
      specialization: { $ne: null, $ne: '' }
    });
    res.json({ specializations: specializations.filter(Boolean) });
  } catch (err) {
    console.error('Get specializations error:', err);
    res.status(500).json({ message: 'Server error fetching specializations.' });
  }
});

// GET /api/doctors/:id — Get single doctor
router.get('/:id', async (req, res) => {
  try {
    const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' }).select('-password');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }
    res.json({ doctor });
  } catch (err) {
    console.error('Get doctor error:', err);
    res.status(500).json({ message: 'Server error fetching doctor.' });
  }
});

// GET /api/doctors/:id/availability — Check available slots for a date
router.get('/:id/availability', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ message: 'Date query parameter is required.' });
    }

    const doctor = await User.findOne({ _id: req.params.id, role: 'doctor' }).select('-password');
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    // Parse YYYY-MM-DD correctly without UTC midnight offset issues
    const [year, month, day] = date.split('-').map(Number);
    const queryDate = new Date(year, month - 1, day);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayOfWeek = days[queryDate.getDay()];

    // Get doctor's active slots for this day
    const daySlots = (doctor.availableSlots || []).filter(
      slot => slot.day === dayOfWeek && slot.isActive
    );

    // Get existing appointments for this doctor on this date
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    const existingAppointments = await Appointment.find({
      doctor: req.params.id,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['cancelled', 'rescheduled'] }
    });

    // Booked slot keys
    const bookedSlots = existingAppointments.map(apt => `${apt.timeSlot.start}-${apt.timeSlot.end}`);

    // Return slots with standardized { start, end, available } properties for the frontend
    const slots = daySlots.map(slot => {
      const start = slot.startTime || slot.start;
      const end = slot.endTime || slot.end;
      const isBooked = bookedSlots.includes(`${start}-${end}`);
      return {
        _id: slot._id,
        start,
        end,
        startTime: start,
        endTime: end,
        available: !isBooked,
        isBooked
      };
    });

    const availableCount = slots.filter(s => s.available).length;

    res.json({
      doctor: { _id: doctor._id, name: doctor.name, specialization: doctor.specialization },
      date,
      dayOfWeek,
      slots,
      totalSlots: slots.length,
      availableCount
    });
  } catch (err) {
    console.error('Get availability error:', err);
    res.status(500).json({ message: 'Server error fetching availability.' });
  }
});

// PUT /api/doctors/schedule — Doctor updates their own available slots
router.put('/schedule', auth, doctorOnly, async (req, res) => {
  try {
    const { availableSlots } = req.body;

    if (!availableSlots || !Array.isArray(availableSlots)) {
      return res.status(400).json({ message: 'availableSlots array is required.' });
    }

    const doctor = await User.findById(req.user._id);
    if (!doctor) {
      return res.status(404).json({ message: 'Doctor not found.' });
    }

    const dayOrder = { Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5, Saturday: 6, Sunday: 7 };
    const cleanedSlots = availableSlots.map(s => ({
      day: s.day,
      startTime: s.startTime || s.start,
      endTime: s.endTime || s.end,
      isActive: s.isActive !== false
    })).sort((a, b) => (dayOrder[a.day] - dayOrder[b.day]) || (a.startTime || '').localeCompare(b.startTime || ''));

    doctor.availableSlots = cleanedSlots;
    await doctor.save();

    const doctorObj = doctor.toObject();
    delete doctorObj.password;

    res.json({
      message: 'Schedule updated successfully.',
      doctor: doctorObj
    });
  } catch (err) {
    console.error('Update schedule error:', err);
    res.status(500).json({ message: 'Server error updating schedule.' });
  }
});

module.exports = router;
