const express = require('express');
const mongoose = require('mongoose');
const ConsultationSession = require('../models/ConsultationSession');
const Appointment = require('../models/Appointment');
const { auth, doctorOnly } = require('../middleware/auth');
const createAuditLog = require('../middleware/auditLog');
const emit = require('../utils/emit');

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
    const docId = (appointment.doctor?._id || appointment.doctor)?.toString();
    const patId = (appointment.patient?._id || appointment.patient)?.toString();
    const isDoctor = docId === userId;
    const isPatient = patId === userId;

    if (!isDoctor && !isPatient && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You are not a participant in this appointment.' });
    }

    if (appointment.status === 'completed') {
      return res.status(400).json({ 
        message: 'This consultation has already been completed and concluded. Rejoining is not permitted.',
        isCompleted: true,
        redirectUrl: `/doctor/prescription/${appointmentId}`
      });
    }
    // 'incomplete' appointments are allowed to be restarted by the doctor

    if (appointment.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'This appointment was cancelled. Cannot enter consultation room.',
        isCancelled: true
      });
    }

    // Check if a session already exists for this appointment
    let session = await ConsultationSession.findOne({ appointment: appointmentId }).sort({ createdAt: -1 });
    if (session) {
      const terminalStates = ['completed', 'ended', 'disconnected'];
      if (terminalStates.includes(session.status)) {
        if (!isDoctor && req.user.role !== 'admin') {
          // If the appointment is not completed (e.g. incomplete or confirmed), patient waits for doctor to resume
          if (appointment.status !== 'completed') {
            return res.status(403).json({
              message: 'Waiting for the doctor to resume the consultation session. You will be automatically reconnected as soon as the doctor restarts.',
              waitingForDoctor: true
            });
          }
          return res.status(400).json({
            message: 'This consultation has already been completed and concluded. Rejoining is not permitted.',
            isCompleted: true,
            session
          });
        }
        // Doctor is restarting/resuming consultation: reactivate the existing session to avoid duplicate index collisions
        session.status = 'in-progress';
        session.startedAt = session.startedAt || new Date();
        session.endedAt = null;
        if (!Array.isArray(session.networkEvents)) session.networkEvents = [];
        session.networkEvents.push({
          event: 'reconnected',
          timestamp: new Date(),
          details: `Doctor ${req.user.name} restarted/resumed consultation session`
        });
        await session.save();
      } else {
        // Session is already in-progress: allow seamless rejoin and log network event
        if (!Array.isArray(session.networkEvents)) session.networkEvents = [];
        session.networkEvents.push({
          event: 'reconnected',
          timestamp: new Date(),
          details: `${req.user.role === 'doctor' ? 'Doctor' : 'Patient'} ${req.user.name} rejoined consultation call`
        });
        session.status = 'in-progress';
        await session.save();

        return res.json({
          message: 'Reconnected to active consultation session.',
          session
        });
      }
    } else {
      // No session exists yet: Only doctor (or admin) can start a fresh consultation
      if (!isDoctor && req.user.role !== 'admin') {
        return res.status(403).json({
          message: 'Waiting for the doctor to initiate the consultation. You will be automatically connected as soon as the doctor starts the call.',
          waitingForDoctor: true
        });
      }

      // Create new session
      const patientId = appointment.patient?._id || appointment.patient;
      const doctorId = appointment.doctor?._id || appointment.doctor;

      session = new ConsultationSession({
        appointment: appointmentId,
        patient: patientId,
        doctor: doctorId,
        status: 'in-progress',
        startedAt: new Date(),
        networkEvents: [{
          event: 'connected',
          timestamp: new Date(),
          details: `${req.user.role === 'doctor' ? 'Doctor' : 'Patient'} ${req.user.name} joined session`
        }]
      });

      await session.save();
    }

    // Atomically update appointment status to in-progress if confirmed, pending, or incomplete (restart)
    // Avoids Mongoose VersionError and prevents 500 errors on restart
    if (['pending', 'confirmed', 'incomplete'].includes(appointment.status)) {
      await Appointment.findByIdAndUpdate(appointmentId, {
        $set: {
          status: 'in-progress',
          consultationSession: session._id
        }
      });
    }

    // Create audit log safely
    try {
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
    } catch (auditErr) {
      console.warn('Audit log error:', auditErr.message);
    }

    res.status(201).json({
      message: 'Consultation session started.',
      session
    });

    // Real-time: notify patient that doctor started the session
    try {
      emit(req, 'consultation:started', {
        appointmentId: appointmentId.toString(),
        sessionId: session._id.toString(),
        doctorId: docId,
        patientId: patId
      });

      // Real-time: also notify all dashboards and lists that appointment is now in-progress
      emit(req, 'appointment:updated', {
        appointmentId: appointmentId.toString(),
        doctorId: docId,
        patientId: patId,
        status: 'in-progress'
      });
    } catch (socketErr) {
      console.warn('Socket emit error:', socketErr.message);
    }
  } catch (err) {
    console.error('Start consultation error:', err);
    res.status(500).json({ message: err.message || 'Server error starting consultation.' });
  }
});

