import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, Stethoscope, Search, FileText, Pill, RefreshCw, Clock, User, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
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

export default function PatientDashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments?limit=20');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      setAlert({ type: 'error', message: 'Could not load appointments. Backend may not be running.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).slice(0, 5);
  const completed = appointments.filter(a => a.status === 'completed');
  const next = upcoming[0];

  return (
    <Layout>
      <div className="space-y-8">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/40">Patient Portal</span>
                <span className="flex items-center space-x-1 text-xs text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><span>Active</span></span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">Namaste, {user?.name?.split(' ')[0]}! 🙏</h1>
              <p className="text-sm text-slate-300 mt-1">Your healthcare portal. Book appointments, view prescriptions and medical records.</p>
            </div>
            <div className="flex items-center space-x-3">
              <button onClick={fetchData} disabled={loading} title="Refresh" className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link to="/patient/search-doctors" className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all">
                <Search className="w-4 h-4" /><span>{t('searchDoctors')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={Calendar} label={t('upcomingAppointments')} value={upcoming.length} color="bg-indigo-500/10 text-indigo-400" />
          <StatCard icon={CheckCircle} label="Completed Consultations" value={completed.length} color="bg-emerald-500/10 text-emerald-400" />
          <StatCard icon={Pill} label="Total Appointments" value={appointments.length} color="bg-violet-500/10 text-violet-400" />
        </div>

        {/* Next appointment */}
        {next && (
          <div className="glass-panel p-5 rounded-2xl border border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-4">
              <Clock className="w-4 h-4 text-amber-400" /><span>Next Appointment</span>
            </h2>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold">
                    {next.doctor?.name?.charAt(0) || 'D'}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-200">Dr. {next.doctor?.name || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{next.doctor?.specialization || 'General'}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center space-x-4 text-xs text-slate-400">
                  <span className="flex items-center space-x-1"><Calendar className="w-3.5 h-3.5" /><span>{new Date(next.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span></span>
                  <span className="flex items-center space-x-1"><Clock className="w-3.5 h-3.5" /><span>{next.timeSlot?.start} – {next.timeSlot?.end}</span></span>
                  <StatusBadge status={next.status} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent appointments */}
          <div className="lg:col-span-2 glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center space-x-2"><Calendar className="w-4 h-4 text-indigo-400" /><span>Recent Appointments</span></h2>
              <Link to="/patient/search-doctors" className="text-xs text-indigo-400 hover:text-indigo-300">Book New →</Link>
            </div>
            {loading ? (
              <div className="py-12 flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500" /></div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                <Calendar className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p>No appointments yet.</p>
                <Link to="/patient/search-doctors" className="mt-3 inline-block text-indigo-400 hover:underline text-xs">Find a doctor →</Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {appointments.slice(0, 8).map(apt => (
                  <div key={apt._id} className="p-4 flex items-center justify-between hover:bg-slate-900/40 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {apt.doctor?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-200">Dr. {apt.doctor?.name || '—'}</p>
                        <p className="text-xs text-slate-400">{new Date(apt.date).toLocaleDateString('en-IN')} · {apt.timeSlot?.start}</p>
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
            <h2 className="text-base font-bold text-white flex items-center space-x-2"><ArrowRight className="w-4 h-4 text-violet-400" /><span>{t('quickActions')}</span></h2>
            {[
              { to: '/patient/search-doctors', icon: Search, label: t('searchDoctors'), color: 'text-teal-400 bg-teal-500/10' },
              { to: '/patient/medical-records', icon: FileText, label: t('medicalRecords'), color: 'text-blue-400 bg-blue-500/10' },
              { to: '/profile', icon: User, label: t('profile'), color: 'text-violet-400 bg-violet-500/10' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link key={to} to={to} className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800 hover:border-slate-700 transition-all group">
                <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
                <span className="text-sm font-medium text-slate-300 group-hover:text-white">{label}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 ml-auto" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}
