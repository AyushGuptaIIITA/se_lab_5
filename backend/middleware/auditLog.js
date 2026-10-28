const AuditLog = require('../models/AuditLog');

/**
 * Creates an immutable audit log entry.
 * @param {string} action - e.g. 'USER_LOGIN', 'APPOINTMENT_BOOKED'
 * @param {string|ObjectId} actor - User ID of the actor
 * @param {string} actorRole - Role of the actor
 * @param {string} actorName - Name of the actor
 * @param {string} targetType - e.g. 'User', 'Appointment', 'Prescription'
 * @param {string|ObjectId} targetId - ID of the target document
 * @param {object} details - Free-form JSON details
 * @param {string} ipAddress - IP address of the request
 */
async function createAuditLog(action, actor, actorRole, actorName, targetType, targetId, details, ipAddress) {
  try {
    const log = new AuditLog({
      action,
      actor,
      actorRole,
      actorName,
      targetType,
      targetId,
      details,
      ipAddress,
      timestamp: new Date()
    });
    await log.save();
    return log;
  } catch (err) {
    console.error('Failed to create audit log:', err.message);
  }
}

module.exports = createAuditLog;
