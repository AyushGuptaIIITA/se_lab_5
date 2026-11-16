require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const ConsultationSession = require('../models/ConsultationSession');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telemedicine').then(async () => {
  const appts = await Appointment.find({ status: { $in: ['pending', 'confirmed', 'in-progress'] } })
    .populate('doctor', 'name')
    .populate('patient', 'name')
    .select('status date doctor patient consultationSession')
    .lean();
  console.log('Active appointments:', JSON.stringify(appts.slice(0, 10), null, 2));
  
  const sessions = await ConsultationSession.find({}).lean();
  console.log('Existing sessions:', JSON.stringify(sessions.slice(0, 5), null, 2));
  
  mongoose.disconnect();
});
