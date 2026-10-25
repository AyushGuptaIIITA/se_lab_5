const jwt = require('jsonwebtoken');

// Verify Bearer JWT Token
const auth = (req, res, next) => {
  const authHeader = req.header('Authorization');
  if (!authHeader) {
    return res.status(401).json({ message: 'Access denied. No authorization token provided.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : authHeader;

  if (!token) {
    return res.status(401).json({ message: 'Access denied. Invalid token format.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'selab5_default_jwt_secret_key_2026');
    req.user = decoded;
    next();
  } catch (ex) {
    return res.status(401).json({ message: 'Session expired or token invalid. Please log in again.' });
  }
};

// Check if authenticated user is admin
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access forbidden: Admin privileges required.' });
  }
  next();
};

module.exports = { auth, adminOnly };
