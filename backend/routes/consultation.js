const express = require('express');
const mongoose = require('mongoose');
const ConsultationSession = require('../models/ConsultationSession');
const Appointment = require('../models/Appointment');
const { auth, doctorOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');

const router = express.Router();

// POST /api/consultation/start — Start or join a consultation session (doctor or patient)
router.post('/start', auth, async (req, res) => {
  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({ message: 'appointmentId is required.' });
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('patient', 'name email')
      .populate('doctor', 'name email');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const userId = req.user._id.toString();
    const isDoctor = appointment.doctor._id.toString() === userId;
    const isPatient = appointment.patient._id.toString() === userId;

    if (!isDoctor && !isPatient && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You are not a participant in this appointment.' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ 
        message: 'This consultation has already been completed and concluded. Rejoining is not permitted.',
        isCompleted: true
      });
    }

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'This appointment was cancelled. Cannot enter consultation room.',
        isCancelled: true
      });
    }

    // Check if a session already exists for this appointment
    let session = await ConsultationSession.findOne({ appointment: appointmentId });
    if (session) {
      if (session.status === 'completed') {
        return res.status(400).json({
          message: 'This consultation session has ended. Rejoining completed meetings is not allowed.',
          isCompleted: true,
          session
        });
      }

      // Session is in-progress: allow seamless rejoin and log network event
      session.networkEvents.push({
        event: 'reconnected',
        timestamp: new Date(),
        details: `${req.user.role === 'doctor' ? 'Doctor' : 'Patient'} ${req.user.name} rejoined consultation call`
      });
      await session.save();

      return res.json({
        message: 'Reconnected to active consultation session.',
        session
      });
    }

    // Create session
    session = new ConsultationSession({
      appointment: appointmentId,
      patient: appointment.patient._id,
      doctor: appointment.doctor._id,
      status: 'in-progress',
      startedAt: new Date(),
      networkEvents: [{
        event: 'connected',
        timestamp: new Date(),
        details: `${req.user.role === 'doctor' ? 'Doctor' : 'Patient'} ${req.user.name} joined session`
      }]
    });

    await session.save();

    // Update appointment status to in-progress if confirmed or pending
    if (['pending', 'confirmed'].includes(appointment.status)) {
      appointment.status = 'in-progress';
      appointment.consultationSession = session._id;
      await appointment.save();
    }

    // Create audit log
    await createAuditLog(
      'CONSULTATION_STARTED',
      req.user._id,
      req.user.role,
      req.user.name,
      'ConsultationSession',
      session._id,
      { appointmentId, participant: req.user.name, role: req.user.role },
      req.ip
    );

    res.status(201).json({
      message: 'Consultation session started.',
      session
    });
  } catch (err) {
    console.error('Start consultation error:', err);
    res.status(500).json({ message: 'Server error starting consultation.' });
  }
});

// GET /api/consultation/appointment/:appointmentId — Get active session for an appointment
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  try {
    const session = await ConsultationSession.findOne({
      appointment: req.params.appointmentId
    })
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization');

    if (!session) {
      return res.json({ session: null });
    }

    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      session.doctor._id.toString() !== userId &&
      session.patient._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ session });
  } catch (err) {
    console.error('Get session by appointment error:', err);
    res.status(500).json({ message: 'Server error fetching session.' });
  }
});

// POST /api/consultation/:sessionId/end — End a consultation session (doctor only)
router.post('/:sessionId/end', auth, doctorOnly, async (req, res) => {
  try {
    const { consultationNotes, duration } = req.body;

    const session = await ConsultationSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Consultation session not found.' });
    }

    if (session.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    session.endedAt = new Date();
    session.status = 'completed';
    session.consultationNotes = consultationNotes || '';

    // Calculate duration
    if (duration) {
      session.duration = duration;
    } else if (session.startedAt) {
      session.duration = Math.round((session.endedAt - session.startedAt) / 60000);
    }

    // Add disconnected network event
    session.networkEvents.push({
      event: 'disconnected',
      timestamp: new Date(),
      details: 'Consultation session ended'
    });

    await session.save();

    // Update appointment status to completed
    await Appointment.findByIdAndUpdate(session.appointment, { status: 'completed' });

    // Create audit log
    await createAuditLog(
      'CONSULTATION_ENDED',
      req.user._id,
      req.user.role,
      req.user.name,
      'ConsultationSession',
      session._id,
      { duration: session.duration, hasNotes: !!consultationNotes },
      req.ip
    );

    res.json({
      message: 'Consultation session ended.',
      session
    });
  } catch (err) {
    console.error('End consultation error:', err);
    res.status(500).json({ message: 'Server error ending consultation.' });
  }
});

