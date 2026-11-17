import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, PhoneOff, AlertTriangle,
  Loader2, User, FileText, Clock, RefreshCw, Send, MessageSquare,
  ExternalLink, CheckCircle, ArrowLeft, XCircle, Calendar,
  Brain, TrendingUp, AlertCircle, Zap, Radio, Square, Activity,
  ScreenShare, ShieldCheck, Sparkles, Stethoscope
} from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import ActionLoaderModal from '../../components/ActionLoaderModal';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatAppointmentDate } from '../../utils/dateUtils';
import { useSocket } from '../../contexts/SocketContext';
import { usePatientAudioCapture } from '../../hooks/usePatientAudioCapture';

// ── Virtual Media Generators for Seamless Multi-Client & Hardware In-Use Fallbacks ──
// When physical camera is locked by another window/tab on Windows ("Could not start video source"),
// this creates a high-definition simulated clinical live feed with user initials, pulsing avatar & audio wave.
const createVirtualVideoTrack = (name = 'User', role = 'doctor') => {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 480;
  const ctx = canvas.getContext('2d');
  
  let frame = 0;
  const draw = () => {
    frame++;
    // Dark medical background
    const grad = ctx.createLinearGradient(0, 0, 640, 480);
    grad.addColorStop(0, '#090d16');
    grad.addColorStop(1, '#131d2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 640, 480);

    // Subtle pulsing ring
    const radius = 68 + Math.sin(frame * 0.08) * 8;
    ctx.beginPath();
    ctx.arc(320, 195, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = role === 'doctor' ? 'rgba(59, 130, 246, 0.25)' : 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 5;
    ctx.stroke();

    // Solid avatar circle
    ctx.beginPath();
    ctx.arc(320, 195, 65, 0, Math.PI * 2);
    ctx.fillStyle = role === 'doctor' ? '#2563eb' : '#059669';
    ctx.fill();

    // Initial
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const initial = (name || 'U').replace(/^Dr\.\s*/i, '').charAt(0).toUpperCase() || 'U';
    ctx.fillText(initial, 320, 195);

    // Display Name
    ctx.font = 'bold 22px sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(name || (role === 'doctor' ? 'Doctor' : 'Patient'), 320, 295);

    // Role Badge
    ctx.font = 'bold 12px sans-serif';
    ctx.fillStyle = role === 'doctor' ? '#60a5fa' : '#34d399';
    ctx.fillText(
      role === 'doctor' ? '● DOCTOR CLINICAL STREAM (VIRTUAL FEED)' : '● PATIENT LIVE STREAM (VIRTUAL FEED)',
      320,
      325
    );

    // Animated active waveform
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let x = 200; x <= 440; x += 10) {
      const y = 375 + Math.sin((x + frame * 5) * 0.08) * 7;
      if (x === 200) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  };

  draw();
  const timer = setInterval(draw, 100);
  const stream = canvas.captureStream(15);
  const track = stream.getVideoTracks()[0];
  const origStop = track.stop.bind(track);
  track.stop = () => {
    clearInterval(timer);
    origStop();
  };
  return track;
};

// Creates a silent audio track when microphone is blocked/busy
const createSilentAudioTrack = () => {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const dest = ctx.createMediaStreamDestination();
    gain.gain.value = 0; // truly silent — still negotiates an audio m-line
    osc.connect(gain);
    gain.connect(dest);
    osc.start();
    return dest.stream.getAudioTracks()[0] || null;
  } catch (e) {}
  return null;
};

export default function ConsultationRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { subscribe, joinAppointmentRoom, emit } = useSocket();

  const isDoctor = user?.role === 'doctor';

  const [appointment, setAppointment] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [processModal, setProcessModal] = useState({
    isOpen: false,
    title: '',
    subtitle: '',
    stage: '',
    icon: null
  });
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [peerConnected, setPeerConnected] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [notes, setNotes] = useState('');
  const [alert, setAlert] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  // WebRTC native stream & connection refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null); // Store remote stream for patient audio capture
  const [remoteStream, setRemoteStream] = useState(null); // State for remote stream to pass to hook
  const peerConnectionRef = useRef(null);
  const pendingSignalsRef = useRef([]);       // signals that arrived before PC existed
  const processedSignalKeysRef = useRef(new Set());
  const makingOfferRef = useRef(false);
  const callGenerationRef = useRef(0);        // invalidate in-flight startNativeCall
  const lastSignalPollAtRef = useRef(null);
  const [localStreamVersion, setLocalStreamVersion] = useState(0); // re-attach <video> after render
  const [activeTab, setActiveTab] = useState('chat');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // ML Disease Prediction state
  const [mlPredictions, setMlPredictions] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [showMlPanel, setShowMlPanel] = useState(true);
  const [mlError, setMlError] = useState(null);

  // ── Real-time Speech Recognition state (doctor only) ──────────────────────
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');      // rolling current phrase
  const [fullTranscript, setFullTranscript] = useState('');      // accumulated session transcript
  const [speechKeywords, setSpeechKeywords] = useState([]);       // detected medical keywords
  const [autoAnalyze, setAutoAnalyze] = useState(true);          // auto-run ML on new speech
  const recognitionRef = useRef(null);
  const autoAnalyzeTimerRef = useRef(null);
  const fullTranscriptRef = useRef('');                           // ref so callbacks always have latest


  const timerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const sessionRef = useRef(null);

  // Keep sessionRef in sync
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ─── Patient Audio Capture Hook (for AI transcription) ───────────────────────
  const {
    isCapturing: isPatientAudioCapturing,
    transcript: patientTranscript,
    segments: patientTranscriptSegments,
    error: patientAudioError,
    startCapture: startPatientAudioCapture,
    stopCapture: stopPatientAudioCapture,
    fetchTranscript: fetchPatientTranscript
  } = usePatientAudioCapture(sessionRef.current?._id, remoteStream);

  // ─── Native WebRTC Video Engine (Unlimited Session Duration - up to 1+ hour) ───
  const signalKey = useCallback((sig) => {
    if (!sig?.type) return '';
    if (sig.type === 'offer' || sig.type === 'answer') {
      return `${sig.type}:${sig.data?.type || ''}:${(sig.data?.sdp || '').slice(0, 120)}`;
    }
    if (sig.type === 'candidate') {
      return `candidate:${sig.data?.candidate || ''}:${sig.data?.sdpMid ?? ''}:${sig.data?.sdpMLineIndex ?? ''}`;
    }
    return `${sig.type}:${JSON.stringify(sig.data || {}).slice(0, 80)}`;
  }, []);

  const attachLocalPreview = useCallback((stream) => {
    if (!stream) return;
    const el = localVideoRef.current;
    if (el) {
      if (el.srcObject !== stream) el.srcObject = stream;
      el.muted = true;
      el.play?.().catch(() => {});
    }
  }, []);

  const attachRemoteTrack = useCallback((event) => {
    const el = remoteVideoRef.current;
    if (!el) return;

    const remoteStream = event.streams?.[0];
    if (remoteStream) {
      if (el.srcObject !== remoteStream) el.srcObject = remoteStream;
      // Store remote stream for patient audio capture
      remoteStreamRef.current = remoteStream;
      setRemoteStream(remoteStream);
    } else if (event.track) {
      let media = el.srcObject;
      if (!(media instanceof MediaStream)) {
        media = new MediaStream();
        el.srcObject = media;
      }
      if (!media.getTracks().some((t) => t.id === event.track.id)) {
        media.addTrack(event.track);
      }
      // If we got a track but no stream, create one from the track
      if (!remoteStreamRef.current && media instanceof MediaStream) {
        remoteStreamRef.current = media;
        setRemoteStream(media);
      }
    }

    el.play?.().catch(() => {});
    setPeerConnected(true);
  }, []);

  const drainQueuedCandidates = useCallback(async (pc) => {
    const remaining = [];
    while (pendingSignalsRef.current.length > 0) {
      const queued = pendingSignalsRef.current.shift();
      if (queued?.type === 'candidate' && queued.data) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(queued.data));
        } catch {}
      } else if (queued) {
        remaining.push(queued);
      }
    }
    pendingSignalsRef.current = remaining;
  }, []);

  const sendSignal = useCallback(async (sig) => {
    emit('webrtc:signal', {
      appointmentId,
      sessionId: sessionRef.current?._id,
      signal: sig,
      senderRole: isDoctor ? 'doctor' : 'patient'
    });

    if (sessionRef.current?._id) {
      try {
        await api.post(`/consultation/${sessionRef.current._id}/signal`, {
          type: sig.type,
          data: sig.data
        });
      } catch {}
    }
  }, [appointmentId, isDoctor, emit]);

  const createDoctorOffer = useCallback(async (reason = 'start') => {
    const pc = peerConnectionRef.current;
    if (!isDoctor || !pc || makingOfferRef.current) return;
    // Don't renegotiate a healthy live call unless reconnect was requested
    if (reason !== 'reconnect' && pc.connectionState === 'connected' && pc.iceConnectionState === 'connected') {
      return;
    }
    // Only create/replace offer from stable or an unanswered local offer
    if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer') return;

    makingOfferRef.current = true;
    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
        iceRestart: reason === 'reconnect' || pc.iceConnectionState === 'failed'
      });
      if (!peerConnectionRef.current || peerConnectionRef.current !== pc) return;
      await pc.setLocalDescription(offer);
      sendSignal({ type: 'offer', data: pc.localDescription || offer });
    } catch (err) {
      console.warn('Doctor offer failed:', reason, err);
    } finally {
      makingOfferRef.current = false;
    }
  }, [isDoctor, sendSignal]);

  const handleIncomingSignal = useCallback(async (sig) => {
    if (!sig?.type) return;

    const key = signalKey(sig);
    if (key && processedSignalKeysRef.current.has(key)) return;

    // Queue until peer connection exists (do NOT drop — early offers were being lost)
    if (!peerConnectionRef.current) {
      pendingSignalsRef.current.push(sig);
      return;
    }

    const pc = peerConnectionRef.current;

    try {
      if (sig.type === 'offer' && !isDoctor) {
        // Patient is the polite answerer only
        if (pc.signalingState !== 'stable' && pc.signalingState !== 'have-remote-offer') {
          pendingSignalsRef.current.push(sig);
          return;
        }
        // Skip identical remote SDP
        if (pc.currentRemoteDescription?.sdp && sig.data?.sdp === pc.currentRemoteDescription.sdp) {
          if (key) processedSignalKeysRef.current.add(key);
          return;
        }

        await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
        if (key) processedSignalKeysRef.current.add(key);
        await drainQueuedCandidates(pc);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        sendSignal({ type: 'answer', data: pc.localDescription || answer });
      } else if (sig.type === 'answer' && isDoctor) {
        if (pc.signalingState !== 'have-local-offer') return;
        if (pc.currentRemoteDescription?.sdp && sig.data?.sdp === pc.currentRemoteDescription.sdp) {
          if (key) processedSignalKeysRef.current.add(key);
          return;
        }
        await pc.setRemoteDescription(new RTCSessionDescription(sig.data));
        if (key) processedSignalKeysRef.current.add(key);
        await drainQueuedCandidates(pc);
      } else if (sig.type === 'candidate' && sig.data) {
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(sig.data));
            if (key) processedSignalKeysRef.current.add(key);
          } catch {}
        } else {
          pendingSignalsRef.current.push(sig);
        }
      }
    } catch (err) {
      console.warn('WebRTC signal handling warning:', err);
    }
  }, [isDoctor, sendSignal, signalKey, drainQueuedCandidates]);

  const stopNativeCall = useCallback(() => {
    callGenerationRef.current += 1;
    makingOfferRef.current = false;

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (peerConnectionRef.current) {
      try { peerConnectionRef.current.close(); } catch {}
      peerConnectionRef.current = null;
    }
    if (localVideoRef.current) localVideoRef.current.srcObject = null;
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
    setPeerConnected(false);
    setIsScreenSharing(false);
  }, []);

  const acquireLocalMedia = useCallback(async () => {
    const myName = user?.name || (isDoctor ? 'Doctor' : 'Patient');
    const role = isDoctor ? 'doctor' : 'patient';

    // Prefer real camera+mic; fall back gracefully so WebRTC always starts
    try {
      return {
        stream: await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280, max: 1920 }, height: { ideal: 720, max: 1080 } },
          audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
        }),
        virtual: false
      };
    } catch (mediaErr) {
      console.warn('Camera/mic unavailable, using fallback media:', mediaErr);
    }

    let audioTrack = null;
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
      audioTrack = audioStream.getAudioTracks()[0] || null;
    } catch {
      audioTrack = createSilentAudioTrack();
    }

    let videoTrack = null;
    try {
      const videoStream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      videoTrack = videoStream.getVideoTracks()[0] || null;
    } catch {
      videoTrack = createVirtualVideoTrack(myName, role);
    }

    if (!videoTrack) videoTrack = createVirtualVideoTrack(myName, role);

    const tracks = [videoTrack];
    if (audioTrack) tracks.push(audioTrack);

    return { stream: new MediaStream(tracks), virtual: true };
  }, [user?.name, isDoctor]);

  const startNativeCall = useCallback(async () => {
    const generation = ++callGenerationRef.current;

    try {
      // Preserve early offer/answer signals that arrived before this start
      const preservedSignals = pendingSignalsRef.current.filter(
        (s) => s?.type === 'offer' || s?.type === 'answer' || s?.type === 'candidate'
      );

      // Tear down previous PC/tracks without bumping generation again
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      if (peerConnectionRef.current) {
        try { peerConnectionRef.current.close(); } catch {}
        peerConnectionRef.current = null;
      }
      if (localVideoRef.current) localVideoRef.current.srcObject = null;
      if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null;
      setPeerConnected(false);
      setIsScreenSharing(false);
      makingOfferRef.current = false;
      processedSignalKeysRef.current = new Set();
      pendingSignalsRef.current = preservedSignals;
      lastSignalPollAtRef.current = null;

      const { stream, virtual } = await acquireLocalMedia();
      if (generation !== callGenerationRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      localStreamRef.current = stream;
      setLocalStreamVersion((v) => v + 1);
      attachLocalPreview(stream);

      if (virtual) {
        setAlert({
          type: 'info',
          message: 'Camera busy or unavailable in this browser. Using TeleMed Virtual Live Feed so both participants can still connect.'
        });
      }

      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun3.l.google.com:19302' },
          { urls: 'stun:stun.cloudflare.com:3478' }
        ]
      });

      if (generation !== callGenerationRef.current) {
        pc.close();
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      peerConnectionRef.current = pc;
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => attachRemoteTrack(event);

      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal({ type: 'candidate', data: event.candidate.toJSON?.() || event.candidate });
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          setPeerConnected(true);
        } else if (['failed', 'closed'].includes(pc.connectionState)) {
          setPeerConnected(false);
        } else if (pc.connectionState === 'disconnected') {
          // Brief blip — give ICE a moment before flipping UI
          setTimeout(() => {
            if (peerConnectionRef.current === pc && pc.connectionState === 'disconnected') {
              setPeerConnected(false);
            }
          }, 2000);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
          setPeerConnected(true);
        }
      };

      // Join room + announce readiness so the peer can (re)negotiate
      emit('join:appointment', appointmentId);
      emit('webrtc:ready', {
        appointmentId,
        senderRole: isDoctor ? 'doctor' : 'patient'
      });

      // Replay any signals that arrived before PC was ready (critical race fix)
      const queued = [...pendingSignalsRef.current];
      pendingSignalsRef.current = [];
      for (const queuedSig of queued) {
        await handleIncomingSignal(queuedSig);
      }

      if (generation !== callGenerationRef.current) return;

      if (isDoctor) {
        // Short delay so patient socket listeners are attached, then offer
        await new Promise((r) => setTimeout(r, 400));
        if (generation !== callGenerationRef.current) return;
        await createDoctorOffer('start');
      } else {
        // Patient: if no offer arrives quickly, ask doctor to re-offer
        setTimeout(() => {
          if (generation !== callGenerationRef.current) return;
          const current = peerConnectionRef.current;
          if (current && !current.currentRemoteDescription) {
            emit('webrtc:request-offer', {
              appointmentId,
              senderRole: 'patient'
            });
            emit('webrtc:ready', {
              appointmentId,
              senderRole: 'patient'
            });
          }
        }, 2500);
      }
    } catch (err) {
      console.error('WebRTC start error:', err);
      setAlert({
        type: 'error',
        message: 'Unable to start video session: ' + (err.message || 'Please retry Reconnect Video.')
      });
    }
  }, [
    appointmentId,
    isDoctor,
    emit,
    sendSignal,
    handleIncomingSignal,
    acquireLocalMedia,
    attachLocalPreview,
    attachRemoteTrack,
    createDoctorOffer
  ]);

  // Keep local <video> attached across re-renders / tab switches
  useEffect(() => {
    attachLocalPreview(localStreamRef.current);
  }, [localStreamVersion, attachLocalPreview, peerConnected]);

  const toggleMic = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicOn(audioTrack.enabled);
      }
    }
  };

  const toggleCam = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCamOn(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        const pc = peerConnectionRef.current;
        if (pc) {
          const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        }
        if (localVideoRef.current) localVideoRef.current.srcObject = screenStream;

        screenTrack.onended = () => {
          const camTrack = localStreamRef.current?.getVideoTracks()[0];
          const sender = peerConnectionRef.current?.getSenders().find(s => s.track && s.track.kind === 'video');
          if (sender && camTrack) sender.replaceTrack(camTrack);
          if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
          setIsScreenSharing(false);
        };
        setIsScreenSharing(true);
      } catch (e) {
        console.warn('Screen share canceled or failed:', e);
      }
    } else {
      const camTrack = localStreamRef.current?.getVideoTracks()[0];
      const sender = peerConnectionRef.current?.getSenders().find(s => s.track && s.track.kind === 'video');
      if (sender && camTrack) sender.replaceTrack(camTrack);
      if (localVideoRef.current) localVideoRef.current.srcObject = localStreamRef.current;
      setIsScreenSharing(false);
    }
  };

  const handleReconnect = () => {
    setAlert({ type: 'info', message: 'Reconnecting HD Video stream...' });
    startNativeCall();
    setTimeout(() => setAlert(null), 3000);
  };

  // ─── Medical keyword extractor ────────────────────────────────────────────
  const MEDICAL_KEYWORDS = [
    'fever','cough','pain','headache','nausea','vomiting','diarrhea','fatigue',
    'chest','breathless','breathing','shortness','throat','cold','runny','sneeze',
    'blood','pressure','sugar','diabetes','hypertension','anxiety','stress',
    'rash','itch','swelling','joint','muscle','bone','stomach','abdomen',
    'kidney','liver','heart','pulse','oxygen','bp','temperature','infection',
    'dengue','malaria','typhoid','covid','flu','pneumonia','asthma','migraine',
    'anemia','thyroid','jaundice','ulcer','gastritis','urine','platelet',
    'dizzy','weakness','appetite','weight','insomnia','constipation','acidity',
    'allergy','inflammation','discharge','numbness','tingling','cramp','spasm',
    'back pain','knee','hip','shoulder','neck','burn','wound','fracture',
    'sore throat','ear pain','eye','vision','hearing loss','unconscious',
  ];

  const extractMedicalKeywords = (text) => {
    const lower = text.toLowerCase();
    return [...new Set(
      MEDICAL_KEYWORDS.filter(kw => lower.includes(kw))
    )];
  };

  // ─── Patient Audio Capture for AI Transcription ────────────────────────────
  // Replaces old doctor's microphone speech recognition with patient's remote audio
  const [isPatientAudioActive, setIsPatientAudioActive] = useState(false);
  // patientAudioError comes from the hook

  // Handle transcript updates from patient audio capture
  const handlePatientTranscriptUpdate = useCallback((transcript) => {
    // Extract and show detected medical keywords
    const kws = extractMedicalKeywords(transcript);
    setSpeechKeywords(kws);

    // Auto-trigger ML analysis 4 seconds after last spoken chunk
    if (autoAnalyze) {
      clearTimeout(autoAnalyzeTimerRef.current);
      autoAnalyzeTimerRef.current = setTimeout(() => {
        runMlPredictionWithSpeech(transcript);
      }, 4000);
    }
  }, [autoAnalyze]);

  const startPatientAudioCaptureHandler = async () => {
    if (isPatientAudioActive || !remoteStream) return;
    try {
      await startPatientAudioCapture(handlePatientTranscriptUpdate);
      setIsPatientAudioActive(true);
      setShowMlPanel(true);
    } catch (e) {
      console.warn('Patient audio capture start error:', e);
      // Error is managed by the hook and available via patientAudioError
    }
  };

  const stopPatientAudioCaptureHandler = async () => {
    if (!isPatientAudioActive) return;
    try {
      await stopPatientAudioCapture();
      setIsPatientAudioActive(false);
      // The final transcript will be available in patientTranscript state
    } catch (e) {
      console.warn('Patient audio capture stop error:', e);
      // Error is managed by the hook and available via patientAudioError
    }
  };

  const togglePatientAudioCapture = () => {
    if (isPatientAudioActive) {
      stopPatientAudioCaptureHandler();
    } else {
      startPatientAudioCaptureHandler();
    }
  };

  // ─── ML prediction that also includes patient speech transcript ────────────
  const runMlPredictionWithSpeech = useCallback(async (speechText) => {
    setMlLoading(true);
    setShowMlPanel(true);
    try {
      const chatTranscript = messages.map(m => ({ text: m.text || '' }));
      // Include patient speech transcript as extra "chat" entries so it's analysed too
      if (speechText) {
        chatTranscript.push({ text: '[Patient Speech] ' + speechText });
      }
      const res = await api.post('/consultation/predict-disease', {
        symptoms: appointment?.symptoms || '',
        clinicalNotes: notes,
        chatTranscript
      });
      setMlPredictions(res.data);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message || err.message;
      const details = err.response?.data?.details;
      
      // Handle specific error cases
      if (status === 429) {
        console.warn('ML prediction rate limited (429):', message);
        setMlError('AI service temporarily busy. Please try again in a moment.');
      } else if (status === 500) {
        console.error('ML prediction server error (500):', { message, details, speechText, notes });
        setMlError('AI analysis unavailable. Using manual diagnosis only.');
      } else {
        console.warn('Auto ML prediction error:', { status, message, details });
        setMlError('Could not load AI suggestions.');
      }
    } finally {
      setMlLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, notes, appointment]);

  // Keep runMlPredictionWithSpeech ref fresh so the speech recognition closure uses latest
  const mlPredictFnRef = useRef(runMlPredictionWithSpeech);
  useEffect(() => { mlPredictFnRef.current = runMlPredictionWithSpeech; }, [runMlPredictionWithSpeech]);

  // ─── Fetch appointment + session on mount ──────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        const [apptRes, sessionRes] = await Promise.all([
          api.get(`/appointments/${appointmentId}`),
          api.get(`/consultation/appointment/${appointmentId}`).catch(() => ({ data: { session: null } }))
        ]);

        if (!mounted) return;

        const appt = apptRes.data.appointment;
        setAppointment(appt);

        if (appt.status === 'completed') {
          setLoading(false);
          return;
        }
        // 'incomplete' or 'confirmed' appointments: doctor can start/restart, patient waits

        const sess = sessionRes.data?.session;
        if (sess) {
          if (['completed', 'ended', 'disconnected'].includes(sess.status)) {
            // Previous session ended. Keep notes if any, but DO NOT set active session.
            if (sess.consultationNotes) setNotes(sess.consultationNotes);
            setSession(null);
            sessionRef.current = null;
          } else {
            setSession(sess);
            sessionRef.current = sess;
            setMessages(sess.messages || []);
            if (sess.consultationNotes) setNotes(sess.consultationNotes);

            if (sess.startedAt) {
              setElapsed(Math.max(0, Math.floor((Date.now() - new Date(sess.startedAt)) / 1000)));
            }

            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
          }
        }

        // Auto-run AI Disease Prediction on load for doctor so they can prescribe better in real time
        if (isDoctor && appt.symptoms) {
          api.post('/consultation/predict-disease', {
            symptoms: appt.symptoms,
            clinicalNotes: sess?.consultationNotes || '',
            chatTranscript: sess?.messages || []
          }).then(res => setMlPredictions(res.data)).catch(() => {});
        }
      } catch (err) {
        if (mounted) setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load consultation room.' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      stopNativeCall();
      clearInterval(timerRef.current);
      clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  // ─── Start Native WebRTC call when session becomes in-progress ─────────────
  useEffect(() => {
    if (session?.status !== 'in-progress') return;

    // Both doctor and patient must join the socket room first
    joinAppointmentRoom(appointmentId);

    const t = setTimeout(() => startNativeCall(), 300);

    const myRole = isDoctor ? 'doctor' : 'patient';

    // Socket: listen for incoming WebRTC signals from the peer
    const unsubSignal = subscribe('webrtc:signal', (payload) => {
      if (payload?.senderRole && payload.senderRole !== myRole) {
        handleIncomingSignal(payload.signal);
      }
    });

    // HTTP-path socket broadcast (backup when peers miss webrtc:signal)
    const unsubHttpSignal = subscribe('consultation:signal', (payload) => {
      if (payload?.senderRole && payload.senderRole !== myRole && payload?.signal) {
        handleIncomingSignal({
          type: payload.signal.type,
          data: payload.signal.data
        });
      }
    });

    // Peer ready → doctor offers once (no aggressive iceRestart spam)
    const unsubReady = subscribe('webrtc:peer-ready', (payload) => {
      if (!payload?.senderRole || payload.senderRole === myRole) return;
      if (isDoctor) createDoctorOffer('peer-ready');
    });

    // Patient requests a fresh offer
    const unsubRequestOffer = subscribe('webrtc:request-offer', (payload) => {
      if (!isDoctor) return;
      if (payload?.senderRole === 'patient') createDoctorOffer('request-offer');
    });

    // Peer joined room → gentle re-offer / ready ping (skip if already connected)
    const unsubJoined = subscribe('webrtc:peer-joined', () => {
      if (isDoctor) {
        createDoctorOffer('peer-joined');
      } else {
        emit('webrtc:ready', {
          appointmentId,
          senderRole: 'patient'
        });
      }
    });

    // Fallback polling — use since= to avoid replaying the entire history
    const signalPoll = setInterval(async () => {
      if (!sessionRef.current?._id) return;
      try {
        const params = {};
        if (lastSignalPollAtRef.current) params.since = lastSignalPollAtRef.current;
        const res = await api.get(`/consultation/${sessionRef.current._id}/signals`, { params });
        if (res.data?.serverTime) lastSignalPollAtRef.current = res.data.serverTime;
        const signals = res.data?.signals || [];
        for (const s of signals) {
          handleIncomingSignal({ type: s.type, data: s.data });
        }
      } catch {}
    }, 2000);

    return () => {
      clearTimeout(t);
      unsubSignal();
      unsubHttpSignal();
      unsubReady();
      unsubRequestOffer();
      unsubJoined();
      clearInterval(signalPoll);
      stopNativeCall();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?._id]);

  // ─── Patient waiting room: socket-first, poll as fallback ─────────────────
  useEffect(() => {
    if (isDoctor || session) return;

    // Join the appointment room so server can push events to us
    joinAppointmentRoom(appointmentId);

    // Socket: instant notification when doctor starts
    const unsub = subscribe('consultation:started', (data) => {
      if (data?.appointmentId !== appointmentId) return;
      api.get(`/consultation/appointment/${appointmentId}`)
        .then(res => {
          if (res.data?.session?.status === 'in-progress') {
            const activeSess = res.data.session;
            setSession(activeSess);
            sessionRef.current = activeSess;
            setMessages(activeSess.messages || []);
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
          }
        }).catch(() => {});
    });

    // Polling fallback every 2.5s alongside socket
    const poll = setInterval(async () => {
      try {
        const res = await api.get(`/consultation/appointment/${appointmentId}`);
        if (res.data?.session?.status === 'in-progress') {
          const activeSess = res.data.session;
          setSession(activeSess);
          sessionRef.current = activeSess;
          setMessages(activeSess.messages || []);
          timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
          clearInterval(poll);
        }
      } catch {}
    }, 2500);

    return () => { unsub(); clearInterval(poll); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctor, session, appointmentId]);

  // ─── Real-time: chat messages + consultation ended via socket ──────────────
  useEffect(() => {
    if (!session?._id || session?.status === 'completed') return;

    joinAppointmentRoom(appointmentId);

    // Socket: instant new message
    const unsubMsg = subscribe('consultation:message', (data) => {
      if (data?.sessionId !== session._id) return;
      if (data?.chatMessage) setMessages(prev => [...prev, data.chatMessage]);
    });

    // Socket: consultation ended (patient side) — navigate patient away immediately
    const unsubEnd = subscribe('consultation:ended', (data) => {
      if (data?.appointmentId !== appointmentId) return;
      stopNativeCall();
      clearInterval(timerRef.current);
      clearInterval(pollingRef.current);
      if (!isDoctor) {
        // Patient: redirect to their appointments with a completed message
        navigate('/patient/appointments');
      } else {
        setSession(prev => prev ? { ...prev, status: 'completed' } : prev);
      }
    });

    // Polling fallback every 3s so client never lags if socket drops
    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/consultation/${session._id}`);
        if (res.data?.session?.messages) setMessages(res.data.session.messages);
        if (['completed', 'ended'].includes(res.data?.session?.status)) {
          stopNativeCall();
          clearInterval(timerRef.current);
          if (!isDoctor) {
            navigate('/patient/appointments');
          } else {
            setSession(res.data.session);
          }
        }
      } catch {}
    }, 3000);

    return () => {
      unsubMsg();
      unsubEnd();
      clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?._id, session?.status]);

  // ─── Auto-scroll chat ─────────────────────────────────────────────────────
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // ─── Start Session ────────────────────────────────────────────────────────
  const startSession = async () => {
    setStarting(true);
    setAlert(null);
    setProcessModal({
      isOpen: true,
      title: 'Connecting Video Consultation',
      subtitle: 'Starting encrypted session and establishing live media stream...',
      stage: 'Initiating WebRTC channel',
      icon: Video
    });
    try {
      const res = await api.post('/consultation/start', { appointmentId });
      const sess = res.data.session;
      setSession(sess);
      sessionRef.current = sess;
      setMessages(sess.messages || []);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      setAlert({ type: 'success', message: 'Live consultation started. HD Video connecting...' });
      setTimeout(() => startNativeCall(), 400);
    } catch (err) {
      if (err.response?.data?.isCompleted || appointment?.status === 'completed') {
        setAppointment(prev => prev ? { ...prev, status: 'completed' } : prev);
        if (isDoctor) {
          navigate(`/doctor/prescription/${appointmentId}`);
          return;
        }
      }
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to start consultation.' });
    } finally {
      setStarting(false);
      setProcessModal(prev => ({ ...prev, isOpen: false }));
    }
  };

  // ─── Send Chat Message ────────────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !session?._id || sendingMsg) return;
    const text = chatInput.trim();
    setChatInput('');
    setSendingMsg(true);
    try {
      const res = await api.post(`/consultation/${session._id}/message`, { text });
      if (res.data?.messages) setMessages(res.data.messages);
    } catch {
      setAlert({ type: 'error', message: 'Failed to send message.' });
    } finally {
      setSendingMsg(false);
    }
  };

  // ─── ML Disease Prediction ────────────────────────────────────────────────
  const runMlPrediction = async () => {
    // Include patient speech transcript in analysis
    await runMlPredictionWithSpeech(patientTranscript);
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Doctor: Mark as Completed ────────────────────────────────────────────
  const markAsCompleted = async () => {
    setEnding(true);
    setProcessModal({
      isOpen: true,
      title: 'Finalizing Consultation',
      subtitle: 'Ending live video call and saving clinical notes...',
      stage: 'Closing session & updating appointment',
      icon: CheckCircle
    });
    try {
      if (session?._id) {
        await api.post(`/consultation/${session._id}/end`, {
          consultationNotes: notes,
          duration: Math.max(1, Math.floor(elapsed / 60))
        });
      }
      await api.patch(`/appointments/${appointmentId}/status`, { status: 'completed' });
      clearInterval(timerRef.current);
      stopNativeCall();
      stopSpeechRecognition();

      setAppointment(prev => prev ? { ...prev, status: 'completed' } : prev);
      setSession(prev => prev ? { ...prev, status: 'completed' } : prev);

      // Transition loader to prescription studio redirect
      setProcessModal({
        isOpen: true,
        title: 'Opening Prescription Studio',
        subtitle: `Redirecting to write prescription for ${patientName}...`,
        stage: 'Transferring clinical notes & AI suggestions',
        icon: FileText
      });

      // Navigate to prescription form with full context
      setTimeout(() => {
        navigate(`/doctor/prescription/${appointmentId}`, {
          state: {
            consultationNotes: notes,
            patientName,
            appointmentId,
            symptoms: appointment?.symptoms || '',
            suggestedDiagnosis: mlPredictions?.suggestedDiagnosis || ''
          }
        });
      }, 700);

    } catch (err) {
      setEnding(false);
      setProcessModal(prev => ({ ...prev, isOpen: false }));
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to complete consultation.' });
    }
  };

  // ─── Doctor: Mark as Incomplete ───────────────────────────────────────────
  const markAsIncomplete = async () => {
    if (!window.confirm('Mark this consultation as incomplete?')) return;
    setEnding(true);
    setProcessModal({
      isOpen: true,
      title: 'Updating Consultation Status',
      subtitle: 'Marking session as incomplete and preserving notes...',
      stage: 'Syncing with appointments',
      icon: XCircle
    });
    try {
      if (session?._id) {
        try {
          await api.post(`/consultation/${session._id}/end`, {
            consultationNotes: notes,
            duration: Math.max(1, Math.floor(elapsed / 60)),
            isIncomplete: true
          });
        } catch {}
      }
      await api.patch(`/appointments/${appointmentId}/status`, { status: 'incomplete' });
      clearInterval(timerRef.current);
      stopNativeCall();
      stopSpeechRecognition();
      setAppointment(prev => prev ? { ...prev, status: 'incomplete' } : prev);
      navigate('/doctor/appointments');
    } catch (err) {
      setEnding(false);
      setProcessModal(prev => ({ ...prev, isOpen: false }));
      setAlert({ type: 'error', message: 'Failed to update status.' });
    }
  };

  // Completed is strictly when appointment.status === 'completed' or session.status === 'completed'
  // Incomplete appointments are NEVER blocked — doctor can restart, patient can rejoin
  const isCompleted = appointment?.status === 'completed' || session?.status === 'completed';

  const doctorName = appointment?.doctor?.name?.startsWith('Dr.')
    ? appointment?.doctor?.name
    : `Dr. ${appointment?.doctor?.name || 'Specialist'}`;
  const patientName = appointment?.patient?.name || 'Patient';

  // ─── Completed screen (Only shown when appointment is finalized) ──────────
  if (isCompleted) {
    return (
      <Layout>
        <ActionLoaderModal {...processModal} />
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <div className="glass-panel p-8 rounded-3xl bg-white shadow-xl space-y-5 border border-slate-200">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-sm bg-emerald-50 border border-emerald-200 text-emerald-600">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                Consultation Completed
              </h1>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                {isDoctor
                  ? 'The consultation has been completed. You can now write a prescription for this patient.'
                  : 'Your consultation has ended. Your doctor will issue a prescription shortly.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1.5 max-w-xs mx-auto">
              <div className="flex justify-between"><span className="text-slate-500">Doctor:</span><span className="font-bold">{doctorName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Patient:</span><span className="font-bold">{patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-semibold">{formatAppointmentDate(appointment?.date)}</span></div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {isDoctor && (
                <Link
                  to={`/doctor/prescription/${appointmentId}`}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" /><span>Write Prescription</span>
                </Link>
              )}
              {!isDoctor && (
                <Link
                  to="/patient/prescriptions"
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" /><span>View My Prescriptions</span>
                </Link>
              )}
              <Link
                to={isDoctor ? '/doctor/appointments' : '/patient/appointments'}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" /><span>Back to Appointments</span>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <Layout>
        <div className="min-h-[55vh] flex flex-col items-center justify-center p-6 text-center">
          <div className="relative w-20 h-20 mb-5 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-blue-500/15 animate-ping opacity-60" />
            <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-600 border-r-indigo-500 animate-spin" />
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
              <Activity className="w-6 h-6 animate-pulse" />
            </div>
          </div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight">
            Preparing Consultation Room
          </h2>
          <p className="text-xs text-slate-500 mt-1.5 max-w-sm leading-relaxed">
            Establishing secure encrypted connection with TeleMed clinical servers...
          </p>
          <div className="mt-5 w-44 h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full w-2/3 animate-[pulse_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Patient Waiting Room ─────────────────────────────────────────────────
  if (!isDoctor && (!session || session.status !== 'in-progress')) {
    const isPaused = appointment?.status === 'incomplete';
    return (
      <Layout>
        <ActionLoaderModal {...processModal} />
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
          <div className="text-center space-y-2">
            <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold border ${
              isPaused ? 'bg-amber-50 text-amber-800 border-amber-300' : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
              <span className={`w-2 h-2 rounded-full animate-ping ${isPaused ? 'bg-amber-500' : 'bg-blue-500'}`} />
              <span>{isPaused ? 'Consultation Paused / Rejoining Allowed' : 'Consultation Waiting Room'}</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">
              {isPaused ? `Waiting for ${doctorName} to Resume Call` : `Waiting for ${doctorName}`}
            </h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              {isPaused
                ? 'This consultation was paused or marked incomplete. When your doctor restarts the call, you will be reconnected automatically.'
                : 'Your appointment is confirmed. The video call will start automatically once the doctor begins the consultation.'}
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-card flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-xl flex-shrink-0">
              {doctorName?.replace(/^Dr\.\s*/, '')?.charAt(0) || 'D'}
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">{doctorName}</h3>
              <p className="text-xs font-semibold text-blue-600">{appointment?.doctor?.specialization || 'Consultant Physician'}</p>
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                <span className="flex items-center space-x-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatAppointmentDate(appointment?.date)}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{appointment?.timeSlot?.start} – {appointment?.timeSlot?.end}</span>
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200">Awaiting Doctor</span>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-slate-200 bg-white shadow-card text-center space-y-3">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center">
              <Video className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-sm font-semibold text-slate-700">Video call will launch automatically</p>
            <p className="text-xs text-slate-500">Make sure your camera and microphone are connected and browser permissions are granted.</p>
            <div className="flex items-center justify-center space-x-2 pt-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-semibold text-emerald-700">Checking every 2.5 seconds...</span>
            </div>
          </div>

          <div className="text-center">
            <Link to="/patient/appointments" className="inline-flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-slate-800">
              <ArrowLeft className="w-3.5 h-3.5" /><span>Return to Appointments</span>
            </Link>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── Doctor Pre-Start Workspace ───────────────────────────────────────────
  if (isDoctor && (!session || session.status !== 'in-progress')) {
    const isPaused = appointment?.status === 'incomplete';
    return (
      <Layout>
        <ActionLoaderModal {...processModal} />
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
          {isPaused && (
            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>
                <strong>Consultation Marked Incomplete:</strong> You can restart and re-enter the video consultation call with this patient at any time using the button below.
              </span>
            </div>
          )}

          <div className="glass-panel p-6 rounded-3xl bg-white shadow-card border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                Doctor Consultation Workspace
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-2">Consultation with {patientName}</h1>
              <p className="text-xs text-slate-500 mt-1">
                #{appointmentId?.slice(-6)} · {formatAppointmentDate(appointment?.date)} at {appointment?.timeSlot?.start} – {appointment?.timeSlot?.end}
              </p>
            </div>
            <button
              onClick={startSession}
              disabled={starting}
              className="flex items-center space-x-2 px-6 py-3.5 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all hover:scale-105 disabled:opacity-50 flex-shrink-0"
            >
              {starting ? (
                <><Loader2 className="w-5 h-5 animate-spin" /><span>Activating...</span></>
              ) : (
                <><Video className="w-5 h-5" /><span>{isPaused ? 'Restart / Resume Video Consultation' : 'Start Live Video Consultation'}</span></>
              )}
            </button>
          </div>

          <div className="glass-card p-6 rounded-3xl border border-slate-200 bg-white shadow-card space-y-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <User className="w-4 h-4 text-blue-600" /><span>Patient Profile & Case Details</span>
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Patient Name</span>
                <span className="font-bold text-slate-800 text-sm">{patientName}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Gender</span>
                <span className="font-bold text-slate-800 text-sm capitalize">{appointment?.patient?.gender || '—'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Blood Group</span>
                <span className="font-bold text-rose-600 text-sm">{appointment?.patient?.bloodGroup || '—'}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Phone</span>
                <span className="font-bold text-slate-800 text-sm">{appointment?.patient?.phone || '—'}</span>
              </div>
            </div>
            {appointment?.symptoms && (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 text-xs">
                <span className="font-bold text-blue-900 block mb-1">Chief Complaint & Symptoms:</span>
                <p className="text-slate-700 leading-relaxed text-sm">{appointment.symptoms}</p>
              </div>
            )}
            <div className="pt-2 flex justify-between items-center text-xs text-slate-500 border-t border-slate-100">
              <span>Fee: ₹{appointment?.doctor?.consultationFee || 300} · Status: Confirmed</span>
              <Link to="/doctor/appointments" className="text-xs font-bold text-slate-500 hover:text-slate-800 flex items-center space-x-1">
                <ArrowLeft className="w-3.5 h-3.5" /><span>Back to Schedule</span>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // ─── ACTIVE CONSULTATION ROOM ─────────────────────────────────────────────
  return (
    <Layout>
      <ActionLoaderModal {...processModal} />
      <div className="space-y-4 max-w-7xl mx-auto px-2">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Room Header */}
        <div className="glass-panel p-4 rounded-2xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg font-bold text-slate-900">TeleMed Live Consultation Room</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {isDoctor ? 'Doctor Workspace' : 'Patient View'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Appointment #{appointmentId?.slice(-6)} · {doctorName} with {patientName}
            </p>
          </div>
          <div className="flex items-center space-x-2.5">
            {isDoctor && (
              <Link
                to={`/doctor/prescription/${appointmentId}`}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                <FileText className="w-3.5 h-3.5" /><span>e-Prescription</span>
              </Link>
            )}
            <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>HD Connected</span>
            </div>
            {session && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-mono font-bold border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{formatTime(elapsed)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* ── Left 2/3: Video + Controls ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Native TeleMed WebRTC Video Viewport (Unlimited Session Duration - Max 1+ Hr) */}
            <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl relative flex items-center justify-center" style={{ height: '520px' }}>
              {/* Remote Video (Full Size) */}
              <video
                ref={remoteVideoRef}
                autoPlay
                playsInline
                className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${peerConnected ? 'opacity-100' : 'opacity-0'}`}
              />

              {/* Waiting for peer overlay */}
              {!peerConnected && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-slate-900 to-slate-950 text-slate-300 p-6 text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-blue-600/10 border-2 border-blue-500/30 flex items-center justify-center text-blue-400 font-black text-2xl shadow-xl shadow-blue-500/10 animate-pulse">
                    {(isDoctor ? patientName : doctorName)?.replace(/^Dr\.\s*/, '')?.charAt(0) || 'U'}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-white">
                      {isDoctor ? patientName : doctorName}
                    </h3>
                    <p className="text-xs text-blue-400 font-semibold flex items-center justify-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                      <span>{isDoctor ? 'Waiting for patient to connect audio/video...' : 'Waiting for doctor to connect audio/video...'}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>TeleMed Direct HD WebRTC · Unlimited Duration (Full 1 hr)</span>
                  </div>
                </div>
              )}

              {/* Floating Local Video Picture-in-Picture */}
              <div className="absolute bottom-4 right-4 w-44 h-32 rounded-2xl overflow-hidden shadow-2xl border-2 border-white/30 bg-slate-900 z-10 transition-transform hover:scale-105">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${camOn ? 'block' : 'hidden'}`}
                />
                {!camOn && (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                    <VideoOff className="w-6 h-6 text-slate-500" />
                    <span className="text-[10px] font-bold mt-1">Camera Off</span>
                  </div>
                )}
                <div className="absolute bottom-1.5 left-2 px-2 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-bold">
                  You ({isDoctor ? 'Doctor' : 'Patient'}) {!micOn && ' 🔇'}
                </div>
              </div>

              {/* Top Left Session Info Badge */}
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white text-xs font-semibold border border-white/15">
                  <span className={`w-2 h-2 rounded-full ${peerConnected ? 'bg-emerald-500' : 'bg-amber-400 animate-pulse'}`} />
                  <span>{peerConnected ? 'HD Live Stream' : 'Connecting'}</span>
                </div>
                <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-emerald-400 text-xs font-mono font-bold border border-white/15">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatTime(elapsed)}</span>
                </div>
              </div>

              {/* Top Right Dedicated Window Launcher (Jitsi Backup) */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  type="button"
                  onClick={() => {
                    const roomName = ('telemed' + appointmentId).toLowerCase().replace(/[^a-z0-9]/g, '');
                    const dName = isDoctor ? doctorName : patientName;
                    window.open(`https://meet.jit.si/${roomName}#userInfo.displayName="${encodeURIComponent(dName)}"`, '_blank');
                  }}
                  className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-black/60 backdrop-blur-md text-white/90 hover:text-white text-[11px] font-bold border border-white/15 hover:bg-black/80 transition-all shadow-sm"
                  title="Open external Jitsi window in new tab (unrestricted, no 5-min embed cap)"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Open Dedicated Window</span>
                </button>
              </div>
            </div>

            {/* Video Controls */}
            <div className="glass-panel p-3.5 rounded-2xl bg-white flex flex-wrap items-center justify-between gap-3 shadow-card">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMic}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${micOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}
                  title={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-rose-600" />}
                </button>
                <button
                  onClick={toggleCam}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${camOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}
                  title={camOn ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4 text-rose-600" />}
                </button>
                <button
                  onClick={toggleScreenShare}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${isScreenSharing ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                  title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
                >
                  <ScreenShare className="w-4 h-4" />
                </button>
                <button
                  onClick={handleReconnect}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
                  title="Reconnect HD video connection"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" /><span>Reconnect Video</span>
                </button>
                {/* Patient Audio Capture toggle — doctor only */}
                {isDoctor && remoteStream && (
                  <button
                    onClick={togglePatientAudioCapture}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                      isPatientAudioActive
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-300 animate-pulse'
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                    title={isPatientAudioActive ? t('Stop patient audio AI transcription') : t('Start patient audio AI transcription')}
                    disabled={patientAudioError && !isPatientAudioActive}
                  >
                    {isPatientAudioActive
                      ? <><Square className="w-3.5 h-3.5" /><span>{t('Stop AI Listen')}</span></>
                      : <><Radio className="w-3.5 h-3.5" /><span>{t('AI Listen (Patient)')}</span></>
                    }
                  </button>
                )}
                {isDoctor && !remoteStream && (
                  <button
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-400 bg-slate-50 border-slate-200 cursor-not-allowed"
                    title={t('Waiting for patient to join...')}
                    disabled
                  >
                    <Radio className="w-3.5 h-3.5" /><span>{t('AI Listen (Patient)')}</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {isDoctor ? (
                  <>
                    <button
                      onClick={runMlPrediction}
                      disabled={mlLoading}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
                      title="Run ML disease prediction on symptoms, notes and speech"
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>{mlLoading ? 'Analyzing...' : 'AI Diagnosis'}</span>
                    </button>
                    <button
                      onClick={markAsCompleted}
                      disabled={ending}
                      className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>{ending ? 'Completing...' : 'Complete & Prescribe'}</span>
                    </button>
                    <button
                      onClick={markAsIncomplete}
                      disabled={ending}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="w-3.5 h-3.5" /><span>Incomplete</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => { stopNativeCall(); navigate('/patient/dashboard'); }}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <PhoneOff className="w-4 h-4 text-rose-600" /><span>Leave Call</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── Patient Audio Transcript Panel (doctor + patient audio) ── */}
            {isDoctor && (isPatientAudioActive || patientTranscript) && (
              <div className="glass-panel rounded-2xl bg-white shadow-card border border-emerald-100 overflow-hidden">
                <div className="px-4 py-2.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    {isPatientAudioActive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping flex-shrink-0" />}
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-900">
                      {isPatientAudioActive ? t('Patient Audio Capture — AI is transcribing...') : t('Patient Transcript (Captured)')}
                    </span>
                    <span className="text-[10px] text-emerald-600 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
                      {patientTranscript.split(/\s+/).filter(Boolean).length} {t('words')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <label className="flex items-center space-x-1.5 cursor-pointer">
                      <span className="text-[11px] font-semibold text-slate-500">{t('Auto-diagnose')}</span>
                      <div
                        onClick={() => setAutoAnalyze(p => !p)}
                        className={`w-8 h-4 rounded-full transition-colors cursor-pointer ${autoAnalyze ? 'bg-purple-500' : 'bg-slate-300'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full shadow mt-0.5 transition-transform ${autoAnalyze ? 'translate-x-4' : 'translate-x-1'}`} />
                      </div>
                    </label>
                    <button onClick={() => { setSpeechKeywords([]); }} className="text-xs text-slate-400 hover:text-slate-600 font-semibold">{t('Clear Keywords')}</button>
                  </div>
                </div>

                <div className="p-3 space-y-2">
                  {/* Patient transcript from backend */}
                  {patientTranscript && (
                    <div className="max-h-24 overflow-y-auto">
                      <p className="text-xs text-slate-700 leading-relaxed">{patientTranscript}</p>
                    </div>
                  )}

                  {/* Detected medical keywords */}
                  {speechKeywords.length > 0 && (
                    <div className="pt-1 border-t border-slate-100">
                      <div className="flex items-center space-x-1.5 mb-1.5">
                        <Zap className="w-3 h-3 text-purple-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('Detected Medical Keywords')}</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {speechKeywords.map((kw, i) => (
                          <span key={i} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {autoAnalyze && isPatientAudioActive && (
                    <p className="text-[10px] text-slate-400 flex items-center space-x-1">
                      <Brain className="w-3 h-3 text-purple-400" />
                      <span>AI diagnosis updates automatically 4 seconds after each patient speech segment</span>
                    </p>
                  )}
                  
                  {patientAudioError && (
                    <p className="text-xs text-rose-500 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{patientAudioError}</span>
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ML Disease Prediction Panel */}
            {isDoctor && showMlPanel && (
              <div className="glass-panel rounded-2xl bg-white shadow-card border border-purple-100 overflow-hidden">
                <div className="px-4 py-3 bg-purple-50 border-b border-purple-100 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Brain className="w-4 h-4 text-purple-600" />
                    <span className="text-sm font-bold text-purple-900">TeleMed-SymptomNet AI — Disease Prediction</span>
                  </div>
                  <button onClick={() => setShowMlPanel(false)} className="text-xs text-slate-400 hover:text-slate-600">✕ Close</button>
                </div>

                {mlLoading && (
                  <div className="p-6 text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-purple-500 mx-auto mb-2" />
                    <p className="text-sm text-slate-600">Analyzing symptoms, clinical notes, and consultation transcript...</p>
                  </div>
                )}

                {mlError && !mlLoading && (
                  <div className="p-4 text-center space-y-2">
                    <AlertCircle className="w-8 h-8 text-amber-500 mx-auto" />
                    <p className="text-sm font-semibold text-amber-800">{mlError}</p>
                    <button
                      onClick={() => { setMlError(null); runMlPrediction(); }}
                      className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-1 mx-auto"
                    >
                      <RefreshCw className="w-3 h-3" /><span>Retry Analysis</span>
                    </button>
                  </div>
                )}

                {!mlLoading && mlPredictions && (
                  <div className="p-4 space-y-4">
                    {mlPredictions.predictions?.length > 0 ? (
                      <>
                        <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                          <Zap className="w-3.5 h-3.5 text-purple-500" />
                          <span>Based on {mlPredictions.corpusWordCount} words analyzed · {mlPredictions.model}</span>
                        </div>

                        <div className="space-y-3">
                          {mlPredictions.predictions.map((p, i) => (
                            <div key={i} className={`p-3.5 rounded-xl border ${i === 0 ? 'bg-purple-50 border-purple-200' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${i === 0 ? 'bg-purple-200 text-purple-800' : 'bg-slate-200 text-slate-700'}`}>
                                      #{p.rank}
                                    </span>
                                    <span className="text-sm font-bold text-slate-900">{p.disease}</span>
                                  </div>
                                  <div className="text-[11px] text-slate-500 mt-0.5">ICD-10: <span className="font-mono font-bold text-blue-700">{p.icd10Code}</span></div>
                                </div>
                                <div className="flex-shrink-0 text-right">
                                  <div className={`text-lg font-black ${i === 0 ? 'text-purple-700' : 'text-slate-600'}`}>
                                    {p.confidence}%
                                  </div>
                                  <div className="text-[10px] text-slate-400">confidence</div>
                                </div>
                              </div>

                              {/* Confidence bar */}
                              <div className="mt-2 w-full bg-slate-200 rounded-full h-1.5">
                                <div
                                  className={`h-1.5 rounded-full ${i === 0 ? 'bg-purple-500' : 'bg-slate-400'}`}
                                  style={{ width: `${p.confidence}%` }}
                                />
                              </div>

                              {p.matchedSymptoms?.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {p.matchedSymptoms.map((kw, j) => (
                                    <span key={j} className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                                      {kw}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>

                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2">
                          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                          <p className="text-[11px] text-amber-800">{mlPredictions.disclaimer}</p>
                        </div>

                        <button
                          onClick={runMlPrediction}
                          className="text-xs font-bold text-purple-600 hover:text-purple-800 flex items-center space-x-1"
                        >
                          <RefreshCw className="w-3 h-3" /><span>Re-analyze with latest notes</span>
                        </button>
                      </>
                    ) : (
                      <div className="p-4 text-center space-y-2">
                        <TrendingUp className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-semibold text-slate-600">{mlPredictions.message}</p>
                        <p className="text-xs text-slate-400">{mlPredictions.analysisNote}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Right 1/3: Chat + Notes + Summary ── */}
          <div className="space-y-4 flex flex-col h-full">
            <div className="glass-panel rounded-2xl bg-white shadow-card flex flex-col" style={{ height: '520px' }}>
              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 p-2 gap-1 bg-slate-50/60 rounded-t-2xl">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'chat' ? 'bg-white text-blue-700 shadow-xs border border-blue-100' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Live Chat</span>
                  {messages.length > 0 && (
                    <span className="ml-1 px-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px]">{messages.length}</span>
                  )}
                </button>
                {isDoctor && (
                  <button
                    onClick={() => setActiveTab('notes')}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'notes' ? 'bg-white text-blue-700 shadow-xs border border-blue-100' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    <FileText className="w-3.5 h-3.5" /><span>Clinical Notes</span>
                  </button>
                )}
              </div>

              {/* Chat Tab */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col p-3 overflow-hidden">
                  <div ref={chatContainerRef} className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4">
                        <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-600">No messages yet</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Type below to chat with the {isDoctor ? 'patient' : 'doctor'}</p>
                      </div>
                    ) : (
                      messages.map((msg, i) => {
                        const isMe = msg.senderId === user?._id || msg.senderRole === user?.role;
                        return (
                          <div key={i} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">
                              {msg.senderName} ({msg.senderRole === 'doctor' ? 'Doctor' : 'Patient'})
                            </span>
                            <div className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}`}>
                              {msg.text}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                  </div>
                  <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="text"
                      disabled={!session}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={session ? 'Type a message...' : 'Session not started'}
                      className="glass-input flex-1 px-3 py-2 rounded-xl text-xs bg-white disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!session || !chatInput.trim() || sendingMsg}
                      className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              )}

              {/* Clinical Notes Tab (Doctor only) */}
              {activeTab === 'notes' && isDoctor && (
                <div className="flex-1 flex flex-col p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Live Observation & Diagnosis</span>
                    <Link to={`/doctor/prescription/${appointmentId}`} className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1">
                      <span>Prescription</span><ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <textarea
                    rows={10}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Document symptoms, vital signs, and diagnostic conclusions... These notes feed into AI diagnosis."
                    className="glass-input w-full p-2.5 rounded-xl text-xs bg-white resize-none flex-1"
                  />
                  <button
                    onClick={runMlPrediction}
                    disabled={mlLoading}
                    className="flex items-center justify-center space-x-2 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
                  >
                    <Brain className="w-3.5 h-3.5" />
                    <span>{mlLoading ? 'Analyzing symptoms...' : 'Run AI Diagnosis on Notes'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Appointment Summary */}
            <div className="glass-panel p-3.5 rounded-2xl bg-white shadow-card text-xs space-y-1.5">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isDoctor ? 'Patient' : 'Doctor'}</span>
                <span className="font-bold text-slate-900">{isDoctor ? patientName : doctorName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Date</span>
                <span className="font-semibold text-slate-800">{formatAppointmentDate(appointment?.date)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Time</span>
                <span className="font-semibold text-slate-800">{appointment?.timeSlot?.start} – {appointment?.timeSlot?.end}</span>
              </div>
              {appointment?.symptoms && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-0.5">Symptoms:</span>
                  <p className="p-2 rounded-xl bg-blue-50/50 text-slate-800 text-[11px] border border-blue-100">{appointment.symptoms}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
