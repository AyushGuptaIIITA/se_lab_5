import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, Search, FileText, Pill, RefreshCw, Clock, User, ArrowRight, Loader2, Video, Activity, Sparkles, ShieldCheck } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

function StatCard({ icon: Icon, label, value, colorClass, borderClass }) {
  return (
    <div className={`glass-card p-5 rounded-2xl border ${borderClass} bg-white shadow-card hover:shadow-card-hover transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center font-bold shadow-xs`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 mt-3">{value ?? '—'}</p>
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
      setAlert({ type: 'error', message: 'Could not load appointments. Please check backend connection.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const upcoming = appointments.filter(a => ['pending', 'confirmed'].includes(a.status)).slice(0, 5);
  const completed = appointments.filter(a => a.status === 'completed');
  const next = upcoming[0];

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Hero Banner */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-xl shadow-blue-500/20">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30 backdrop-blur-sm">
                  Patient Health Portal
                </span>
                <span className="flex items-center space-x-1 text-xs text-white/90 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Account Verified</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                Namaste, {user?.name?.split(' ')[0]}! 🙏
              </h1>
              <p className="text-sm text-blue-100 mt-1 max-w-xl">
                Access certified medical practitioners, live video consultations, and digitally signed e-prescriptions.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh Data"
                className="p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/patient/search-doctors"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-blue-700 bg-white hover:bg-blue-50 shadow-md transition-all hover:scale-105 active:scale-95"
              >
                <Search className="w-4 h-4" />
                <span>{t('searchDoctors')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Highlight Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-bold">
          <div className="bg-emerald-50 text-emerald-800 p-3.5 rounded-2xl border border-emerald-200 flex items-center space-x-2.5">
            <span className="text-lg">💊</span>
            <span>Certified e-Prescriptions signed via SHA-256</span>
          </div>
          <div className="bg-blue-50 text-blue-800 p-3.5 rounded-2xl border border-blue-200 flex items-center space-x-2.5">
            <span className="text-lg">⚡</span>
            <span>Real-time availability slot booking & verification</span>
          </div>
          <div className="bg-indigo-50 text-indigo-800 p-3.5 rounded-2xl border border-indigo-200 flex items-center space-x-2.5">
            <span className="text-lg">🛡️</span>
            <span>100% confidential and end-to-end encrypted care</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Calendar}
            label={t('upcomingAppointments')}
            value={upcoming.length}
            colorClass="bg-blue-50 text-blue-600"
            borderClass="border-blue-100"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed Consultations"
            value={completed.length}
            colorClass="bg-emerald-50 text-emerald-600"
            borderClass="border-emerald-100"
          />
          <StatCard
            icon={Pill}
            label="Total Appointments"
            value={appointments.length}
            colorClass="bg-purple-50 text-purple-600"
            borderClass="border-purple-100"
          />
        </div>

        {/* Next appointment */}
        {next && (
          <div className="glass-panel p-5 rounded-2xl bg-white shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Next Scheduled Consultation</span>
              </h2>
              <StatusBadge status={next.status} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-blue-50/50 border border-blue-100">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                  {next.doctor?.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <p className="font-bold text-slate-900 text-base">
                    {next.doctor?.name?.startsWith('Dr.') ? next.doctor?.name : `Dr. ${next.doctor?.name || 'Specialist'}`}
                  </p>
                  <p className="text-xs font-semibold text-blue-600">{next.doctor?.specialization || 'General Medicine'}</p>
                  <div className="mt-1 flex items-center space-x-4 text-xs text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{new Date(next.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{next.timeSlot?.start} – {next.timeSlot?.end}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {['confirmed', 'in-progress'].includes(next.status) && (
                  <Link
                    to={`/patient/consultation/${next._id}`}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <Video className="w-4 h-4" />
                    <span>Join Video Call</span>
                  </Link>
                )}
                {next.status === 'completed' && (
                  <Link
                    to={`/prescription/appointment/${next._id}`}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                  >
                    <FileText className="w-4 h-4" />
                    <span>View e-Prescription</span>
                  </Link>
                )}
                <Link
                  to="/patient/medical-records"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-blue-500 transition-all shadow-xs"
                >
                  View Records
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent appointments */}
          <div className="lg:col-span-2 glass-panel rounded-2xl overflow-hidden bg-white shadow-card">
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>Appointment History</span>
              </h2>
              <div className="flex items-center space-x-3 text-xs font-bold">
                <Link to="/patient/appointments" className="text-blue-600 hover:underline">
                  View All ({appointments.length}) →
                </Link>
                <span className="text-slate-300">·</span>
                <Link to="/patient/search-doctors" className="text-slate-600 hover:text-blue-600">
                  Book New
                </Link>
              </div>
            </div>
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="font-bold text-slate-700">No appointments scheduled</p>
                <p className="text-xs text-slate-400 mt-0.5">Consult with certified doctors online in minutes</p>
                <Link
                  to="/patient/search-doctors"
                  className="mt-3 inline-block px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                >
                  Find a Doctor →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {appointments.slice(0, 8).map(apt => (
                  <div key={apt._id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-xs font-bold">
                        {apt.doctor?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {apt.doctor?.name?.startsWith('Dr.') ? apt.doctor?.name : `Dr. ${apt.doctor?.name || '—'}`}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(apt.date).toLocaleDateString('en-IN')} · {apt.timeSlot?.start}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      {['confirmed', 'in-progress'].includes(apt.status) && (
                        <Link
                          to={`/patient/consultation/${apt._id}`}
                          className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Call</span>
                        </Link>
                      )}
                      {apt.status === 'completed' && (
                        <Link
                          to={`/prescription/appointment/${apt._id}`}
                          className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>e-Prescription</span>
                        </Link>
                      )}
                      <StatusBadge status={apt.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="glass-panel p-5 rounded-2xl bg-white shadow-card space-y-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <ArrowRight className="w-4 h-4 text-blue-600" />
              <span>{t('quickActions')}</span>
            </h2>
            {[
              { to: '/patient/search-doctors', icon: Search, label: t('searchDoctors'), color: 'text-blue-600 bg-blue-50' },
              { to: '/patient/medical-records', icon: FileText, label: t('medicalRecords'), color: 'text-emerald-600 bg-emerald-50' },
              { to: '/profile', icon: User, label: t('profile'), color: 'text-purple-600 bg-purple-50' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center space-x-3 p-3 rounded-xl bg-slate-50 hover:bg-blue-50/60 border border-slate-100 hover:border-blue-200 transition-all group"
              >
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center font-bold`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-slate-700 group-hover:text-blue-600 transition-colors">{label}</span>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 ml-auto transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}