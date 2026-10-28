const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const availableSlotSchema = new mongoose.Schema({
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday', 'Specific Date'],
    default: 'Monday'
  },
  date: { type: String }, // YYYY-MM-DD for specific calendar date slots
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  isActive: { type: Boolean, default: true }
}, { _id: true });

const addressSchema = new mongoose.Schema({
  village: String,
  district: String,
  state: String,
  pincode: String
}, { _id: false });

const emergencyContactSchema = new mongoose.Schema({
  name: String,
  phone: String,
  relation: String
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  phone: { type: String, trim: true },
  role: { type: String, enum: ['patient', 'doctor', 'admin'], required: true },

  // Doctor-specific fields
  specialization: { type: String, trim: true },
  licenseNumber: { type: String, trim: true },
  bio: { type: String },
  consultationFee: { type: Number },
  availableSlots: [availableSlotSchema],

  // Patient-specific fields
  dateOfBirth: { type: Date },
  gender: { type: String, enum: ['male', 'female', 'other'] },
  bloodGroup: { type: String },
  address: addressSchema,
  emergencyContact: emergencyContactSchema,

  // Common
  profileImage: { type: String },
  status: { type: String, enum: ['active', 'suspended'], default: 'active' },
  lastLogin: { type: Date }
}, { timestamps: true });

// Pre-save hook for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Instance method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
