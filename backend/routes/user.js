const express = require('express');
const { auth, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// 1. Dashboard data for User and Admin
router.get('/dashboard', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    let stats = null;
    if (user.role === 'admin') {
      const totalUsers = await User.countDocuments();
      const adminCount = await User.countDocuments({ role: 'admin' });
      const standardUserCount = await User.countDocuments({ role: 'user' });
      stats = {
        totalUsers,
        adminCount,
        standardUserCount,
      };
    }

    res.json({
      message: `Welcome to the ${user.role.toUpperCase()} portal`,
      user,
      stats,
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Failed to load dashboard data.' });
  }
});

// 2. Edit Profile for both User and Admin
router.put('/profile/edit', auth, async (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ message: 'Username and email are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if new email is taken by another user
    const existing = await User.findOne({ email: normalizedEmail, _id: { $ne: req.user.id } });
    if (existing) {
      return res.status(409).json({ message: 'This email is already in use by another account.' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { username: username.trim(), email: normalizedEmail },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Profile updated successfully!',
      user: updatedUser,
    });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: error.message || 'Error updating profile.' });
  }
});

// 3. Change password while authenticated
router.put('/change-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current password and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password.' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password changed successfully!' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Failed to update password.' });
  }
});

// 4. Admin Only: Get all users list
router.get('/admin/users', auth, adminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    console.error('Admin fetch users error:', error);
    res.status(500).json({ message: 'Failed to fetch user list.' });
  }
});

// 5. Admin Only: Update a user's role
router.patch('/admin/users/:id/role', auth, adminOnly, async (req, res) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role specified.' });
    }

    const targetUser = await User.findById(req.params.id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Prevent demoting self
    if (targetUser._id.toString() === req.user.id && role !== 'admin') {
      return res.status(400).json({ message: 'You cannot revoke your own admin rights.' });
    }

    targetUser.role = role;
    await targetUser.save();

    res.json({ message: `Role updated to ${role} successfully.`, user: targetUser });
  } catch (error) {
    console.error('Role update error:', error);
    res.status(500).json({ message: 'Failed to update user role.' });
  }
});

// 6. Admin Only: Delete a user
router.delete('/admin/users/:id', auth, adminOnly, async (req, res) => {
  try {
    if (req.params.id === req.user.id) {
      return res.status(400).json({ message: 'You cannot delete your own account from the admin panel.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    res.json({ message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user.' });
  }
});

module.exports = router;
