const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const ConsultationSession = require('../models/ConsultationSession');
const AuditLog = require('../models/AuditLog');
const AdminDelegation = require('../models/AdminDelegation');
const { auth, adminOnly, strictAdminOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');
const emit = require('../utils/emit');

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

// PATCH /api/admin/users/:id/status — Activate/suspend/approve user
router.patch('/users/:id/status', auth, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    if (!status || !['active', 'suspended', 'pending'].includes(status)) {
      return res.status(400).json({ message: 'Valid status (active/suspended/pending) is required.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent self-suspension
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: 'Cannot change your own status.' });
    }

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    // Create audit log
    const eventType = status === 'active' 
      ? (oldStatus === 'pending' ? 'USER_APPROVED' : 'USER_ACTIVATED')
      : (status === 'suspended' ? 'USER_SUSPENDED' : 'USER_STATUS_UPDATED');

    await createAuditLog(
      eventType,
      req.user._id,
      req.user.role,
      req.user.name,
      'User',
      user._id,
      { targetUser: user.name, targetEmail: user.email, oldStatus, newStatus: status },
      req.ip
    );

    res.json({
      message: `User account has been marked as ${status}.`,
      user
    });
  } catch (err) {
    console.error('Admin update user status error:', err);
    res.status(500).json({ message: 'Server error updating user status.' });
  }
});

// PATCH /api/admin/users/:id/approve — Directly approve pending user
router.patch('/users/:id/approve', auth, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    user.status = 'active';
    await user.save();

    await createAuditLog(
      'USER_APPROVED',
      req.user._id,
      req.user.role,
      req.user.name,
      'User',
      user._id,
      { targetUser: user.name, targetEmail: user.email, role: user.role },
      req.ip
    );

    res.json({
      message: `User ${user.name} (${user.role}) approved successfully. They can now log in.`,
      user
    });
  } catch (err) {
    console.error('Admin approve user error:', err);
    res.status(500).json({ message: 'Server error approving user.' });
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

// ─── ADMIN DELEGATION ROUTES ───────────────────────────────────────────────

// POST /api/admin/delegate — Strict admin grants temporary admin rights to another user
router.post('/delegate', auth, strictAdminOnly, async (req, res) => {
  try {
    const { userId, reason, startDate, endDate } = req.body;

    if (!userId || !reason || !startDate || !endDate) {
      return res.status(400).json({ message: 'userId, reason, startDate, and endDate are required.' });
    }

    const targetUser = await User.findById(userId).select('-password');
    if (!targetUser) return res.status(404).json({ message: 'User not found.' });

    if (targetUser.role !== 'doctor') {
      return res.status(400).json({ message: 'Administrative responsibility can only be delegated to registered doctors.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start) || isNaN(end) || end <= start) {
      return res.status(400).json({ message: 'Invalid date range.' });
    }

    // Deactivate any existing active delegation for this user
    await AdminDelegation.updateMany(
      { delegatedTo: userId, isActive: true },
      { isActive: false, revokedAt: new Date(), revokedBy: req.user._id }
    );

    const delegation = new AdminDelegation({
      delegatedTo: userId,
      delegatedBy: req.user._id,
      reason,
      startDate: start,
      endDate: end,
      isActive: true
    });

    await delegation.save();

    await createAuditLog(
      'ADMIN_ROLE_DELEGATED',
      req.user._id,
      req.user.role,
      req.user.name,
      'AdminDelegation',
      delegation._id,
      { delegatedTo: targetUser.name, reason, startDate, endDate },
      req.ip
    );

    try {
      emit(req, 'delegation:changed', {
        delegatedTo: targetUser._id.toString(),
        action: 'granted',
        endDate: end
      });
    } catch {}

    res.status(201).json({
      message: `Admin access delegated to ${targetUser.name} until ${end.toLocaleDateString()}.`,
      delegation
    });
  } catch (err) {
    console.error('Delegate admin error:', err);
    res.status(500).json({ message: 'Server error creating delegation.' });
  }
});

// GET /api/admin/delegates — List all active/past delegations
router.get('/delegates', auth, adminOnly, async (req, res) => {
  try {
    const now = new Date();
    const delegations = await AdminDelegation.find()
      .populate('delegatedTo', 'name email role')
      .populate('delegatedBy', 'name email')
      .populate('revokedBy', 'name email')
      .sort({ createdAt: -1 });

    // Auto-expire passed delegations in DB
    const expiredIds = delegations
      .filter(d => d.isActive && d.endDate < now)
      .map(d => d._id);

    if (expiredIds.length > 0) {
      await AdminDelegation.updateMany(
        { _id: { $in: expiredIds } },
        { isActive: false }
      );
    }

    // Re-fetch with updated status
    const updated = await AdminDelegation.find()
      .populate('delegatedTo', 'name email role')
      .populate('delegatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ delegations: updated });
  } catch (err) {
    console.error('Get delegations error:', err);
    res.status(500).json({ message: 'Server error fetching delegations.' });
  }
});

// DELETE /api/admin/delegate/:id — Revoke a delegation (strict admin only)
router.delete('/delegate/:id', auth, strictAdminOnly, async (req, res) => {
  try {
    const delegation = await AdminDelegation.findById(req.params.id)
      .populate('delegatedTo', 'name email');

    if (!delegation) return res.status(404).json({ message: 'Delegation not found.' });
    if (!delegation.isActive) return res.status(400).json({ message: 'Delegation is already inactive.' });

    delegation.isActive = false;
    delegation.revokedAt = new Date();
    delegation.revokedBy = req.user._id;
    await delegation.save();

    await createAuditLog(
      'ADMIN_ROLE_REVOKED',
      req.user._id,
      req.user.role,
      req.user.name,
      'AdminDelegation',
      delegation._id,
      { revokedFrom: delegation.delegatedTo?.name },
      req.ip
    );

    try {
      emit(req, 'delegation:changed', {
        delegatedTo: (delegation.delegatedTo?._id || delegation.delegatedTo)?.toString(),
        action: 'revoked'
      });
    } catch {}

    res.json({ message: `Admin delegation revoked from ${delegation.delegatedTo?.name}.`, delegation });
  } catch (err) {
    console.error('Revoke delegation error:', err);
    res.status(500).json({ message: 'Server error revoking delegation.' });
  }
});

module.exports = router;