// POST /api/consultation/:sessionId/network-event — Log a network event
router.post('/:sessionId/network-event', auth, async (req, res) => {
  try {
    const { event, details } = req.body;

    if (!event) {
      return res.status(400).json({ message: 'Event type is required.' });
    }

    const session = await ConsultationSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Consultation session not found.' });
    }

    // Check authorization
    const userId = req.user._id.toString();
    if (session.doctor.toString() !== userId && session.patient.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    session.networkEvents.push({
      event,
      timestamp: new Date(),
      details: details || ''
    });

    await session.save();

    res.json({
      message: 'Network event logged.',
      session
    });
  } catch (err) {
    console.error('Network event error:', err);
    res.status(500).json({ message: 'Server error logging network event.' });
  }
});

// POST /api/consultation/:sessionId/message — Send in-consultation chat message
router.post('/:sessionId/message', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text is required.' });
    }

    const session = await ConsultationSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Consultation session not found.' });
    }

    const userId = req.user._id.toString();
    if (session.doctor.toString() !== userId && session.patient.toString() !== userId) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const newMessage = {
      senderId: req.user._id,
      senderName: req.user.name,
      senderRole: req.user.role,
      text: text.trim(),
      timestamp: new Date()
    };

    session.messages.push(newMessage);
    await session.save();

    res.json({
      message: 'Message sent.',
      chatMessage: newMessage,
      messages: session.messages
    });
  } catch (err) {
    console.error('Send message error:', err);
    res.status(500).json({ message: 'Server error sending message.' });
  }
});

// GET /api/consultation/:sessionId — Get session details
router.get('/:sessionId', auth, async (req, res) => {
  try {
    const session = await ConsultationSession.findById(req.params.sessionId)
      .populate('patient', 'name email phone gender dateOfBirth bloodGroup address')
      .populate('doctor', 'name email specialization')
      .populate('appointment');

    if (!session) {
      return res.status(404).json({ message: 'Consultation session not found.' });
    }

    // Check authorization
    const userId = req.user._id.toString();
    if (
      req.user.role !== 'admin' &&
      session.doctor._id.toString() !== userId &&
      session.patient._id.toString() !== userId
    ) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    res.json({ session });
  } catch (err) {
    console.error('Get consultation session error:', err);
    res.status(500).json({ message: 'Server error fetching consultation session.' });
  }
});

// POST /api/consultation/:sessionId/signal — WebRTC Peer Signaling (Offer, Answer, ICE Candidate)
router.post('/:sessionId/signal', auth, async (req, res) => {
  try {
    const { type, data } = req.body;
    if (!type) {
      return res.status(400).json({ message: 'Signal type is required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.sessionId)) {
      return res.status(404).json({ message: 'Invalid or non-existent session ID.' });
    }

    const session = await ConsultationSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const userId = req.user._id.toString();
    const isDoc = session.doctor.toString() === userId || req.user.role === 'doctor';
    const isPat = session.patient.toString() === userId || req.user.role === 'patient';

    if (!isDoc && !isPat && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied.' });
    }

    const senderRole = req.user.role === 'doctor' ? 'doctor' : 'patient';

    if (!session.signals) {
      session.signals = [];
    }

    // When a fresh offer or restart is sent, purge outdated offers/answers to prevent stale state machine errors
    if (type === 'offer' || type === 'restart') {
      session.signals = session.signals.filter(s => {
        const ageSec = (Date.now() - new Date(s.timestamp).getTime()) / 1000;
        return ageSec < 15 && s.type === 'candidate'; // Keep only very recent candidates
      });
    }

    // Keep signals array bounded
    if (session.signals.length > 60) {
      session.signals = session.signals.slice(-30);
    }

    session.signals.push({
      senderRole,
      senderId: req.user._id,
      type,
      data: data || {},
      timestamp: new Date()
    });

    await session.save();

    res.json({ success: true, message: 'Signal dispatched successfully.' });
  } catch (err) {
    console.error('WebRTC signal post error:', err);
    res.status(500).json({ message: 'Server error posting WebRTC signal.' });
  }
});

// GET /api/consultation/:sessionId/signals — WebRTC Peer Signals Polling
router.get('/:sessionId/signals', auth, async (req, res) => {
  try {
    const { since } = req.query;

    if (!mongoose.Types.ObjectId.isValid(req.params.sessionId)) {
      return res.status(404).json({ message: 'Invalid or non-existent session ID.' });
    }

    const session = await ConsultationSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Session not found.' });
    }

    const myRole = req.user.role === 'doctor' ? 'doctor' : 'patient';

    // Retrieve signals originating strictly from the OTHER participant
    let signals = (session.signals || []).filter(s => s.senderRole !== myRole);

    if (since) {
      const sinceDate = new Date(since);
      signals = signals.filter(s => new Date(s.timestamp) > sinceDate);
    }

    res.json({ 
      signals, 
      serverTime: new Date().toISOString() 
    });
  } catch (err) {
    console.error('WebRTC signals get error:', err);
    res.status(500).json({ message: 'Server error retrieving WebRTC signals.' });
  }
});

module.exports = router;
