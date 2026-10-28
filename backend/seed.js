require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const Appointment = require('./models/Appointment');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telemedicine';

async function seed() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ MongoDB connected for seeding');

    // Clear existing data
    await User.deleteMany({});
    await Appointment.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create patients
    const patient1 = await User.create({
      name: 'Rahul Kumar',
      email: 'patient1@demo.com',
      password: 'password123',
      phone: '+91-9876543210',
      role: 'patient',
      dateOfBirth: new Date('1995-05-15'),
      gender: 'male',
      bloodGroup: 'B+',
      address: {
        village: 'Rampur',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        pincode: '221001'
      },
      emergencyContact: {
        name: 'Sunita Kumar',
        phone: '+91-9876543211',
        relation: 'Mother'
      },
      status: 'active'
    });

    const patient2 = await User.create({
      name: 'Priya Singh',
      email: 'patient2@demo.com',
      password: 'password123',
      phone: '+91-9876543212',
      role: 'patient',
      dateOfBirth: new Date('1990-08-22'),
      gender: 'female',
      bloodGroup: 'A+',
      address: {
        village: 'Chandpur',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        pincode: '226001'
      },
      emergencyContact: {
        name: 'Amit Singh',
        phone: '+91-9876543213',
        relation: 'Husband'
      },
      status: 'active'
    });

    console.log('👤 Created 2 patients');

    // Create doctors
    const drSharma = await User.create({
      name: 'Dr. Anita Sharma',
      email: 'dr.sharma@demo.com',
      password: 'password123',
      phone: '+91-9876543220',
      role: 'doctor',
      specialization: 'General Medicine',
      licenseNumber: 'MCI-2015-GM-001',
      bio: 'Experienced general physician with 10+ years of practice in rural healthcare. Specializes in preventive medicine and chronic disease management.',
      consultationFee: 300,
      availableSlots: [
        { day: 'Monday', startTime: '09:00', endTime: '09:30', isActive: true },
        { day: 'Monday', startTime: '09:30', endTime: '10:00', isActive: true },
        { day: 'Monday', startTime: '10:00', endTime: '10:30', isActive: true },
        { day: 'Monday', startTime: '10:30', endTime: '11:00', isActive: true },
        { day: 'Wednesday', startTime: '09:00', endTime: '09:30', isActive: true },
        { day: 'Wednesday', startTime: '09:30', endTime: '10:00', isActive: true },
        { day: 'Wednesday', startTime: '10:00', endTime: '10:30', isActive: true },
        { day: 'Friday', startTime: '14:00', endTime: '14:30', isActive: true },
        { day: 'Friday', startTime: '14:30', endTime: '15:00', isActive: true },
        { day: 'Friday', startTime: '15:00', endTime: '15:30', isActive: true }
      ],
      status: 'active'
    });

    const drPatel = await User.create({
      name: 'Dr. Rajesh Patel',
      email: 'dr.patel@demo.com',
      password: 'password123',
      phone: '+91-9876543221',
      role: 'doctor',
      specialization: 'Pediatrics',
      licenseNumber: 'MCI-2012-PD-002',
      bio: 'Pediatric specialist dedicated to child healthcare in underserved communities. Expert in neonatal care and childhood immunization programs.',
      consultationFee: 400,
      availableSlots: [
        { day: 'Tuesday', startTime: '10:00', endTime: '10:30', isActive: true },
        { day: 'Tuesday', startTime: '10:30', endTime: '11:00', isActive: true },
        { day: 'Tuesday', startTime: '11:00', endTime: '11:30', isActive: true },
        { day: 'Thursday', startTime: '09:00', endTime: '09:30', isActive: true },
        { day: 'Thursday', startTime: '09:30', endTime: '10:00', isActive: true },
        { day: 'Thursday', startTime: '10:00', endTime: '10:30', isActive: true },
        { day: 'Saturday', startTime: '10:00', endTime: '10:30', isActive: true },
        { day: 'Saturday', startTime: '10:30', endTime: '11:00', isActive: true }
      ],
      status: 'active'
    });

    const drGupta = await User.create({
      name: 'Dr. Meera Gupta',
      email: 'dr.gupta@demo.com',
      password: 'password123',
      phone: '+91-9876543222',
      role: 'doctor',
      specialization: 'Cardiology',
      licenseNumber: 'MCI-2010-CD-003',
      bio: 'Senior cardiologist with expertise in telemedicine-based cardiac monitoring. Pioneer in remote ECG analysis and heart failure management.',
      consultationFee: 500,
      availableSlots: [
        { day: 'Monday', startTime: '14:00', endTime: '14:30', isActive: true },
        { day: 'Monday', startTime: '14:30', endTime: '15:00', isActive: true },
        { day: 'Wednesday', startTime: '14:00', endTime: '14:30', isActive: true },
        { day: 'Wednesday', startTime: '14:30', endTime: '15:00', isActive: true },
        { day: 'Wednesday', startTime: '15:00', endTime: '15:30', isActive: true },
        { day: 'Friday', startTime: '09:00', endTime: '09:30', isActive: true },
        { day: 'Friday', startTime: '09:30', endTime: '10:00', isActive: true }
      ],
      status: 'active'
    });

    console.log('🩺 Created 3 doctors');

    // Create admin
    const admin = await User.create({
      name: 'System Admin',
      email: 'admin@demo.com',
      password: 'password123',
      phone: '+91-9876543230',
      role: 'admin',
      status: 'active'
    });

    console.log('🔑 Created 1 admin');

    // Create sample appointments
    const today = new Date();

    // Past appointment (completed)
    const pastDate = new Date(today);
    pastDate.setDate(pastDate.getDate() - 7);

    const apt1 = await Appointment.create({
      patient: patient1._id,
      doctor: drSharma._id,
      date: pastDate,
      timeSlot: { start: '09:00', end: '09:30' },
      status: 'completed',
      type: 'general',
      symptoms: 'Persistent fever and headache for 3 days',
      notes: 'Patient reported improvement after medication'
    });

    // Past appointment (completed)
    const pastDate2 = new Date(today);
    pastDate2.setDate(pastDate2.getDate() - 14);

    const apt2 = await Appointment.create({
      patient: patient2._id,
      doctor: drPatel._id,
      date: pastDate2,
      timeSlot: { start: '10:00', end: '10:30' },
      status: 'completed',
      type: 'general',
      symptoms: 'Child has recurring cough and cold'
    });

    // Upcoming appointment (confirmed)
    const futureDate1 = new Date(today);
    futureDate1.setDate(futureDate1.getDate() + 3);

    const apt3 = await Appointment.create({
      patient: patient1._id,
      doctor: drGupta._id,
      date: futureDate1,
      timeSlot: { start: '14:00', end: '14:30' },
      status: 'confirmed',
      type: 'general',
      symptoms: 'Chest pain during physical activity'
    });

    // Upcoming appointment (pending)
    const futureDate2 = new Date(today);
    futureDate2.setDate(futureDate2.getDate() + 5);

    const apt4 = await Appointment.create({
      patient: patient2._id,
      doctor: drSharma._id,
      date: futureDate2,
      timeSlot: { start: '09:30', end: '10:00' },
      status: 'pending',
      type: 'follow-up',
      symptoms: 'Follow-up for previous consultation'
    });

    // Cancelled appointment
    const pastDate3 = new Date(today);
    pastDate3.setDate(pastDate3.getDate() - 2);

    const apt5 = await Appointment.create({
      patient: patient1._id,
      doctor: drPatel._id,
      date: pastDate3,
      timeSlot: { start: '10:30', end: '11:00' },
      status: 'cancelled',
      type: 'general',
      symptoms: 'General checkup',
      cancelReason: 'Patient unable to make the appointment'
    });

    console.log('📅 Created 5 sample appointments');

    console.log('\n========================================');
    console.log('   🌟 SEED DATA CREATED SUCCESSFULLY 🌟');
    console.log('========================================');
    console.log('\n📋 Demo Credentials:\n');
    console.log('  Patients:');
    console.log('    📧 patient1@demo.com / password123');
    console.log('    📧 patient2@demo.com / password123');
    console.log('\n  Doctors:');
    console.log('    📧 dr.sharma@demo.com / password123 (General Medicine)');
    console.log('    📧 dr.patel@demo.com / password123 (Pediatrics)');
    console.log('    📧 dr.gupta@demo.com / password123 (Cardiology)');
    console.log('\n  Admin:');
    console.log('    📧 admin@demo.com / password123');
    console.log('\n========================================\n');

    await mongoose.disconnect();
    console.log('✅ MongoDB disconnected. Seeding complete!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
}

seed();
