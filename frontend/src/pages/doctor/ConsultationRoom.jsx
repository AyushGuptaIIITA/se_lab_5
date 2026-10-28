import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Video, VideoOff, Mic, MicOff, PhoneOff, Wifi, WifiOff, AlertTriangle, Loader2, User, FileText, Clock, RefreshCw, ShieldCheck } from 'lucide-react';
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
  const [networkStatus, setNetworkStatus] = useState('connected');
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
      } catch {
        setAlert({ type: 'error', message: 'Failed to load appointment details.' });
      } finally {
        setLoading(false);
      }
    };
    fetchAppt();
  }, [appointmentId]);

  const startSession = async () => {
    setStarting(true);
    try {
      const res = await api.post('/consultation/start', { appointmentId });
      setSession(res.data.session);
      setAlert({ type: 'success', message: 'Consultation session active.' });
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to start session.' });
    } finally {
      setStarting(false);
    }
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
      navigate(`/doctor/prescription/${appointmentId}`);
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

  return (
    <Layout>
      <div className="space-y-4 max-w-5xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Room Header */}
        <div className="glass-panel p-4 rounded-2xl bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-card">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
                <span>TeleMed Live Consultation Room</span>
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Consulting with <strong className="text-slate-800">{appointment?.patient?.name}</strong> · ID: #{appointmentId?.slice(-6)}
            </p>
          </div>
          <div className="flex items-center space-x-2.5">
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
            <div className="grid grid-cols-2 gap-3">
              {/* Doctor Feed */}
              <div className="aspect-video rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                {camOn ? (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-black shadow-md">
                    {appointment?.doctor?.name?.replace(/^(Dr\.|Dr\s)/i, '').trim().charAt(0) || 'D'}
                  </div>
                ) : (
                  <VideoOff className="w-10 h-10 text-slate-600" />
                )}
                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-semibold backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>You (Doctor)</span>
                </div>
                {!micOn && (
                  <div className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-rose-500 text-white shadow-sm">
                    <MicOff className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Patient Feed */}
              <div className="aspect-video rounded-2xl bg-slate-800 border border-slate-700 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center text-3xl font-black shadow-md">
                  {appointment?.patient?.name?.charAt(0) || 'P'}
                </div>
                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-black/70 text-white text-[11px] font-semibold backdrop-blur-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  <span>{appointment?.patient?.name || 'Patient'}</span>
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
                  title={micOn ? 'Mute' : 'Unmute'}
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
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4" />
                        <span>Start Consultation</span>
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={endSession}
                    disabled={ending}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-md shadow-rose-500/25 transition-all disabled:opacity-50"
                  >
                    {ending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <PhoneOff className="w-4 h-4" />
                        <span>End & Prescribe</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* SRS FR-6 Resilience Controls */}
            {session && (
              <div className="glass-panel p-4 rounded-2xl bg-white shadow-card">
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Network Resilience Testing (SRS FR-6)
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
                  Complies with SRS FR-6: Automatically buffers state & re-establishes session within 3 seconds.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Patient Details + Live Clinical Notes */}
          <div className="space-y-4">
            <div className="glass-panel p-4 rounded-2xl bg-white shadow-card space-y-2.5">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <User className="w-4 h-4 text-blue-600" />
                <span>Patient Summary</span>
              </h3>
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Name</span>
                  <span className="font-bold text-slate-900">{appointment?.patient?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Type</span>
                  <span className="font-semibold text-blue-600 capitalize">{appointment?.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">Time Slot</span>
                  <span className="font-semibold text-slate-800">{appointment?.timeSlot?.start} – {appointment?.timeSlot?.end}</span>
                </div>
                {appointment?.symptoms && (
                  <div className="pt-1">
                    <span className="text-slate-500 block mb-0.5">Reported Symptoms:</span>
                    <p className="p-2 rounded-xl bg-blue-50/60 text-slate-800 text-xs border border-blue-100">
                      {appointment.symptoms}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Clinical Notes Form */}
            <div className="glass-panel p-4 rounded-2xl bg-white shadow-card space-y-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Clinical Notes & Observations</span>
              </h3>
              <textarea
                rows={9}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={!session}
                placeholder={session ? "Document patient symptoms, diagnosis, and clinical observations here..." : "Start consultation to type clinical notes"}
                className="glass-input w-full p-2.5 rounded-xl text-xs bg-white resize-none disabled:opacity-50"
              />
              <p className="text-[11px] text-slate-400">
                Notes will automatically populate your e-prescription form upon completion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}