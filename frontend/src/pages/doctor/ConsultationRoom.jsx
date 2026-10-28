import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Wifi, WifiOff, AlertTriangle, Loader2, User, FileText, Clock, RefreshCw } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function ConsultationRoom() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [appointment, setAppointment] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);
  const [networkStatus, setNetworkStatus] = useState('connected'); // connected|disconnected|reconnecting|degraded
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [notes, setNotes] = useState('');
  const [alert, setAlert] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    const fetchAppt = async () => {
      try {
        const res = await api.get(`/appointments/${appointmentId}`);
        setAppointment(res.data.appointment);
      } catch { setAlert({ type: 'error', message: 'Failed to load appointment.' }); }
      finally { setLoading(false); }
    };
    fetchAppt();
  }, [appointmentId]);

  const startSession = async () => {
    setStarting(true);
    try {
      const res = await api.post('/consultation/start', { appointmentId });
      setSession(res.data.session);
      setAlert({ type: 'success', message: 'Consultation started!' });
      // Start timer
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to start session.' });
    } finally { setStarting(false); }
  };

  useEffect(() => () => clearInterval(timerRef.current), []);

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
    setAlert({ type: 'info', message: 'Network quality degraded. Reducing video quality...' });
    await sendNetworkEvent('quality-degraded', 'Bandwidth below 256kbps threshold');
    setTimeout(async () => {
      setNetworkStatus('connected');
      setAlert({ type: 'success', message: 'Network quality restored.' });
      await sendNetworkEvent('quality-restored', 'Bandwidth recovered');
    }, 4000);
  };

  const endSession = async () => {
    if (!session) return;
    setEnding(true);
    try {
      await api.post(`/consultation/${session._id}/end`, { consultationNotes: notes, duration: Math.floor(elapsed / 60) || 1 });
      clearInterval(timerRef.current);
      navigate(`/doctor/prescription/${appointmentId}`);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to end session.' });
    } finally { setEnding(false); }
  };

  const netStatusConfig = {
    connected: { color: 'text-emerald-400', bg: 'bg-emerald-400', icon: Wifi, label: t('connected') },
    disconnected: { color: 'text-rose-400', bg: 'bg-rose-400', icon: WifiOff, label: t('disconnected') },
    reconnecting: { color: 'text-amber-400', bg: 'bg-amber-400', icon: RefreshCw, label: t('reconnecting') },
    degraded: { color: 'text-amber-400', bg: 'bg-amber-500', icon: AlertTriangle, label: 'Quality Degraded' },
  };
  const ns = netStatusConfig[networkStatus];

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-4 max-w-5xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-white flex items-center space-x-2"><Video className="w-5 h-5 text-indigo-400" /><span>{t('consultation')}</span></h1>
            <p className="text-sm text-slate-400 mt-0.5">Patient: <span className="text-slate-200 font-semibold">{appointment?.patient?.name}</span></p>
          </div>
          <div className="flex items-center space-x-3">
            {/* Network status */}
            <div className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-medium ${ns.color}`}>
              <span className={`w-2 h-2 rounded-full ${ns.bg} ${networkStatus === 'reconnecting' ? 'animate-pulse' : ''}`} />
              <ns.icon className={`w-3.5 h-3.5 ${networkStatus === 'reconnecting' ? 'animate-spin' : ''}`} />
              <span>{ns.label}</span>
            </div>
            {/* Timer */}
            {session && (
              <div className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
                <Clock className="w-3.5 h-3.5 text-indigo-400" /><span>{formatTime(elapsed)}</span>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Video area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video feeds */}
            <div className="grid grid-cols-2 gap-3">
              {/* Doctor cam */}
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden">
                {!camOn && <VideoOff className="w-10 h-10 text-slate-600 mb-2" />}
                {camOn && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-3xl font-bold text-white">
                      {appointment?.doctor?.name?.charAt(0) || 'D'}
                    </div>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-950/80 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>You (Doctor)</span>
                </div>
                {!micOn && (
                  <div className="absolute top-2 right-2 p-1.5 rounded-lg bg-rose-500/20 text-rose-400"><MicOff className="w-3.5 h-3.5" /></div>
                )}
              </div>
              {/* Patient cam (simulated) */}
              <div className="aspect-video rounded-2xl bg-gradient-to-br from-slate-800/60 to-slate-900/60 border border-slate-700/60 flex flex-col items-center justify-center relative overflow-hidden">
                <div className="w-full h-full flex items-center justify-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-600 to-teal-600 flex items-center justify-center text-3xl font-bold text-white">
                    {appointment?.patient?.name?.charAt(0) || 'P'}
                  </div>
                </div>
                <div className="absolute bottom-2 left-2 flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-slate-950/80 text-xs text-slate-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                  <span>{appointment?.patient?.name}</span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-xl transition-all ${micOn ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                  {micOn ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
                </button>
                <button onClick={() => setCamOn(!camOn)} className={`p-3 rounded-xl transition-all ${camOn ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'}`}>
                  {camOn ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
                </button>
              </div>

              <div className="flex items-center space-x-2">
                {!session ? (
                  <button onClick={startSession} disabled={starting} className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50">
                    {starting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Starting...</span></> : <><Video className="w-4 h-4" /><span>{t('startConsultation')}</span></>}
                  </button>
                ) : (
                  <button onClick={endSession} disabled={ending} className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 shadow-lg shadow-rose-600/20 transition-all disabled:opacity-50">
                    {ending ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Ending...</span></> : <><PhoneOff className="w-4 h-4" /><span>{t('endConsultation')}</span></>}
                  </button>
                )}
              </div>
            </div>

            {/* Network simulation (FR-6) */}
            {session && (
              <div className="glass-card p-4 rounded-2xl border border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">🌐 Network Resilience Testing (FR-6)</p>
                <div className="flex flex-wrap gap-2">
                  <button onClick={simulateDisconnect} disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors disabled:opacity-40">
                    <WifiOff className="w-3.5 h-3.5" /><span>{t('simulateDisconnect')}</span>
                  </button>
                  <button onClick={simulateQualityDrop} disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-colors disabled:opacity-40">
                    <AlertTriangle className="w-3.5 h-3.5" /><span>Simulate Quality Drop</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-2">Auto-reconnect after network drop within 3 seconds — per SRS FR-6</p>
              </div>
            )}
          </div>

          {/* Right: Patient info + notes */}
          <div className="space-y-4">
            {/* Patient info */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2"><User className="w-4 h-4 text-blue-400" /><span>Patient Info</span></h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-400">Name</span><span className="text-slate-200 font-medium">{appointment?.patient?.name}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Type</span><span className="text-slate-200 capitalize">{appointment?.type}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Date</span><span className="text-slate-200">{appointment ? new Date(appointment.date).toLocaleDateString('en-IN') : '—'}</span></div>
                <div className="flex justify-between"><span className="text-slate-400">Time</span><span className="text-slate-200">{appointment?.timeSlot?.start}</span></div>
              </div>
              {appointment?.symptoms && (
                <div className="pt-2 border-t border-slate-800">
                  <p className="text-xs text-slate-400 mb-1">Symptoms:</p>
                  <p className="text-xs text-slate-300">{appointment.symptoms}</p>
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center space-x-2 mb-3">
                <FileText className="w-4 h-4 text-teal-400" /><span>{t('consultationNotes')}</span>
              </h3>
              <textarea rows={10} value={notes} onChange={e => setNotes(e.target.value)} disabled={!session}
                placeholder={session ? "Type your consultation notes here..." : "Start the consultation to take notes"}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none disabled:opacity-50" />
              <p className="text-[10px] text-slate-500 mt-1">Notes will be saved when you end the consultation.</p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
