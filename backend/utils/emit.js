/**
 * emit.js — Helper to broadcast Socket.IO events from any route.
 * Usage: const emit = require('../utils/emit');
 *        emit(req, 'appointment:updated', { appointmentId, ... });
 *        emitToUser(req, userId, 'notification:new', { ... });
 *
 * Emits to:
 *  - broadcast (all connected clients): for global dashboards
 *  - user:<doctorId>  : targeted emit to doctor
 *  - user:<patientId> : targeted emit to patient
 *  - appt:<appointmentId>: targeted emit to appointment room
 */
function emit(req, event, payload) {
  try {
    const io = req.app.get('io');
    if (!io) return;
    io.emit(event, payload);                             // global
    if (payload?.doctorId)  io.to(`user:${payload.doctorId}`).emit(event, payload);
    if (payload?.patientId) io.to(`user:${payload.patientId}`).emit(event, payload);
    if (payload?.appointmentId) io.to(`appt:${payload.appointmentId}`).emit(event, payload);
  } catch (e) {
    // Never let socket errors crash the HTTP response
    console.warn('Socket emit error:', e.message);
  }
}

/**
 * Emit event to a specific user's personal room
 * @param {Object} req - Express request object
 * @param {string} userId - Target user ID
 * @param {string} event - Event name
 * @param {Object} payload - Event payload
 */
function emitToUser(req, userId, event, payload) {
  try {
    const io = req.app.get('io');
    if (!io || !userId) return;
    io.to(`user:${userId}`).emit(event, payload);
  } catch (e) {
    console.warn('Socket emitToUser error:', e.message);
  }
}

module.exports = { emit, emitToUser };
