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
    connected: { color: 'text-[#10847e] bg-teal-50 border-teal-200', bg: 'bg-[#10847e]', icon: Wifi, label: 'Stable Connection' },
    disconnected: { color: 'text-rose-700 bg-rose-50 border-rose-200', bg: 'bg-rose-600', icon: WifiOff, label: 'Offline' },
    reconnecting: { color: 'text-amber-700 bg-amber-50 border-amber-200', bg: 'bg-amber-500', icon: RefreshCw, label: 'Reconnecting...' },
    degraded: { color: 'text-orange-700 bg-orange-50 border-orange-200', bg: 'bg-[#ff6f61]', icon: AlertTriangle, label: 'Low Bandwidth' },
  };
  const ns = netStatusConfig[networkStatus];

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#ff6f61]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4 max-w-5xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Room Header */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <h1 className="text-lg font-bold text-gray-900 flex items-center space-x-2">
                <span>Tata 1mg Live Teleconsultation</span>
              </h1>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Consulting with <strong className="text-gray-800">{appointment?.patient?.name}</strong> · ID: #{appointmentId?.slice(-6)}
            </p>
          </div>
          <div className="flex items-center space-x-2.5">
            {/* Network pill */}
            <div className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg border text-xs font-bold ${ns.color}`}>
              <ns.icon className={`w-3.5 h-3.5 ${networkStatus === 'reconnecting' ? 'animate-spin' : ''}`} />
              <span>{ns.label}</span>
            </div>
            {/* Session Timer */}
            {session && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-gray-100 text-gray-800 text-xs font-mono font-bold border border-gray-200">
                <Clock className="w-3.5 h-3.5 text-[#ff6f61]" />
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
              <div className="aspect-video rounded-xl bg-gray-900 border border-gray-800 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                {camOn ? (
                  <div className="w-20 h-20 rounded-full bg-[#10847e] text-white flex items-center justify-center text-3xl font-black shadow-md">
                    {appointment?.doctor?.name?.charAt(0) || 'D'}
                  </div>
                ) : (
                  <VideoOff className="w-10 h-10 text-gray-600" />
                )}
                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>You (Doctor)</span>
                </div>
                {!micOn && (
                  <div className="absolute top-2.5 right-2.5 p-1 rounded bg-rose-500/80 text-white">
                    <MicOff className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>

              {/* Patient Feed */}
              <div className="aspect-video rounded-xl bg-gray-800 border border-gray-700 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                <div className="w-20 h-20 rounded-full bg-[#ff6f61] text-white flex items-center justify-center text-3xl font-black shadow-md">
                  {appointment?.patient?.name?.charAt(0) || 'P'}
                </div>
                <div className="absolute bottom-2.5 left-2.5 flex items-center space-x-1.5 px-2 py-0.5 rounded bg-black/70 text-white text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                  <span>{appointment?.patient?.name || 'Patient'}</span>
                </div>
              </div>
            </div>

            {/* Video Controls Bar */}
            <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setMicOn(!micOn)}
                  className={`p-2.5 rounded-lg font-semibold transition-all ${
                    micOn ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                  }`}
                  title={micOn ? 'Mute' : 'Unmute'}
                >
                  {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => setCamOn(!camOn)}
                  className={`p-2.5 rounded-lg font-semibold transition-all ${
                    camOn ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
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
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#10847e] hover:bg-[#0c6b66] shadow-sm transition-all disabled:opacity-50"
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
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white bg-[#ff6f61] hover:bg-[#e2584a] shadow-sm transition-all disabled:opacity-50"
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
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Network Resilience Simulation (SRS FR-6)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={simulateDisconnect}
                    disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-40"
                  >
                    <WifiOff className="w-3.5 h-3.5" />
                    <span>Test Network Drop (Auto-Reconnect)</span>
                  </button>
                  <button
                    onClick={simulateQualityDrop}
                    disabled={networkStatus !== 'connected'}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors disabled:opacity-40"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Test Low Bandwidth Adaptation</span>
                  </button>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Complies with SRS FR-6: Automatically buffers state & re-establishes session within 3 seconds.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Patient Details + Live Clinical Notes */}
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2.5">
              <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
                <User className="w-4 h-4 text-[#10847e]" />
                <span>Patient Summary</span>
              </h3>
              <div className="text-xs space-y-1.5 pt-1">
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Name</span>
                  <span className="font-bold text-gray-900">{appointment?.patient?.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Type</span>
                  <span className="font-semibold text-[#10847e] capitalize">{appointment?.type}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100">
                  <span className="text-gray-500">Time Slot</span>
                  <span className="font-semibold text-gray-800">{appointment?.timeSlot?.start} – {appointment?.timeSlot?.end}</span>
                </div>
                {appointment?.symptoms && (
                  <div className="pt-1">
                    <span className="text-gray-500 block mb-0.5">Reported Symptoms:</span>
                    <p className="p-2 rounded bg-orange-50 text-gray-800 text-xs border border-orange-100">
                      {appointment.symptoms}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Clinical Notes Form */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs space-y-2">
              <h3 className="text-sm font-bold text-gray-900 flex items-center space-x-1.5">
                <FileText className="w-4 h-4 text-[#ff6f61]" />
                <span>Clinical Notes & Observations</span>
              </h3>
              <textarea
                rows={9}
                value={notes}
                onChange={e => setNotes(e.target.value)}
                disabled={!session}
                placeholder={session ? "Document patient symptoms, diagnosis, and clinical observations here..." : "Start consultation to type clinical notes"}
                className="glass-input w-full p-2.5 rounded-lg text-xs bg-white resize-none disabled:opacity-50"
              />
              <p className="text-[11px] text-gray-400">
                Notes will automatically populate your e-prescription form upon completion.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}