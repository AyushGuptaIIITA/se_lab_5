const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');

const app = express();

// Middleware
app.use(cors({
  origin: '*', // Allow connections from Render / local frontend
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Database Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/selab5';
mongoose
  .connect(MONGO_URI)
  .then(() => console.log(' MongoDB connected successfully!'))
  .catch((err) => {
    console.error(' MongoDB connection failed:', err.message);
    console.log(' Note: Make sure MongoDB is running locally or set MONGO_URI in .env');
  });

// Health check endpoint (vital for Render zero-downtime health probes)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);

// Serve Frontend in Production if built
const frontendDist = path.join(__dirname, '../frontend/dist');
const frontendBuild = path.join(__dirname, '../frontend/build');

const fs = require('fs');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else if (fs.existsSync(frontendBuild)) {
  app.use(express.static(frontendBuild));
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendBuild, 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('<h3>SE Lab 5 Backend API is running! Access frontend via client port (5173 / 3000) or build frontend for unified serving.</h3>');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(` Server active on port ${PORT}`);
  console.log(` Health check available at: http://localhost:${PORT}/api/health`);
});
