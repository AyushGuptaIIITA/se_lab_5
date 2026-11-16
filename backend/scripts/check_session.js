require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../models/User');
const ConsultationSession = require('../models/ConsultationSession');

mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telemedicine').then(async () => {
  const session = await ConsultationSession.findById('6afb3bb148bf9e3830b5e1d0').lean();
  console.log('Session for Anita+Rahul Nov16:', JSON.stringify(session, null, 2));
  mongoose.disconnect();
});
