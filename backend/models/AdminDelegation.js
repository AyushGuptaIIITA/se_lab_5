const mongoose = require('mongoose');

const adminDelegationSchema = new mongoose.Schema({
  delegatedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  delegatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  revokedAt: {
    type: Date
  },
  revokedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, { timestamps: true });

// Auto-deactivate when endDate passes
adminDelegationSchema.virtual('isExpired').get(function () {
  return this.endDate < new Date();
});

module.exports = mongoose.model('AdminDelegation', adminDelegationSchema);
