const express = require('express');
const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');
const { auth, doctorOnly, adminOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');

const router = express.Router();

// POST /api/leaves — Doctor submits a leave request
router.post('/', auth, doctorOnly, async (req, res) => {
  try {
    const { startDate, endDate, reason, type, appointmentHandling } = req.body;

    if (!startDate || !endDate || !reason) {
      return res.status(400).json({ message: 'startDate, endDate, and reason are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: 'Invalid date format.' });
    }

    if (end < start) {
      return res.status(400).json({ message: 'End date cannot be before start date.' });
    }

    // Check for overlapping approved/pending leaves
    const overlap = await LeaveRequest.findOne({
      doctor: req.user._id,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: end }, endDate: { $gte: start } }
      ]
    });

    if (overlap) {
      return res.status(409).json({
        message: 'You already have a pending or approved leave that overlaps with this date range.'
      });
    }

    const leave = new LeaveRequest({
      doctor: req.user._id,
      startDate: start,
      endDate: end,
      reason,
      type: type || 'casual',
      appointmentHandling: appointmentHandling || 'reschedule',
      status: 'pending'
    });

    await leave.save();

    await createAuditLog(
      'LEAVE_REQUESTED',
      req.user._id,
      req.user.role,
      req.user.name,
      'LeaveRequest',
      leave._id,
      { startDate, endDate, type, reason },
      req.ip
    );

    res.status(201).json({ message: 'Leave request submitted successfully.', leave });
  } catch (err) {
    console.error('Leave request error:', err);
    res.status(500).json({ message: 'Server error submitting leave request.' });
  }
});

// GET /api/leaves — Doctor gets own leaves; Admin gets all
router.get('/', auth, async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'doctor') {
      filter.doctor = req.user._id;
    } else if (req.user.role !== 'admin' && !req.user.isDelegatedAdmin) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const { status, page = 1, limit = 20 } = req.query;
    if (status) filter.status = status;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const total = await LeaveRequest.countDocuments(filter);
    const leaves = await LeaveRequest.find(filter)
      .populate('doctor', 'name email specialization')
      .populate('reviewedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({ leaves, total, pages: Math.ceil(total / limitNum) });
  } catch (err) {
    console.error('Get leaves error:', err);
    res.status(500).json({ message: 'Server error fetching leave requests.' });
  }
});

// GET /api/leaves/:id — Get specific leave request
router.get('/:id', auth, async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id)
      .populate('doctor', 'name email specialization')
      .populate('reviewedBy', 'name email');

    if (!leave) return res.status(404).json({ message: 'Leave request not found.' });

    // Doctor can only see own; admin/delegate can see all
    if (req.user.role === 'doctor' && leave.doctor._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ leave });
  } catch (err) {
    console.error('Get leave error:', err);
    res.status(500).json({ message: 'Server error fetching leave request.' });
  }
});

// PATCH /api/leaves/:id/review — Admin approves or rejects a leave
router.patch('/:id/review', auth, adminOnly, async (req, res) => {
  try {
    const { status, reviewNote } = req.body;

    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be "approved" or "rejected".' });
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('doctor', 'name email');
    if (!leave) return res.status(404).json({ message: 'Leave request not found.' });

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: `Leave request is already ${leave.status}.` });
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewNote = reviewNote || '';
    leave.reviewedAt = new Date();

    await leave.save();

    await createAuditLog(
      status === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED',
      req.user._id,
      req.user.role,
      req.user.name,
      'LeaveRequest',
      leave._id,
      { doctorName: leave.doctor?.name, status, reviewNote },
      req.ip
    );

    res.json({ message: `Leave request ${status} successfully.`, leave });
  } catch (err) {
    console.error('Review leave error:', err);
    res.status(500).json({ message: 'Server error reviewing leave request.' });
  }
});

// DELETE /api/leaves/:id — Doctor cancels own pending leave
router.delete('/:id', auth, doctorOnly, async (req, res) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return res.status(404).json({ message: 'Leave request not found.' });

    if (leave.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'You can only cancel your own leave requests.' });
    }

    if (leave.status !== 'pending') {
      return res.status(400).json({ message: `Cannot cancel a leave that is already ${leave.status}.` });
    }

    await leave.deleteOne();
    res.json({ message: 'Leave request cancelled successfully.' });
  } catch (err) {
    console.error('Cancel leave error:', err);
    res.status(500).json({ message: 'Server error cancelling leave request.' });
  }
});

module.exports = router;
