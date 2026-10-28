import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, CheckCircle, Video, FileText, RefreshCw, ChevronRight, Loader2, Check, X } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

function StatCard({ icon: Icon, label, value, color }) {
  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-2xl font-bold text-white mt-3">{value ?? '—'}</p>
    </div>
  );
}

export default function DoctorDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [alert, setAlert] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments?limit=50');
      setAppointments(res.data.appointments || []);
    } catch {
      setAlert({ type: 'error', message: 'Could not load appointments.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const todayApts = appointments.filter(a => new Date(a.date).toISOString().split('T')[0] === today);
  const pending = appointments.filter(a => a.status === 'pending');
  const completed = appointments.filter(a => a.status === 'completed');
  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status) && new Date(a.date) >= new Date());

  const handleStatus = async (id, status) => {
    setActionLoading(id + status);
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      setAlert({ type: 'success', message: `Appointment ${status}.` });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Action failed.' });
    } finally { setActionLoading(''); }
  };

  return (
    <Layout>
      <div className="space-y-8">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-emerald-900/40 via-teal-900/30 to-slate-900 border border-emerald-500/20 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Doctor Portal</span>
                <span className="flex items-center space-x-1 text-xs text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>On duty</span></span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Welcome, Dr. {user?.name?.split(' ')[0]}! 🩺</h1>
              <p className="text-sm text-slate-300 mt-1">{user?.specialization} · License: {user?.licenseNumber || 'N/A'}</p>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={fetchData} disabled={loading} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link to="/doctor/schedule" className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all">
                <Calendar className="w-4 h-4" /><span>{t('manageSchedule')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard icon={Calendar} label="Today's Appointments" value={todayApts.length} color="bg-indigo-500/10 text-indigo-400" />
          <StatCard icon={Clock} label="Pending Requests" value={pending.length} color="bg-amber-500/10 text-amber-400" />
          <StatCard icon={CheckCircle} label="Completed" value={completed.length} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard icon={Users} label="Total Patients" value={[...new Set(appointments.map(a => a.patient?._id))].length} color="bg-violet-500/10 text-violet-400" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's schedule */}
          <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-indigo-400" /><span>{t('todaySchedule')}</span>
              </h2>
              <span className="text-xs text-slate-400">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            {loading ? (
              <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : todayApts.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" /><p>No appointments scheduled for today.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {todayApts.map(apt => (
                  <div key={apt._id} className="p-4 hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/20">
                          {apt.patient?.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-200 text-sm">{apt.patient?.name || 'Unknown Patient'}</p>
                          <p className="text-xs text-slate-400">{apt.timeSlot?.start} – {apt.timeSlot?.end} · <span className="capitalize">{apt.type}</span></p>
                          {apt.symptoms && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{apt.symptoms}</p>}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <StatusBadge status={apt.status} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 pl-12">
                      {apt.status === 'pending' && (
                        <>
                          <button onClick={() => handleStatus(apt._id, 'confirmed')} disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 transition-colors disabled:opacity-50">
                            <Check className="w-3.5 h-3.5" /><span>Confirm</span>
                          </button>
                          <button onClick={() => handleStatus(apt._id, 'cancelled')} disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-colors disabled:opacity-50">
                            <X className="w-3.5 h-3.5" /><span>Cancel</span>
                          </button>
                        </>
                      )}
                      {apt.status === 'confirmed' && (
                        <Link to={`/doctor/consultation/${apt._id}`}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors">
                          <Video className="w-3.5 h-3.5" /><span>Start Consultation</span>
                        </Link>
                      )}
                      {apt.status === 'completed' && (
                        <Link to={`/doctor/prescription/${apt._id}`}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-teal-300 bg-teal-500/10 border border-teal-500/30 hover:bg-teal-500/20 transition-colors">
                          <FileText className="w-3.5 h-3.5" /><span>Write Prescription</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2"><Clock className="w-4 h-4 text-amber-400" /><span>Upcoming (7 days)</span></h2>
            </div>
            {upcoming.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No upcoming appointments</div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                {upcoming.slice(0, 10).map(apt => (
                  <div key={apt._id} className="p-4 hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-200">{apt.patient?.name}</p>
                        <p className="text-xs text-slate-400">{new Date(apt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {apt.timeSlot?.start}</p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
