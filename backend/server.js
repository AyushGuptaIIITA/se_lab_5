require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const httpServer = http.createServer(app);

// ── Socket.IO setup ────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST', 'PATCH', 'DELETE'] },
  transports: ['websocket', 'polling']
});

// Make io accessible everywhere via app locals
app.set('io', io);

io.on('connection', (socket) => {
  // Client joins its own user-room so we can target it
  socket.on('join:user', (userId) => {
    if (userId) socket.join(`user:${userId}`);
  });

  // Client joins an appointment room (doctor + patient of that appointment)
  socket.on('join:appointment', (appointmentId) => {
    if (appointmentId) {
      socket.join(`appt:${appointmentId}`);
      // Notify other participants that this peer joined the room
      socket.to(`appt:${appointmentId}`).emit('webrtc:peer-joined', { appointmentId });
    }
  });

  // WebRTC 1-on-1 P2P signaling relay (instant, unlimited duration)
  socket.on('webrtc:signal', (payload) => {
    const apptId = payload?.appointmentId;
    if (apptId) {
      socket.to(`appt:${apptId}`).emit('webrtc:signal', payload);
    }
  });

  socket.on('webrtc:ready', (payload) => {
    const apptId = payload?.appointmentId;
    if (apptId) {
      // Broadcast to everyone else in the room that this peer is ready
      socket.to(`appt:${apptId}`).emit('webrtc:peer-ready', payload);
    }
  });

  // Patient or doctor can request a fresh offer from the doctor
  socket.on('webrtc:request-offer', (payload) => {
    const apptId = payload?.appointmentId;
    if (apptId) {
      socket.to(`appt:${apptId}`).emit('webrtc:request-offer', payload);
    }
  });

  socket.on('disconnect', () => {});
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// API Routes
app.use('/api/auth',           require('./routes/auth'));
app.use('/api/doctors',        require('./routes/doctors'));
app.use('/api/appointments',   require('./routes/appointments'));
app.use('/api/consultation',   require('./routes/consultation'));
app.use('/api/prescriptions',  require('./routes/prescriptions'));
app.use('/api/medical-records',require('./routes/medicalRecords'));
app.use('/api/admin',          require('./routes/admin'));
app.use('/api/leaves',         require('./routes/leaves'));
app.use('/api/notifications',  require('./routes/notifications'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Serve frontend static files in production
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error.' });
});

// MongoDB connection and server start
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/telemedicine';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
      console.log(`⚡ Socket.IO real-time enabled`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

module.exports = { app, io };
