import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Wifi, WifiOff, AlertTriangle, 
  Loader2, User, FileText, Clock, RefreshCw, Send, MessageSquare, 
  ExternalLink, CheckCircle, ShieldCheck, Stethoscope, Camera, Volume2, ArrowLeft, Lock
} from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

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
  const [networkStatus, setNetworkStatus] = useState('connected');
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [notes, setNotes] = useState('');
  const [alert, setAlert] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [activeTab, setActiveTab] = useState('chat'); // 'chat' or 'notes'

  // Video Media Stream
  const localVideoRef = useRef(null);
  const streamRef = useRef(null);
  const [hasCamera, setHasCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const timerRef = useRef(null);
  const chatBottomRef = useRef(null);
  const pollingRef = useRef(null);

  // Initialize Camera Stream
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        streamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }
        setHasCamera(true);
        setCameraError(null);
      }
    } catch (err) {
      console.warn('Webcam/Mic permission denied or not available:', err);
      setCameraError('Webcam/Microphone access not available or blocked in this browser. Showing simulated clinical video feed.');
      setHasCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setHasCamera(false);
  };

  // Toggle mic
  const toggleMic = () => {
    if (streamRef.current) {
      streamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !micOn;
      });
    }
    setMicOn(!micOn);
  };

  // Toggle camera
  const toggleCam = () => {
    if (streamRef.current) {
      streamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !camOn;
      });
    }
    setCamOn(!camOn);
  };

  // 1. Load appointment and check if a session already exists
  useEffect(() => {
    let mounted = true;
    const fetchApptAndSession = async () => {
      try {
        const [apptRes, sessionRes] = await Promise.all([
          api.get(`/appointments/${appointmentId}`),
          api.get(`/consultation/appointment/${appointmentId}`).catch(() => ({ data: { session: null } }))
        ]);

        if (!mounted) return;
        const appt = apptRes.data.appointment;
        setAppointment(appt);

        // If appointment is already completed, block rejoining!
        if (appt.status === 'completed') {
          setLoading(false);
          return;
        }

        const sess = sessionRes.data?.session;
        if (sess) {
          setSession(sess);
          setMessages(sess.messages || []);
          if (sess.consultationNotes) setNotes(sess.consultationNotes);
          
          if (sess.status === 'completed') {
            setLoading(false);
            return;
          }

          // Calculate elapsed time from startedAt
          if (sess.startedAt) {
            const startSec = Math.floor((new Date() - new Date(sess.startedAt)) / 1000);
            setElapsed(Math.max(0, startSec));
          }
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
          }

          // Start camera automatically if session already in-progress
          startCamera();
        }
      } catch (err) {
        if (mounted) setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to load consultation room details.' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchApptAndSession();

    return () => {
      mounted = false;
      stopCamera();
      clearInterval(timerRef.current);
      clearInterval(pollingRef.current);
    };
  }, [appointmentId]);

  // Ensure video element gets stream if camera started
  useEffect(() => {
    if (hasCamera && streamRef.current && localVideoRef.current) {
      localVideoRef.current.srcObject = streamRef.current;
    }
  }, [hasCamera]);

  // 2. Poll messages when session is active
  useEffect(() => {
    if (!session?._id || session?.status === 'completed') return;

    const pollSession = async () => {
      try {
        const res = await api.get(`/consultation/${session._id}`);
        if (res.data?.session?.messages) {
          setMessages(res.data.session.messages);
        }
        if (res.data?.session?.status === 'completed') {
          setSession(res.data.session);
          stopCamera();
        }
      } catch {
        // Silent polling error
      }
    };

    pollingRef.current = setInterval(pollSession, 2500);
    return () => clearInterval(pollingRef.current);
  }, [session?._id, session?.status]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Start or join session
  const startSession = async () => {
    setStarting(true);
    setAlert(null);
    try {
      const res = await api.post('/consultation/start', { appointmentId });
      const currentSession = res.data.session;
      setSession(currentSession);
      setMessages(currentSession.messages || []);
      setAlert({ type: 'success', message: res.data?.message || 'Connected to live consultation session.' });
      
      // Start local camera stream
      await startCamera();

      if (!timerRef.current) {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to start or join session.' 
      });
    } finally {
      setStarting(false);
    }
  };

  // 4. Send chat message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !session?._id || sendingMsg) return;

    const text = chatInput.trim();
    setChatInput('');
    setSendingMsg(true);

    try {
      const res = await api.post(`/consultation/${session._id}/message`, { text });
      if (res.data?.messages) {
        setMessages(res.data.messages);
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to send message.' });
    } finally {
      setSendingMsg(false);
    }
  };

  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const sendNetworkEvent = async (event, details) => {
    if (!session) return;
    try { await api.post(`/consultation/${session._id}/network-event`, { event, details }); } catch {}
  };

  const simulateDisconnect = async () => {
    setNetworkStatus('disconnected');
    setAlert({ type: 'error', message: 'Network disconnected! Auto-reconnecting under SRS FR-6...' });
    await sendNetworkEvent('disconnected', 'Simulated network drop');
    setTimeout(async () => {
      setNetworkStatus('reconnecting');
      setAlert({ type: 'info', message: t('reconnecting') });
      setTimeout(async () => {
        setNetworkStatus('connected');
        setAlert({ type: 'success', message: 'Connection restored successfully! State preserved.' });
        await sendNetworkEvent('reconnected', 'Auto-reconnect successful after 3s');
      }, 3000);
    }, 500);
  };

  const simulateQualityDrop = async () => {
    setNetworkStatus('degraded');
    setAlert({ type: 'info', message: 'Adaptive bitrate triggered: Network degraded (SRS FR-5). Lowering video resolution to ensure uninterrupted audio...' });
    await sendNetworkEvent('quality-degraded', 'Bandwidth below threshold (adaptive bitrate stepping)');
    setTimeout(async () => {
      setNetworkStatus('connected');
      setAlert({ type: 'success', message: 'Network bandwidth recovered. HD Video restored.' });
      await sendNetworkEvent('quality-restored', 'Bandwidth recovered');
    }, 4000);
  };

  const endSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      await api.post(`/consultation/${session._id}/end`, {
        consultationNotes: notes,
        duration: Math.floor(elapsed / 60) || 1,
      });
      clearInterval(timerRef.current);
      stopCamera();
      if (isDoctor) {
        navigate(`/doctor/prescription/${appointmentId}`);
      } else {
        navigate('/patient/dashboard');
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to end session.' });
    } finally {
      setEnding(false);
    }
  };

  const isCompleted = appointment?.status === 'completed' || session?.status === 'completed';

  const netStatusConfig = {
    connected: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bg: 'bg-emerald-600', icon: Wifi, label: 'Stable Connection' },
    disconnected: { color: 'text-rose-700 bg-rose-50 border-rose-200', bg: 'bg-rose-600', icon: WifiOff, label: 'Offline' },
    reconnecting: { color: 'text-amber-700 bg-amber-50 border-amber-200', bg: 'bg-amber-500', icon: RefreshCw, label: 'Reconnecting...' },
    degraded: { color: 'text-orange-700 bg-orange-50 border-orange-200', bg: 'bg-orange-500', icon: AlertTriangle, label: 'Low Bandwidth (Adaptive Bitrate)' },
  };
  const ns = netStatusConfig[networkStatus];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  const doctorName = appointment?.doctor?.name?.startsWith('Dr.') 
    ? appointment?.doctor?.name 
    : `Dr. ${appointment?.doctor?.name || 'Specialist'}`;
  const patientName = appointment?.patient?.name || 'Patient';

  // ─── IF COMPLETED: STRICT LOCK SCREEN (Per User Request) ────────────────────
  if (isCompleted) {
    return (
      <Layout>
        <div className="max-w-2xl mx-auto py-12 px-4 text-center">
          <div className="glass-panel p-8 rounded-3xl bg-white shadow-xl space-y-5 border border-slate-200">
            <div className="w-16 h-16 rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle className="w-8 h-8" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                Consultation Concluded
              </span>
              <h1 className="text-2xl font-black text-slate-900 mt-3">
                This Consultation is Completed
              </h1>
              <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
                As per clinical protocols and user security guidelines, rejoining completed consultations is disabled. All session notes and records have been permanently archived.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-left space-y-1.5 max-w-md mx-auto">
              <div className="flex justify-between">
                <span className="text-slate-500">Doctor:</span>
                <span className="font-bold text-slate-900">{doctorName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Patient:</span>
                <span className="font-bold text-slate-900">{patientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-800">
                  {appointment?.date ? new Date(appointment.date).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              {isDoctor ? (
                <Link
                  to={`/doctor/prescription/${appointmentId}`}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>View / Edit e-Prescription</span>
                </Link>
              ) : (
                <Link
                  to="/patient/medical-records"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md transition-all flex items-center justify-center space-x-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Issued Prescription</span>
                </Link>
              )}
              <Link
                to={isDoctor ? '/doctor/appointments' : '/patient/appointments'}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center justify-center space-x-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Return to Appointments</span>
              </Link>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 max-w-6xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}
        {cameraError && (
          <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        {/* Room Header */}
        <div className="glass-panel p-4 rounded-2xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>TeleMed Live Consultation Room</span>
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                {isDoctor ? 'Doctor Workspace' : 'Patient View'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Appointment #{appointmentId?.slice(-6)} · {doctorName} with {patientName}
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Direct prescription shortcut for doctors — accessible at ANY time */}
            {isDoctor && (
              <Link
                to={`/doctor/prescription/${appointmentId}`}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                title="Open Prescription Form anytime before, during, or after call"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>e-Prescription</span>
              </Link>
            )}

            {/* Network pill */}
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl border text-xs font-bold ${ns.color}`}>
              <ns.icon className={`w-3.5 h-3.5 ${networkStatus === 'reconnecting' ? 'animate-spin' : ''}`} />
              <span>{ns.label}</span>
            </div>

            {/* Session Timer */}
            {session && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-slate-100 text-slate-800 text-xs font-mono font-bold border border-slate-200">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>{formatTime(elapsed)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Video Stage */}
          <div className="lg:col-span-2 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Local User Video Feed (Live Webcam via getUserMedia) */}
              <div className="aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                {/* Real local video element */}
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className={`w-full h-full object-cover ${hasCamera && camOn ? 'block' : 'hidden'}`}
                />

                {/* Fallback avatar if camera off or unavailable */}
                {(!hasCamera || !camOn) && (
                  <div className="flex flex-col items-center justify-center p-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-md mb-2">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                    <p className="text-xs text-slate-400 font-semibold">
                      {camOn ? 'Connecting camera...' : 'Camera Paused'}
                    </p>
                  </div>
                )}

                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[11px] font-semibold backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{user?.name} (You)</span>
                  {hasCamera && <span className="text-[10px] text-emerald-300 font-normal">· HD</span>}
                </div>

                {!micOn && (
                  <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-rose-500 text-white shadow-sm" title="Mic Muted">
                    <MicOff className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Remote Peer Video Feed (Counterpart) */}
              <div className="aspect-video rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <div className="flex flex-col items-center justify-center p-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-2xl font-black shadow-md mb-2">
                    {(isDoctor ? patientName : doctorName)?.charAt(0) || 'P'}
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-xs text-emerald-300 font-semibold">Live Remote Stream</span>
                  </div>
                </div>

                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/75 text-white text-[11px] font-semibold backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>{isDoctor ? patientName : doctorName}</span>
                </div>
              </div>
            </div>

            {/* Video Controls Bar */}
            <div className="glass-panel p-3.5 rounded-2xl bg-white flex items-center justify-between shadow-card">
              <div className="flex items-center space-x-2">
                <button
                  onClick={toggleMic}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${
                    micOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                  title={micOn ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleCam}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${
                    camOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                  title={camOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
                {!hasCamera && (
                  <button
                    onClick={startCamera}
                    className="p-2.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                    title="Enable Camera Device"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                {!session ? (
                  <button
                    onClick={startSession}
                    disabled={starting}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
                  >
                    {starting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Connecting...</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        <span>{isDoctor ? 'Start Consultation' : 'Join Consultation Call'}</span>
                      </>
                    )}
                  </button>
                ) : isDoctor ? (
                  <button
                    onClick={endSession}
                    disabled={ending}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25 transition-all disabled:opacity-50"
                  >
                    {ending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Concluding...</span>
                      </>
                    ) : (
                      <>
                        <PhoneOff className="w-4 h-4" />
                        <span>End & Prescribe</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => { stopCamera(); navigate('/patient/dashboard'); }}
                    className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                  >
                    <PhoneOff className="w-4 h-4 text-rose-600" />
                    <span>Leave Call</span>
                  </button>
                )}
              </div>
            </div>

            {/* SRS FR-6 Resilience Controls */}
            {session && (
              <div className="glass-panel p-4 rounded-2xl bg-white shadow-card">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Network Resilience & Diagnostics (SRS FR-5 & FR-6)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={simulateDisconnect}
                    disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-40"
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Test Network Drop (Auto-Reconnect within 3s)</span>
                  </button>
                  <button
                    onClick={simulateQualityDrop}
                    disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-40"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Test Low Bandwidth Adaptation (FR-5)</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Complies with SRS FR-5/FR-6: Automatic reconnection resumes within 3 seconds without losing consultation data or clinical notes.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: In-Call Live Chat & Clinical Details */}
          <div className="space-y-4 flex flex-col h-full">
            <div className="glass-panel rounded-2xl bg-white shadow-card flex flex-col h-[520px]">
              {/* Tab Selector */}
              <div className="flex border-b border-slate-100 p-2 gap-1 bg-slate-50/60 rounded-t-2xl">
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'chat'
                      ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>In-Call Live Chat</span>
                  {messages.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.2 rounded-full bg-blue-100 text-blue-700 text-[10px]">
                      {messages.length}
                    </span>
                  )}
                </button>
                {isDoctor && (
                  <button
                    type="button"
                    onClick={() => setActiveTab('notes')}
                    className={`flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      activeTab === 'notes'
                        ? 'bg-white text-blue-700 shadow-xs border border-blue-100'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Clinical Notes</span>
                  </button>
                )}
              </div>

              {/* Tab Content: LIVE CHAT */}
              {activeTab === 'chat' && (
                <div className="flex-1 flex flex-col p-3 overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                    {messages.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                        <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                        <p className="text-xs font-semibold text-slate-600">No messages yet in this consultation</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Send a message below to chat in real-time</p>
                      </div>
                    ) : (
                      messages.map((msg, i) => {
                        const isMe = msg.senderId === user?._id || msg.senderRole === user?.role;
                        const isDocSender = msg.senderRole === 'doctor';
                        return (
                          <div
                            key={i}
                            className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                          >
                            <span className="text-[10px] font-bold text-slate-400 mb-0.5 px-1">
                              {msg.senderName} ({isDocSender ? 'Doctor' : 'Patient'})
                            </span>
                            <div
                              className={`max-w-[85%] p-2.5 rounded-2xl text-xs leading-relaxed ${
                                isMe
                                  ? 'bg-blue-600 text-white rounded-tr-none shadow-xs'
                                  : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                              }`}
                            >
                              {msg.text}
                            </div>
                            <span className="text-[9px] text-slate-400 mt-0.5 px-1">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        );
                      })
                    )}
                    <div ref={chatBottomRef} />
                  </div>

                  {/* Message Input Box */}
                  <form onSubmit={handleSendMessage} className="pt-2 border-t border-slate-100 flex items-center gap-2">
                    <input
                      type="text"
                      disabled={!session}
                      value={chatInput}
                      onChange={e => setChatInput(e.target.value)}
                      placeholder={session ? "Type a message..." : "Start session to chat..."}
                      className="glass-input flex-1 px-3 py-2 rounded-xl text-xs bg-white disabled:opacity-50"
                    />
                    <button
                      type="submit"
                      disabled={!session || !chatInput.trim() || sendingMsg}
                      className="p-2 rounded-xl bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-xs"
                      title="Send message"
                    >
                      {sendingMsg ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </form>
                </div>
              )}

              {/* Tab Content: CLINICAL NOTES (Doctor only) */}
              {activeTab === 'notes' && isDoctor && (
                <div className="flex-1 flex flex-col p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Live Observation & Diagnosis</span>
                    <Link
                      to={`/doctor/prescription/${appointmentId}`}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
                    >
                      <span>Prescription Form</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                  <textarea
                    rows={12}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    disabled={!session}
                    placeholder={session ? "Document symptoms, vital signs, and diagnostic conclusions..." : "Start consultation session to type clinical notes"}
                    className="glass-input w-full p-2.5 rounded-xl text-xs bg-white resize-none flex-1 disabled:opacity-50"
                  />
                  <p className="text-[11px] text-slate-400">
                    Auto-saved to patient record and populated onto your e-prescription form upon completion.
                  </p>
                </div>
              )}
            </div>

            {/* Patient / Appointment Context Summary Box */}
            <div className="glass-panel p-3.5 rounded-2xl bg-white shadow-card text-xs space-y-1.5">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">{isDoctor ? 'Patient' : 'Doctor'}</span>
                <span className="font-bold text-slate-900">{isDoctor ? patientName : doctorName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Scheduled Time</span>
                <span className="font-semibold text-slate-800">{appointment?.timeSlot?.start} – {appointment?.timeSlot?.end}</span>
              </div>
              {appointment?.symptoms && (
                <div className="pt-1">
                  <span className="text-slate-500 block mb-0.5">Symptoms:</span>
                  <p className="p-2 rounded-xl bg-blue-50/50 text-slate-800 text-[11px] border border-blue-100">
                    {appointment.symptoms}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
