const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const ConsultationSession = require('../models/ConsultationSession');
const AuditLog = require('../models/AuditLog');
const { auth, adminOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');

const router = express.Router();

// GET /api/admin/users — List users with filtering
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const filter = {};

    if (role) {
      filter.role = role;
    }
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const total = await User.countDocuments(filter);
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      users,
      total,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Admin get users error:', err);
    res.status(500).json({ message: 'Server error fetching users.' });
  }
});

// PATCH /api/admin/users/:id/status — Activate/suspend user
router.patch('/users/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'suspended'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (active/suspended) is required.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent self-suspension
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own status.' });
    }

    user.status = status;
    await user.save();

    // Create audit log
    await createAuditLog(
      status === 'suspended' ? 'USER_SUSPENDED' : 'USER_ACTIVATED',
      req.user._id,
      req.user.role,
      req.user.name,
      'User',
      user._id,
      { targetUser: user.name, targetEmail: user.email, newStatus: status },
      req.ip
    );

    res.json({
      message: `User ${status === 'suspended' ? 'suspended' : 'activated'} successfully.`,
      user
    });
  } catch (err) {
    console.error('Admin update user status error:', err);
    res.status(500).json({ message: 'Server error updating user status.' });
  }
});

// PATCH /api/admin/users/:id/role — Change user role
router.patch('/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;

    if (!role || !['patient', 'doctor', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Valid role (patient/doctor/admin) is required.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const previousRole = user.role;
    user.role = role;
    await user.save();

    // Create audit log
    await createAuditLog(
      'USER_ROLE_CHANGED',
      req.user._id,
      req.user.role,
      req.user.name,
      'User',
      user._id,
      { targetUser: user.name, previousRole, newRole: role },
      req.ip
    );

    res.json({
      message: `User role changed to ${role} successfully.`,
      user
    });
  } catch (err) {
    console.error('Admin update user role error:', err);
    res.status(500).json({ message: 'Server error updating user role.' });
  }
});

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent self-deletion
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot delete your own account.' });
    }

    // Create audit log before deletion
    await createAuditLog(
      'USER_DELETED',
      req.user._id,
      req.user.role,
      req.user.name,
      'User',
      user._id,
      { deletedUser: user.name, deletedEmail: user.email, deletedRole: user.role },
      req.ip
    );

    await User.findByIdAndDelete(req.params.id);

    res.json({
      message: 'User deleted successfully.'
    });
  } catch (err) {
    console.error('Admin delete user error:', err);
    res.status(500).json({ message: 'Server error deleting user.' });
  }
});

// GET /api/admin/reports — Aggregated statistics
router.get('/reports', auth, adminOnly, async (req, res) => {
  try {
    // Total counts
    const totalUsers = await User.countDocuments();
    const totalAppointments = await Appointment.countDocuments();
    const completedConsultations = await ConsultationSession.countDocuments({ status: 'completed' });
    const prescriptionsGenerated = await Prescription.countDocuments();

    // Appointments by status
    const appointmentsByStatus = await Appointment.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Appointments by month (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

    const appointmentsByMonth = await Appointment.aggregate([
      { $match: { date: { $gte: twelveMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Users by role
    const usersByRole = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    // Recent activity (last 10 audit logs)
    const recentActivity = await AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(10);

    res.json({
      totalUsers,
      totalAppointments,
      completedConsultations,
      prescriptionsGenerated,
      appointmentsByStatus,
      appointmentsByMonth,
      usersByRole,
      recentActivity
    });
  } catch (err) {
    console.error('Admin reports error:', err);
    res.status(500).json({ message: 'Server error generating reports.' });
  }
});

// GET /api/admin/audit-logs — Filtered and paginated audit logs
router.get('/audit-logs', auth, adminOnly, async (req, res) => {
  try {
    const { action, actor, from, to, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);

    const filter = {};

    if (action) {
      filter.action = action;
    }
    if (actor) {
      if (mongoose.Types.ObjectId.isValid(actor)) {
        filter.actor = actor;
      } else {
        filter.actorName = { $regex: actor, $options: 'i' };
      }
    }
    if (from || to) {
      filter.timestamp = {};
      if (from) filter.timestamp.$gte = new Date(from);
      if (to) filter.timestamp.$lte = new Date(to);
    }

    const total = await AuditLog.countDocuments(filter);
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json({
      logs,
      total,
      pages: Math.ceil(total / limitNum)
    });
  } catch (err) {
    console.error('Admin audit logs error:', err);
    res.status(500).json({ message: 'Server error fetching audit logs.' });
  }
});

module.exports = router;
