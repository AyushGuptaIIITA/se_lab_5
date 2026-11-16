const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AdminDelegation = require('../models/AdminDelegation');

const JWT_SECRET = process.env.JWT_SECRET || 'telemed_default_secure_jwt_secret_2026_fallback_key';

/**
 * Authentication middleware — verifies JWT and sets req.user
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid token. User not found.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ message: 'Account suspended. Contact administrator.' });
    }

    req.user = user;

    // Check for active admin delegation
    if (user.role !== 'admin') {
      const now = new Date();

      // Automatically deactivate any delegations where the due date (endDate) has passed
      await AdminDelegation.updateMany(
        { delegatedTo: user._id, isActive: true, endDate: { $lt: now } },
        { $set: { isActive: false } }
      );

      const delegation = await AdminDelegation.findOne({
        delegatedTo: user._id,
        isActive: true,
        startDate: { $lte: now },
        endDate: { $gte: now }
      });
      req.user.isDelegatedAdmin = !!delegation;
      req.user.delegation = delegation || null;
    } else {
      req.user.isDelegatedAdmin = false;
    }

    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Invalid token.' });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expired.' });
    }
    return res.status(500).json({ message: 'Server error during authentication.' });
  }
};

/**
 * Doctor-only middleware
 */
const doctorOnly = (req, res, next) => {
  if (req.user.role !== 'doctor') {
    return res.status(403).json({ message: 'Access denied. Doctors only.' });
  }
  next();
};

/**
 * Admin-only middleware (also allows delegated admins)
 */
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin' && !req.user.isDelegatedAdmin) {
    return res.status(403).json({ message: 'Access denied. Admins only.' });
  }
  next();
};

/**
 * Strict admin-only middleware (only real admins, not delegates)
 */
const strictAdminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied. This action requires full admin privileges.' });
  }
  next();
};

/**
 * Patient-only middleware
 */
const patientOnly = (req, res, next) => {
  if (req.user.role !== 'patient') {
    return res.status(403).json({ message: 'Access denied. Patients only.' });
  }
  next();
};

module.exports = { auth, doctorOnly, adminOnly, strictAdminOnly, patientOnly };
