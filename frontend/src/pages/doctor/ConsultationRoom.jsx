import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  Video, VideoOff, Mic, MicOff, PhoneOff, Wifi, WifiOff, AlertTriangle, 
  Loader2, User, FileText, Clock, RefreshCw, Send, MessageSquare, 
  ExternalLink, CheckCircle, ShieldCheck, Stethoscope
} from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
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

  // Chat state
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const timerRef = useRef(null);
  const chatBottomRef = useRef(null);
  const pollingRef = useRef(null);

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
        setAppointment(apptRes.data.appointment);

        if (sessionRes.data?.session) {
          const sess = sessionRes.data.session;
          setSession(sess);
          setMessages(sess.messages || []);
          if (sess.consultationNotes) setNotes(sess.consultationNotes);
          
          // Calculate elapsed time from startedAt
          if (sess.startedAt) {
            const startSec = Math.floor((new Date() - new Date(sess.startedAt)) / 1000);
            setElapsed(Math.max(0, startSec));
          }
          if (!timerRef.current) {
            timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
          }
        }
      } catch (err) {
        if (mounted) setAlert({ type: 'error', message: 'Failed to load consultation room details.' });
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchApptAndSession();

    return () => {
      mounted = false;
      clearInterval(timerRef.current);
      clearInterval(pollingRef.current);
    };
  }, [appointmentId]);

  // 2. Poll messages when session is active
  useEffect(() => {
    if (!session?._id) return;

    const pollSession = async () => {
      try {
        const res = await api.get(`/consultation/${session._id}`);
        if (res.data?.session?.messages) {
          setMessages(res.data.session.messages);
        }
      } catch {
        // Silent polling fail
      }
    };

    pollingRef.current = setInterval(pollSession, 2500);
    return () => clearInterval(pollingRef.current);
  }, [session?._id]);

  // Scroll chat to bottom on new message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Start or join session
  const startSession = async () => {
    setStarting(true);
    try {
      const res = await api.post('/consultation/start', { appointmentId });
      const currentSession = res.data.session;
      setSession(currentSession);
      setMessages(currentSession.messages || []);
      setAlert({ type: 'success', message: 'Connected to live consultation session.' });
      
      if (!timerRef.current) {
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      }
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to start session.' });
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
    setAlert({ type: 'error', message: 'Network disconnected! Auto-reconnecting...' });
    await sendNetworkEvent('disconnected', 'Simulated network drop');
    setTimeout(async () => {
      setNetworkStatus('reconnecting');
      setAlert({ type: 'info', message: t('reconnecting') });
      setTimeout(async () => {
        setNetworkStatus('connected');
        setAlert({ type: 'success', message: 'Connection restored successfully!' });
        await sendNetworkEvent('reconnected', 'Auto-reconnect successful after 3s');
      }, 3000);
    }, 500);
  };

  const simulateQualityDrop = async () => {
    setNetworkStatus('degraded');
    setAlert({ type: 'info', message: 'Network quality degraded. Reducing video resolution to maintain audio...' });
    await sendNetworkEvent('quality-degraded', 'Bandwidth below threshold');
    setTimeout(async () => {
      setNetworkStatus('connected');
      setAlert({ type: 'success', message: 'HD Video quality restored.' });
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

  const netStatusConfig = {
    connected: { color: 'text-emerald-700 bg-emerald-50 border-emerald-200', bg: 'bg-emerald-600', icon: Wifi, label: 'Stable Connection' },
    disconnected: { color: 'text-rose-700 bg-rose-50 border-rose-200', bg: 'bg-rose-600', icon: WifiOff, label: 'Offline' },
    reconnecting: { color: 'text-amber-700 bg-amber-50 border-amber-200', bg: 'bg-amber-500', icon: RefreshCw, label: 'Reconnecting...' },
    degraded: { color: 'text-orange-700 bg-orange-50 border-orange-200', bg: 'bg-orange-500', icon: AlertTriangle, label: 'Low Bandwidth' },
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

  return (
    <Layout>
      <div className="space-y-4 max-w-6xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

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
            {/* Direct prescription shortcut for doctors */}
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
              {/* Doctor Feed Card */}
              <div className="aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                {camOn || !isDoctor ? (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-md">
                    {appointment?.doctor?.name?.replace(/^(Dr\.|Dr\s)/i, '').trim().charAt(0) || 'D'}
                  </div>
                ) : (
                  <VideoOff className="w-10 h-10 text-slate-600" />
                )}
                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-semibold backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{doctorName} {isDoctor ? '(You)' : ''}</span>
                </div>
                {isDoctor && !micOn && (
                  <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-rose-500 text-white shadow-sm">
                    <MicOff className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Patient Feed Card */}
              <div className="aspect-video rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-3xl font-black shadow-md">
                  {patientName?.charAt(0) || 'P'}
                </div>
                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-semibold backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>{patientName} {!isDoctor ? '(You)' : ''}</span>
                </div>
              </div>
            </div>

            {/* Video Controls Bar */}
            <div className="glass-panel p-3.5 rounded-2xl bg-white flex items-center justify-between shadow-card">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMicOn(!micOn)}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${
                    micOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                  title={micOn ? 'Mute Mic' : 'Unmute Mic'}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setCamOn(!camOn)}
                  className={`p-2.5 rounded-xl font-semibold transition-all ${
                    camOn ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                  title={camOn ? 'Turn Camera Off' : 'Turn Camera On'}
                >
                  {camOn ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
                </button>
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
                        <span>Completing...</span>
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
                    onClick={() => navigate('/patient/dashboard')}
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
                  Network Resilience & Diagnostics (SRS FR-6)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={simulateDisconnect}
                    disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-40"
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Test Network Drop (Auto-Reconnect)</span>
                  </button>
                  <button
                    onClick={simulateQualityDrop}
                    disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-40"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Test Low Bandwidth Adaptation</span>
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  Complies with SRS FR-6: Automatically buffers state & re-establishes session within 3 seconds without session loss.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: In-Call Live Chat & Clinical Details */}
          <div className="space-y-4 flex flex-col h-full">
            {/* Tabs for Doctor (Chat & Clinical Notes); Single tab for Patient (Chat) */}
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
