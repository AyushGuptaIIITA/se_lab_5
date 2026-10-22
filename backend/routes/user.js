const express = require('express');
const auth = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Home Page Display[cite: 1]
router.get('/dashboard', auth, async (req, res) => {
  const user = await User.findById(req.user.id).select('-password');
  res.json({ message: `Welcome to the ${req.user.role} dashboard`, user });
});

// Edit Profile for both User and Admin[cite: 1]
router.put('/profile/edit', auth, async (req, res) => {
  try {
    const { username, email } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { username, email },
      { new: true, runValidators: true }
    ).select('-password');
    res.json({ message: "Profile updated", user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;