import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CheckCircle, Search, FileText, Pill, RefreshCw, Clock, User, ArrowRight, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

function StatCard({ icon: Icon, label, value, colorClass, borderClass }) {
  return (
    <div className={`bg-white p-5 rounded-xl border ${borderClass} shadow-xs`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-gray-900 mt-3">{value ?? '—'}</p>
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
      setAlert({ type: 'error', message: 'Could not load appointments. Please ensure backend is running.' });
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

        {/* 1mg Styled Banner */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#ff6f61] to-[#fe8d00] text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  Patient Health Portal
                </span>
                <span className="text-xs text-white/90 font-medium">Verified Account</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                Namaste, {user?.name?.split(' ')[0]}! 🙏
              </h1>
              <p className="text-sm text-white/90 mt-1 max-w-xl">
                Consult top doctors online, get digitally signed e-prescriptions, and order your medications directly with Tata 1mg.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={fetchData}
                disabled={loading}
                title="Refresh"
                className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/patient/search-doctors"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#ff6f61] bg-white hover:bg-gray-50 shadow-md transition-all"
              >
                <Search className="w-4 h-4" />
                <span>{t('searchDoctors')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 1mg Highlights Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
          <div className="bg-[#fff4f2] text-[#ff6f61] p-3 rounded-xl border border-orange-200/80 flex items-center space-x-2">
            <span className="text-base">💊</span>
            <span>Genuine e-Prescriptions verified by certified physicians</span>
          </div>
          <div className="bg-[#e8f6f5] text-[#10847e] p-3 rounded-xl border border-teal-200/80 flex items-center space-x-2">
            <span className="text-base">⚡</span>
            <span>Instant booking & automated pharmacy dispatch</span>
          </div>
          <div className="bg-amber-50 text-[#b26200] p-3 rounded-xl border border-amber-200/80 flex items-center space-x-2">
            <span className="text-base">🛡️</span>
            <span>100% confidential & encrypted consultations</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard
            icon={Calendar}
            label={t('upcomingAppointments')}
            value={upcoming.length}
            colorClass="bg-orange-50 text-[#ff6f61]"
            borderClass="border-orange-100"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed Consultations"
            value={completed.length}
            colorClass="bg-teal-50 text-[#10847e]"
            borderClass="border-teal-100"
          />
          <StatCard
            icon={Pill}
            label="Total Bookings"
            value={appointments.length}
            colorClass="bg-purple-50 text-purple-700"
            borderClass="border-purple-100"
          />
        </div>

        {/* Next appointment */}
        {next && (
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#ff6f61]" />
                <span>Next Scheduled Appointment</span>
              </h2>
              <StatusBadge status={next.status} />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-[#fff4f2]/50 border border-orange-100">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-[#10847e] text-white flex items-center justify-center font-bold text-lg">
                  {next.doctor?.name?.charAt(0) || 'D'}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-base">Dr. {next.doctor?.name || 'Specialist'}</p>
                  <p className="text-xs font-semibold text-[#10847e]">{next.doctor?.specialization || 'General Medicine'}</p>
                  <div className="mt-1 flex items-center space-x-4 text-xs text-gray-600">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{new Date(next.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-gray-400" />
                      <span>{next.timeSlot?.start} – {next.timeSlot?.end}</span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  to="/patient/medical-records"
                  className="px-4 py-2 rounded-lg text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:border-[#10847e] transition-all"
                >
                  View Records
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent appointments */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#ff6f61]" />
                <span>Appointment History</span>
              </h2>
              <Link to="/patient/search-doctors" className="text-xs font-bold text-[#ff6f61] hover:underline">
                Book New →
              </Link>
            </div>
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#ff6f61]" />
              </div>
            ) : appointments.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-700">No appointments yet</p>
                <p className="text-xs text-gray-400 mt-0.5">Consult with certified doctors online in minutes</p>
                <Link
                  to="/patient/search-doctors"
                  className="mt-3 inline-block px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-[#ff6f61] hover:bg-[#e2584a]"
                >
                  Find a Doctor →
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {appointments.slice(0, 8).map(apt => (
                  <div key={apt._id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-full bg-teal-50 border border-teal-200 text-[#10847e] flex items-center justify-center text-xs font-bold">
                        {apt.doctor?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">Dr. {apt.doctor?.name || '—'}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(apt.date).toLocaleDateString('en-IN')} · {apt.timeSlot?.start}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={apt.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick actions */}
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <ArrowRight className="w-4 h-4 text-[#10847e]" />
              <span>{t('quickActions')}</span>
            </h2>
            {[
              { to: '/patient/search-doctors', icon: Search, label: t('searchDoctors'), color: 'text-[#ff6f61] bg-[#fff4f2]' },
              { to: '/patient/medical-records', icon: FileText, label: t('medicalRecords'), color: 'text-[#10847e] bg-[#e8f6f5]' },
              { to: '/profile', icon: User, label: t('profile'), color: 'text-purple-700 bg-purple-50' },
            ].map(({ to, icon: Icon, label, color }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center space-x-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100/80 border border-gray-100 hover:border-gray-200 transition-all group"
              >
                <div className={`w-9 h-9 rounded-lg ${color} flex items-center justify-center font-bold`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-bold text-gray-800 group-hover:text-[#ff6f61] transition-colors">{label}</span>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#ff6f61] ml-auto transition-colors" />
              </Link>
            ))}
          </div>
        </div>
      </div>
    </Layout>
  );
}