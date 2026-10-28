const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');
const crypto = require('crypto');

const router = express.Router();

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const {
      name, email, password, phone, role,
      specialization, licenseNumber, bio, consultationFee, availableSlots,
      dateOfBirth, gender, bloodGroup, address, emergencyContact
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    // Build user object
    const userData = { name, email, password, phone, role };

    // Doctor-specific fields
    if (role === 'doctor') {
      if (specialization) userData.specialization = specialization;
      if (licenseNumber) userData.licenseNumber = licenseNumber;
      if (bio) userData.bio = bio;
      if (consultationFee) userData.consultationFee = consultationFee;
      if (availableSlots) userData.availableSlots = availableSlots;
    }

    // Patient-specific fields
    if (role === 'patient') {
      if (dateOfBirth) userData.dateOfBirth = dateOfBirth;
      if (gender) userData.gender = gender;
      if (bloodGroup) userData.bloodGroup = bloodGroup;
      if (address) userData.address = address;
      if (emergencyContact) userData.emergencyContact = emergencyContact;
    }

    const user = new User(userData);
    await user.save();

    // Create audit log
    await createAuditLog(
      'USER_REGISTERED',
      user._id,
      user.role,
      user.name,
      'User',
      user._id,
      { email: user.email, role: user.role },
      req.ip
    );

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userObj = user.toObject();
    delete userObj.password;

    res.status(201).json({
      message: 'Registration successful.',
      token,
      user: userObj
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ message: 'Server error during registration.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Contact administrator.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Update lastLogin
    user.lastLogin = new Date();
    await user.save();

    // Create audit log
    await createAuditLog(
      'USER_LOGIN',
      user._id,
      user.role,
      user.name,
      'User',
      user._id,
      { email: user.email },
      req.ip
    );

    // Generate token
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    const userObj = user.toObject();
    delete userObj.password;

    res.json({
      message: 'Login successful.',
      token,
      user: userObj
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error during login.' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If an account with that email exists, a reset token has been generated.', resetToken: null });
    }

    // Generate a reset token (simulated — in production this would be sent via email)
    const resetToken = crypto.randomBytes(32).toString('hex');

    res.json({
      message: 'If an account with that email exists, a reset token has been generated.',
      resetToken
    });
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ message: 'Token and new password are required.' });
    }

    // Simulated token validation — in production you'd validate the token against stored hash
    // For demo, we just confirm success
    res.json({ message: 'Password has been reset successfully.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    res.json({ user });
  } catch (err) {
    console.error('Get me error:', err);
    res.status(500).json({ message: 'Server error.' });
  }
});

module.exports = router;