// GET /api/consultation/appointment/:appointmentId — Get active session for an appointment
router.get('/appointment/:appointmentId', auth, async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.appointmentId)) {
      return res.status(404).json({ message: 'Invalid appointment ID format.' });
    }

    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const userId = req.user._id.toString();
    const docId = (appointment.doctor?._id || appointment.doctor)?.toString();
    const patId = (appointment.patient?._id || appointment.patient)?.toString();
    const isDoctor = docId === userId;
    const isPatient = patId === userId;

    if (!isDoctor && !isPatient && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. You are not a participant in this appointment.' });
    }

    const session = await ConsultationSession.findOne({
      appointment: req.params.appointmentId
    })
      .sort({ createdAt: -1 })
      .populate('patient', 'name email phone')
      .populate('doctor', 'name email specialization');

    res.json({ session, isDoctor, isPatient, appointmentStatus: appointment.status });
  } catch (err) {
    console.error('Get session by appointment error:', err);
    res.status(500).json({ message: 'Server error fetching session.' });
  }
});

// POST /api/consultation/:sessionId/end — End a consultation session (doctor only)
router.post('/:sessionId/end', auth, doctorOnly, async (req, res) => {
  try {
    const { consultationNotes, duration, isIncomplete } = req.body;

    const session = await ConsultationSession.findById(req.params.sessionId);
    if (!session) {
      return res.status(404).json({ message: 'Consultation session not found.' });
    }

    if (session.doctor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Access denied.' });
    }

    session.endedAt = new Date();
    session.status = isIncomplete ? 'ended' : 'completed';
    session.consultationNotes = consultationNotes || '';

    // Calculate duration
    if (duration) {
      session.duration = duration;
    } else if (session.startedAt) {
      session.duration = Math.round((session.endedAt - session.startedAt) / 60000);
    }

    // Add disconnected network event
    if (!Array.isArray(session.networkEvents)) session.networkEvents = [];
    session.networkEvents.push({
      event: 'disconnected',
      timestamp: new Date(),
      details: isIncomplete ? 'Consultation session marked incomplete' : 'Consultation session ended'
    });

    await session.save();

    // Update appointment status ONLY if not incomplete
    if (!isIncomplete) {
      await Appointment.findByIdAndUpdate(session.appointment, { status: 'completed' });
    }

    // Create audit log safely
    try {
      await createAuditLog(
        isIncomplete ? 'CONSULTATION_INCOMPLETE' : 'CONSULTATION_ENDED',
        req.user._id,
        req.user.role,
        req.user.name,
        'ConsultationSession',
        session._id,
        { duration: session.duration, hasNotes: !!consultationNotes, isIncomplete: !!isIncomplete },
        req.ip
      );
    } catch (auditErr) {
      console.warn('Audit log error:', auditErr.message);
    }

    res.json({
      message: isIncomplete ? 'Consultation session marked incomplete.' : 'Consultation session ended.',
      session
    });

    // Real-time: notify patient that consultation has ended
    try {
      emit(req, 'consultation:ended', {
        appointmentId: session.appointment.toString(),
        sessionId: session._id.toString(),
        doctorId: session.doctor.toString(),
        patientId: session.patient.toString(),
        status: isIncomplete ? 'incomplete' : 'completed'
      });
    } catch (socketErr) {
      console.warn('Socket emit error:', socketErr.message);
    }
  } catch (err) {
    console.error('End consultation error:', err);
    res.status(500).json({ message: err.message || 'Server error ending consultation.' });
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

    // Real-time: push new chat message to both participants
    emit(req, 'consultation:message', {
      appointmentId: session.appointment.toString(),
      sessionId: session._id.toString(),
      doctorId: session.doctor.toString(),
      patientId: session.patient.toString(),
      chatMessage: newMessage
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

    // Atomic update to avoid Mongoose VersionError under concurrent signals
    const newSignal = {
      senderRole,
      senderId: req.user._id,
      type,
      data: data || {},
      timestamp: new Date()
    };

    if (type === 'offer' || type === 'restart') {
      // Clear out stale signals and push fresh offer atomically
      await ConsultationSession.findByIdAndUpdate(
        req.params.sessionId,
        {
          $set: {
            signals: [newSignal]
          }
        }
      );
    } else {
      await ConsultationSession.findByIdAndUpdate(
        req.params.sessionId,
        {
          $push: {
            signals: {
              $each: [newSignal],
              $slice: -60 // Keep only last 60 signals
            }
          }
        }
      );
    }

    try {
      emit(req, 'consultation:signal', {
        sessionId: session._id.toString(),
        appointmentId: session.appointment.toString(),
        signal: newSignal,
        senderRole
      });
    } catch {}

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

// POST /api/consultation/predict-disease — ML symptom analysis
// Takes clinical notes + chat transcript and returns likely disease predictions
router.post('/predict-disease', auth, async (req, res) => {
  try {
    const { symptoms, chatTranscript, clinicalNotes } = req.body;

    // Combine all text sources into one corpus for analysis
    const corpus = [
      symptoms || '',
      clinicalNotes || '',
      (chatTranscript || []).map(m => m.text || '').join(' ')
    ].join(' ').toLowerCase();

    if (!corpus.trim()) {
      return res.status(400).json({ message: 'No symptom data provided for analysis.' });
    }

    // Rule-based symptom → disease mapping (ML-lite, production systems would use a trained model)
    const diseaseKnowledgeBase = [
      {
        disease: 'Common Cold / Upper Respiratory Infection',
        icd10: 'J00',
        keywords: ['runny nose', 'sneezing', 'sore throat', 'cold', 'congestion', 'stuffy nose', 'nasal', 'cough mild'],
        weight: 1
      },
      {
        disease: 'Influenza (Flu)',
        icd10: 'J11',
        keywords: ['fever', 'body ache', 'fatigue', 'flu', 'chills', 'headache', 'muscle pain', 'high temperature'],
        weight: 1.2
      },
      {
        disease: 'COVID-19 / SARS-CoV-2',
        icd10: 'U07.1',
        keywords: ['covid', 'loss of smell', 'loss of taste', 'anosmia', 'covid-19', 'coronavirus', 'oxygen', 'isolation'],
        weight: 1.5
      },
      {
        disease: 'Pneumonia',
        icd10: 'J18.9',
        keywords: ['pneumonia', 'chest pain', 'difficulty breathing', 'breathlessness', 'productive cough', 'oxygen saturation', 'crackles'],
        weight: 1.4
      },
      {
        disease: 'Hypertension (High Blood Pressure)',
        icd10: 'I10',
        keywords: ['blood pressure', 'hypertension', 'bp high', '140', '160', '180', 'headache vision', 'palpitation'],
        weight: 1.3
      },
      {
        disease: 'Type 2 Diabetes Mellitus',
        icd10: 'E11',
        keywords: ['diabetes', 'blood sugar', 'glucose high', 'polyuria', 'polydipsia', 'thirst', 'frequent urination', 'hba1c', 'fasting'],
        weight: 1.3
      },
      {
        disease: 'Urinary Tract Infection (UTI)',
        icd10: 'N39.0',
        keywords: ['uti', 'burning urination', 'dysuria', 'frequent urination', 'cloudy urine', 'urinary infection', 'bladder'],
        weight: 1.2
      },
      {
        disease: 'Gastroenteritis / Food Poisoning',
        icd10: 'A09',
        keywords: ['vomiting', 'diarrhea', 'nausea', 'stomach pain', 'loose stools', 'food poisoning', 'gastro', 'cramps', 'abdominal pain'],
        weight: 1.1
      },
      {
        disease: 'Migraine',
        icd10: 'G43.9',
        keywords: ['migraine', 'severe headache', 'throbbing', 'light sensitivity', 'photophobia', 'aura', 'one sided headache'],
        weight: 1.2
      },
      {
        disease: 'Dengue Fever',
        icd10: 'A97',
        keywords: ['dengue', 'platelet', 'rash', 'joint pain', 'bone pain', 'high fever', 'mosquito', 'low platelet'],
        weight: 1.4
      },
      {
        disease: 'Malaria',
        icd10: 'B54',
        keywords: ['malaria', 'intermittent fever', 'shivering', 'chills rigor', 'spleen', 'antimalarial', 'plasmodium'],
        weight: 1.4
      },
      {
        disease: 'Typhoid Fever',
        icd10: 'A01.0',
        keywords: ['typhoid', 'widal', 'salmonella', 'stepladder fever', 'rose spots', 'slow pulse'],
        weight: 1.3
      },
      {
        disease: 'Asthma',
        icd10: 'J45.9',
        keywords: ['asthma', 'wheezing', 'bronchospasm', 'inhaler', 'shortness of breath exertion', 'nocturnal cough', 'bronchial'],
        weight: 1.2
      },
      {
        disease: 'Anemia',
        icd10: 'D64.9',
        keywords: ['anemia', 'pale', 'pallor', 'low hemoglobin', 'weakness', 'fatigue iron', 'breathless mild', 'low hb'],
        weight: 1.1
      },
      {
        disease: 'Anxiety / Panic Disorder',
        icd10: 'F41.1',
        keywords: ['anxiety', 'panic', 'palpitation', 'racing heart', 'nervous', 'stress', 'worry', 'restless', 'sweating anxiety'],
        weight: 1.0
      },
      {
        disease: 'Depression',
        icd10: 'F32.9',
        keywords: ['depression', 'sad', 'hopeless', 'low mood', 'loss of interest', 'sleep disturbance', 'suicidal', 'antidepressant'],
        weight: 1.0
      },
      {
        disease: 'Hypothyroidism',
        icd10: 'E03.9',
        keywords: ['thyroid', 'hypothyroid', 'tsh high', 'weight gain', 'cold intolerance', 'constipation', 'fatigue thyroid', 'levothyroxine'],
        weight: 1.1
      },
      {
        disease: 'Acute Gastritis / Peptic Ulcer',
        icd10: 'K29.7',
        keywords: ['gastritis', 'acidity', 'acid reflux', 'gerd', 'heartburn', 'epigastric pain', 'h pylori', 'peptic ulcer', 'antacid'],
        weight: 1.1
      },
      {
        disease: 'Kidney Stones (Urolithiasis)',
        icd10: 'N20.0',
        keywords: ['kidney stone', 'renal colic', 'flank pain', 'hematuria', 'urolithiasis', 'ureteric stone', 'blood in urine'],
        weight: 1.3
      },
      {
        disease: 'Jaundice / Hepatitis',
        icd10: 'K72.9',
        keywords: ['jaundice', 'yellow eyes', 'bilirubin', 'hepatitis', 'liver', 'dark urine', 'pale stool', 'icterus'],
        weight: 1.4
      }
    ];

    // Score each disease based on keyword matches in corpus
    const scores = diseaseKnowledgeBase.map(entry => {
      let matchCount = 0;
      let matchedKeywords = [];
      entry.keywords.forEach(kw => {
        if (corpus.includes(kw)) {
          matchCount++;
          matchedKeywords.push(kw);
        }
      });
      const rawScore = (matchCount / entry.keywords.length) * entry.weight;
      return {
        disease: entry.disease,
        icd10: entry.icd10,
        score: rawScore,
        matchedKeywords,
        matchCount
      };
    });

    // Filter and sort by score
    const predictions = scores
      .filter(s => s.matchCount > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s, index) => {
        const totalMax = Math.max(...scores.map(x => x.score));
        const confidence = totalMax > 0 ? Math.round((s.score / totalMax) * 100) : 0;
        return {
          rank: index + 1,
          disease: s.disease,
          icd10Code: s.icd10,
          confidence: Math.min(confidence, 95), // Cap at 95% — always leave room for clinical judgment
          matchedSymptoms: s.matchedKeywords,
          disclaimer: 'AI-assisted suggestion only. Clinical judgment must prevail.'
        };
      });

    if (predictions.length === 0) {
      return res.json({
        predictions: [],
        message: 'Insufficient symptom data for confident prediction. Please document more specific symptoms.',
        analysisNote: 'Consider adding chief complaints, duration, and associated symptoms for better accuracy.'
      });
    }

    res.json({
      predictions,
      corpusWordCount: corpus.split(/\s+/).filter(Boolean).length,
      analysisTimestamp: new Date().toISOString(),
      model: 'TeleMed-SymptomNet v1.0 (Rule-Based NLP)',
      disclaimer: 'These predictions are AI-assisted suggestions based on documented symptoms. Final diagnosis must be made by a qualified medical professional.'
    });
  } catch (err) {
    console.error('Disease prediction error:', err);
    res.status(500).json({ message: 'Server error during disease prediction analysis.' });
  }
});

module.exports = router;
