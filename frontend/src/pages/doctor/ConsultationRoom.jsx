import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, AlertTriangle, 
  Loader2, User, FileText, Clock, RefreshCw, Send, MessageSquare, 
  ExternalLink, CheckCircle, Stethoscope, ArrowLeft, XCircle, Calendar,
  Brain, TrendingUp, AlertCircle, Zap
} from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { formatAppointmentDate } from '../../utils/dateUtils';

export default function ConsultationRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const isDoctor = user?.role === 'doctor';

  const [appointment, setAppointment] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [notes, setNotes] = useState('');
  const [alert, setAlert] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState('chat');

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  // ML Disease Prediction state
  const [mlPredictions, setMlPredictions] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [showMlPanel, setShowMlPanel] = useState(false);

  // Jitsi state
  const jitsiApiRef = useRef(null);
  const jitsiMountedRef = useRef(false);

  const timerRef = useRef(null);
  const chatContainerRef = useRef(null);
  const pollingRef = useRef(null);
  const sessionRef = useRef(null);

  // Keep sessionRef in sync
  useEffect(() => { sessionRef.current = session; }, [session]);

  // ─── Load Jitsi Script ──────────────────────────────────────────────────────
  const loadJitsiScript = () => {
    return new Promise((resolve) => {
      if (window.JitsiMeetExternalAPI) { resolve(true); return; }
      const existing = document.getElementById('jitsi-external-api-script');
      if (existing) {
        const wait = setInterval(() => {
          if (window.JitsiMeetExternalAPI) { clearInterval(wait); resolve(true); }
        }, 100);
        return;
      }
      const script = document.createElement('script');
      script.id = 'jitsi-external-api-script';
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  // ─── Mount Jitsi (Two-way video — Jitsi handles BOTH cameras internally) ──
  const mountJitsi = useCallback(async (targetSession) => {
    if (jitsiMountedRef.current) return;

    const sess = targetSession || sessionRef.current;
    if (!sess || sess.status !== 'in-progress') return;

    const loaded = await loadJitsiScript();
    if (!loaded || !window.JitsiMeetExternalAPI) {
      setAlert({ type: 'error', message: 'Failed to load video engine. Please check your internet connection.' });
      return;
    }

    const container = document.getElementById('jitsi-video-container');
    if (!container) return;

    // Dispose any stale instance
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
    }

    container.innerHTML = '';

    // Unique room per appointment — same room name for doctor and patient ensures two-way
    const roomName = 'TeleMed-Hospital-Appt-' + appointmentId;

    try {
      const jApi = new window.JitsiMeetExternalAPI('meet.jit.si', {
        roomName,
        width: '100%',
        height: '100%',
        parentNode: container,
        userInfo: {
          displayName: isDoctor
            ? (user?.name?.startsWith('Dr.') ? user.name : 'Dr. ' + user?.name)
            : (user?.name || 'Patient'),
          email: user?.email || ''
        },
        configOverwrite: {
          // Both participants start with audio and video ON
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          // Skip the pre-join/lobby screen — go straight into the call
          prejoinPageEnabled: false,
          prejoinConfig: { enabled: false },
          // Disable lobby so both sides join immediately into the same room
          lobby: { autoKnock: false, enableChat: false },
          // Show tiles side-by-side by default
          defaultLocalDisplayName: isDoctor ? 'Doctor' : 'Patient',
          disableDeepLinking: true,
          enableClosePage: false,
          // Essential: allow both participants to share cameras
          resolution: 720,
          constraints: {
            video: { height: { ideal: 720, max: 720, min: 240 } }
          },
          // Tile view shows both cameras side by side
          tileView: { numberOfVisibleTiles: 2 },
          filmstrip: { disableResizable: false },
          // Audio settings
          enableNoAudioDetection: true,
          enableNoisyMicDetection: true,
          // No watermarks
          disableRemoteMute: false,
        },
        interfaceConfigOverwrite: {
          SHOW_JITSI_WATERMARK: false,
          SHOW_WATERMARK_FOR_GUESTS: false,
          SHOW_BRAND_WATERMARK: false,
          SHOW_POWERED_BY: false,
          BRAND_WATERMARK_LINK: '',
          // Show only essential toolbar buttons
          TOOLBAR_BUTTONS: [
            'camera',
            'microphone',
            'tileview',
            'hangup',
            'chat',
            'settings',
            'desktop',
            'fullscreen'
          ],
          // Show tile view by default so both cameras are visible side-by-side
          INITIAL_TOOLBAR_TIMEOUT: 20000,
          TOOLBAR_ALWAYS_VISIBLE: false,
          DEFAULT_BACKGROUND: '#1e293b',
          DEFAULT_REMOTE_DISPLAY_NAME: isDoctor ? 'Patient' : 'Doctor',
          APP_NAME: 'TeleMed Consultation',
          NATIVE_APP_NAME: 'TeleMed',
          LANG_DETECTION: false,
          CONNECTION_INDICATOR_DISABLED: false,
          VIDEO_QUALITY_LABEL_DISABLED: false,
        }
      });

      jitsiApiRef.current = jApi;
      jitsiMountedRef.current = true;

      // Auto-enable tile view after mount to show both cameras side-by-side
      jApi.addEventListener('videoConferenceJoined', () => {
        setTimeout(() => {
          try {
            jApi.executeCommand('setTileView', true);
          } catch {}
        }, 1500);
      });

      // Handle call end
      jApi.addEventListener('readyToClose', () => {
        if (isDoctor) {
          markAsCompleted();
        } else {
          stopJitsi();
          navigate('/patient/appointments');
        }
      });

    } catch (e) {
      console.error('Jitsi mount error:', e);
      setAlert({ type: 'error', message: 'Video engine failed to start. Please refresh the page.' });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId, isDoctor, user]);

  // ─── Dispose Jitsi ─────────────────────────────────────────────────────────
  const stopJitsi = () => {
    if (jitsiApiRef.current) {
      try { jitsiApiRef.current.dispose(); } catch {}
      jitsiApiRef.current = null;
      jitsiMountedRef.current = false;
    }
  };

  // ─── Toggle mic via Jitsi API ──────────────────────────────────────────────
  const toggleMic = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleAudio');
    }
    setMicOn(prev => !prev);
  };

  // ─── Toggle cam via Jitsi API ──────────────────────────────────────────────
  const toggleCam = () => {
    if (jitsiApiRef.current) {
      jitsiApiRef.current.executeCommand('toggleVideo');
    }
    setCamOn(prev => !prev);
  };

  // ─── Reload video (re-mount Jitsi) ────────────────────────────────────────
  const handleReconnect = () => {
    jitsiMountedRef.current = false;
    stopJitsi();
    setTimeout(() => mountJitsi(sessionRef.current), 500);
    setAlert({ type: 'info', message: 'Reconnecting video call...' });
    setTimeout(() => setAlert(null), 3000);
  };

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

        if (['completed', 'incomplete'].includes(appt.status)) {
          setLoading(false);
          return;
        }

        const sess = sessionRes.data?.session;
        if (sess) {
          setSession(sess);
          sessionRef.current = sess;
          setMessages(sess.messages || []);
          if (sess.consultationNotes) setNotes(sess.consultationNotes);

          if (sess.status === 'completed') { setLoading(false); return; }

          if (sess.startedAt) {
            setElapsed(Math.max(0, Math.floor((Date.now() - new Date(sess.startedAt)) / 1000)));
          }

          timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
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
      stopJitsi();
      clearInterval(timerRef.current);
      clearInterval(pollingRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appointmentId]);

  // ─── Mount Jitsi when session becomes in-progress ─────────────────────────
  useEffect(() => {
    if (session?.status === 'in-progress' && !jitsiMountedRef.current) {
      const t = setTimeout(() => mountJitsi(session), 500);
      return () => clearTimeout(t);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.status, session?._id]);

  // ─── Patient waiting room: poll until doctor starts ───────────────────────
  useEffect(() => {
    if (isDoctor || session) return;

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

    return () => clearInterval(poll);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDoctor, session, appointmentId]);

  // ─── Poll for new messages when session is active ─────────────────────────
  useEffect(() => {
    if (!session?._id || session?.status === 'completed') return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/consultation/${session._id}`);
        if (res.data?.session?.messages) {
          setMessages(res.data.session.messages);
        }
        if (res.data?.session?.status === 'completed') {
          setSession(res.data.session);
          stopJitsi();
        }
      } catch {}
    }, 3000);

    return () => clearInterval(pollingRef.current);
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
    try {
      const res = await api.post('/consultation/start', { appointmentId });
      const sess = res.data.session;
      setSession(sess);
      sessionRef.current = sess;
      setMessages(sess.messages || []);
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      setAlert({ type: 'success', message: 'Live consultation started. Video connecting...' });
      setTimeout(() => mountJitsi(sess), 400);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to start consultation.' });
    } finally {
      setStarting(false);
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
    setMlLoading(true);
    setShowMlPanel(true);
    try {
      const chatTranscript = messages.map(m => ({ text: m.text || '' }));
      const res = await api.post('/consultation/predict-disease', {
        symptoms: appointment?.symptoms || '',
        clinicalNotes: notes,
        chatTranscript
      });
      setMlPredictions(res.data);
    } catch (err) {
      setAlert({ type: 'error', message: 'ML prediction failed: ' + (err.response?.data?.message || 'Server error') });
    } finally {
      setMlLoading(false);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Doctor: Mark as Completed ────────────────────────────────────────────
  const markAsCompleted = async () => {
    setEnding(true);
    try {
      if (session?._id) {
        await api.post(`/consultation/${session._id}/end`, {
          consultationNotes: notes,
          duration: Math.floor(elapsed / 60) || 1
        });
      }
      await api.patch(`/appointments/${appointmentId}/status`, { status: 'completed' });
      clearInterval(timerRef.current);
      stopJitsi();
      navigate(`/prescription/appointment/${appointmentId}`);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to complete consultation.' });
    } finally {
      setEnding(false);
    }
  };

  // ─── Doctor: Mark as Incomplete ───────────────────────────────────────────
  const markAsIncomplete = async () => {
    if (!window.confirm('Mark this consultation as incomplete?')) return;
    setEnding(true);
    try {
      await api.patch(`/appointments/${appointmentId}/status`, { status: 'incomplete' });
      clearInterval(timerRef.current);
      stopJitsi();
      navigate('/doctor/appointments');
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update status.' });
    } finally {
      setEnding(false);
    }
  };

  const isCompleted = appointment?.status === 'completed' || session?.status === 'completed';
  const isIncomplete = appointment?.status === 'incomplete';

  const doctorName = appointment?.doctor?.name?.startsWith('Dr.')
    ? appointment?.doctor?.name
    : `Dr. ${appointment?.doctor?.name || 'Specialist'}`;
  const patientName = appointment?.patient?.name || 'Patient';

  // ─── Completed / Incomplete screen ───────────────────────────────────────
  if (isCompleted || isIncomplete) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <div className="glass-panel p-8 rounded-3xl bg-white shadow-xl space-y-5 border border-slate-200">
            <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mx-auto shadow-sm ${
              isCompleted ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-amber-50 border border-amber-200 text-amber-600'
            }`}>
              {isCompleted ? <CheckCircle className="w-8 h-8" /> : <AlertTriangle className="w-8 h-8" />}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900">
                {isCompleted ? 'Consultation Completed' : 'Consultation Marked Incomplete'}
              </h1>
              <p className="text-sm text-slate-500 mt-2 max-w-sm mx-auto">
                {isCompleted
                  ? 'This appointment has been concluded. View your e-prescription below.'
                  : 'This session was marked incomplete. Please reschedule if needed.'}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1.5 max-w-xs mx-auto">
              <div className="flex justify-between"><span className="text-slate-500">Doctor:</span><span className="font-bold">{doctorName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Patient:</span><span className="font-bold">{patientName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Date:</span><span className="font-semibold">{formatAppointmentDate(appointment?.date)}</span></div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {isCompleted && (
                <Link
                  to={`/prescription/appointment/${appointmentId}`}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center space-x-2"
                >
                  <FileText className="w-4 h-4" /><span>View e-Prescription</span>
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
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  // ─── Patient Waiting Room ─────────────────────────────────────────────────
  if (!isDoctor && (!session || session.status !== 'in-progress')) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Consultation Waiting Room</span>
            </div>
            <h1 className="text-2xl font-black text-slate-900">Waiting for {doctorName}</h1>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              Your appointment is confirmed. The video call will start automatically once the doctor begins the consultation.
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
    return (
      <Layout>
        <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
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
              {starting ? <><Loader2 className="w-5 h-5 animate-spin" /><span>Activating...</span></> : <><Video className="w-5 h-5" /><span>Start Live Video Consultation</span></>}
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

            {/* Jitsi Video Container — Jitsi renders BOTH cameras side-by-side automatically */}
            <div className="w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-xl relative" style={{ height: '520px' }}>
              <div id="jitsi-video-container" className="w-full h-full" />

              {/* Overlay hint for first-timers */}
              {jitsiMountedRef.current === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 text-slate-400 space-y-3">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                  <p className="text-sm font-semibold">Connecting video call...</p>
                  <p className="text-xs text-slate-500">Both cameras will appear side-by-side once connected</p>
                </div>
              )}
            </div>

            {/* Video Controls */}
            <div className="glass-panel p-3.5 rounded-2xl bg-white flex flex-wrap items-center justify-between gap-3 shadow-card">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMic}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${micOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}
                  title={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleCam}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${camOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'}`}
                  title={camOn ? 'Turn Off Camera' : 'Turn On Camera'}
                >
                  {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={handleReconnect}
                  className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-all"
                  title="Reload video connection"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" /><span>Reload Video</span>
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {isDoctor ? (
                  <>
                    <button
                      onClick={runMlPrediction}
                      disabled={mlLoading}
                      className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 transition-colors disabled:opacity-50"
                      title="Run ML disease prediction on symptoms and notes"
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
                    onClick={() => { stopJitsi(); navigate('/patient/dashboard'); }}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <PhoneOff className="w-4 h-4 text-rose-600" /><span>Leave Call</span>
                  </button>
                )}
              </div>
            </div>

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
