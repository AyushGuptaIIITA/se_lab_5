const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  actorRole: { type: String },
  actorName: { type: String },
  targetType: { type: String },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  details: { type: mongoose.Schema.Types.Mixed },
  ipAddress: { type: String },
  timestamp: { type: Date, default: Date.now, index: true }
});

// Make this collection immutable — no update or delete operations
auditLogSchema.statics.updateOne = undefined;
auditLogSchema.statics.updateMany = undefined;
auditLogSchema.statics.findOneAndUpdate = undefined;
auditLogSchema.statics.findOneAndDelete = undefined;
auditLogSchema.statics.findOneAndRemove = undefined;
auditLogSchema.statics.deleteOne = undefined;
auditLogSchema.statics.deleteMany = undefined;

module.exports = mongoose.model('AuditLog', auditLogSchema);
