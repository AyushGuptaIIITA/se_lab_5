# Patient Speech Transcription Implementation Plan (Option B: Backend Whisper/AssemblyAI)

## Overview
Replace the current doctor-microphone-based speech recognition with a system that captures the **patient's remote WebRTC audio stream** and sends it to a backend transcription service for accurate medical speech-to-text.

## Architecture

```
Patient Mic → WebRTC → Doctor's Remote Stream → Web Audio API Capture → 
Audio Chunks (WebSocket/HTTP) → Backend Transcription Service → 
Patient Transcript → ML Disease Prediction → Doctor UI
```

## Backend Changes

### 1. Add Transcription Service Dependency
- **Option 1**: `whisper.cpp` via node-whisper (local, free, privacy)
- **Option 2**: AssemblyAI API (cloud, high accuracy, medical vocabulary)
- **Option 3**: Google Cloud Speech-to-Text / AWS Transcribe

**Recommendation**: Start with AssemblyAI (free tier: 5 hours/month, medical models available) or whisper.cpp for local processing.

### 2. Update ConsultationSession Model
```javascript
// backend/models/ConsultationSession.js
patientTranscript: { type: String, default: '' },
transcriptSegments: [{
  text: String,
  timestamp: Date,
  confidence: Number,
  isFinal: Boolean
}],
transcriptionStatus: { type: String, enum: ['idle', 'processing', 'completed', 'error'], default: 'idle' }
```

### 3. Add Transcription Endpoints
```javascript
// backend/routes/consultation.js
POST   /api/consultation/:sessionId/transcribe/start    // Start transcription session
POST   /api/consultation/:sessionId/transcribe/chunk    // Send audio chunk (base64/webm)
POST   /api/consultation/:sessionId/transcribe/end      // End transcription, get final transcript
GET    /api/consultation/:sessionId/transcript          // Get current transcript
```

### 4. Add Audit Log Actions
- `PATIENT_TRANSCRIPTION_STARTED`
- `PATIENT_TRANSCRIPTION_CHUNK_RECEIVED`
- `PATIENT_TRANSCRIPTION_COMPLETED`
- `AI_DIAGNOSIS_FROM_PATIENT_SPEECH`

## Frontend Changes

### 1. New Hook: `usePatientAudioCapture`
```javascript
// frontend/src/hooks/usePatientAudioCapture.js
- Captures remote WebRTC audio stream via Web Audio API
- Uses AudioWorklet for real-time PCM capture
- Buffers and sends chunks to backend via WebSocket or HTTP
- Handles reconnection, buffering, error recovery
```

### 2. Update ConsultationRoom.jsx
- Remove doctor's `SpeechRecognition` (lines 648-749)
- Add `usePatientAudioCapture` hook
- Connect to remote stream when `peerConnected === true`
- Show "AI Listening to Patient" indicator
- Display patient transcript in real-time (separate from doctor's speech)
- Feed patient transcript to `runMlPredictionWithSpeech`

### 3. UI Updates
- New transcript panel: "Patient Speech (AI Transcription)"
- Visual indicator: pulsing dot when transcription active
- Medical keyword extraction from patient transcript
- Auto-trigger ML prediction on patient speech segments

## Data Flow

1. **Session Start**: Doctor clicks "Start Live Video Consultation"
2. **WebRTC Connected**: `peerConnected` becomes true
3. **Audio Capture Starts**: `usePatientAudioCapture` connects to `remoteVideoRef.current.srcObject`
4. **Streaming**: Audio chunks sent to backend every 2-4 seconds
5. **Transcription**: Backend processes with Whisper/AssemblyAI
6. **Real-time Updates**: Partial transcripts pushed via Socket.io
7. **ML Prediction**: Patient transcript fed into `runMlPredictionWithSpeech`
8. **Session End**: Final transcript saved to `ConsultationSession.patientTranscript`

## Implementation Phases

### Phase 1: Backend Foundation (Day 1)
- [ ] Add transcription service dependency
- [ ] Update ConsultationSession model
- [ ] Create transcription service module
- [ ] Add transcription endpoints
- [ ] Add audit logging

### Phase 2: Frontend Audio Capture (Day 2)
- [ ] Create `usePatientAudioCapture` hook with AudioWorklet
- [ ] Integrate into ConsultationRoom
- [ ] Handle WebRTC stream connection lifecycle
- [ ] Implement chunked upload to backend

### Phase 3: Real-time UI & ML Integration (Day 3)
- [ ] Real-time transcript display
- [ ] Patient vs Doctor transcript separation
- [ ] ML prediction on patient speech
- [ ] Medical keyword highlighting

### Phase 4: Testing & Polish (Day 4)
- [ ] End-to-end testing with two browsers
- [ ] Error handling & reconnection
- [ ] Performance optimization
- [ ] Documentation

## Technical Details

### Audio Capture (Frontend)
```javascript
// AudioWorkletProcessor for real-time PCM capture
class AudioCaptureProcessor extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channel = input[0]; // Mono
      // Convert Float32Array to Int16Array for transmission
      const pcm16 = new Int16Array(channel.length);
      for (let i = 0; i < channel.length; i++) {
        pcm16[i] = Math.max(-32768, Math.min(32767, channel[i] * 32767));
      }
      this.port.postMessage(pcm16.buffer, [pcm16.buffer]);
    }
    return true;
  }
}
registerProcessor('audio-capture-processor', AudioCaptureProcessor);
```

### Backend Transcription Service
```javascript
// backend/services/transcriptionService.js
class TranscriptionService {
  constructor() {
    // AssemblyAI or whisper.cpp
  }
  
  async transcribeChunk(audioBuffer, sessionId) { }
  async finalizeTranscription(sessionId) { }
  async getTranscript(sessionId) { }
}
```

## Environment Variables
```env
# Backend .env
TRANSCRIPTION_PROVIDER=assemblyai  # or 'whisper'
ASSEMBLYAI_API_KEY=your_key
WHISPER_MODEL_PATH=./models/ggml-base.en.bin
```

## Security & Privacy
- Audio chunks transmitted over HTTPS/WSS only
- No persistent storage of raw audio (only transcripts)
- Audit logs for all transcription access
- Patient consent required (add to appointment flow)

## Estimated Effort
- Backend: ~8-12 hours
- Frontend: ~12-16 hours
- Testing: ~4-6 hours
- **Total: ~24-34 hours**

## Success Criteria
- [ ] Patient speech captured accurately (>90% WER for clear speech)
- [ ] Real-time transcript updates <3 second latency
- [ ] ML predictions improve with patient speech input
- [ ] No impact on WebRTC video/audio quality
- [ ] Graceful degradation if transcription fails