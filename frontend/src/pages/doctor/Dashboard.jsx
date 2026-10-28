import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, Clock, Users, CheckCircle, Video, FileText, RefreshCw, ChevronRight, Loader2, Check, X, Stethoscope, ShieldCheck } from 'lucide-react';
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
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* 1mg Doctor Banner */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#10847e] to-[#0c6b66] text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/20 text-white border border-white/30">
                  Doctor Clinical Workspace
                </span>
                <span className="flex items-center space-x-1 text-xs text-white/90">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Available for Consultations</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black">
                Dr. {user?.name} 🩺
              </h1>
              <p className="text-sm text-white/90 mt-1">
                {user?.specialization} · License: {user?.licenseNumber || 'MCI-VERIFIED'} · Fee: ₹{user?.consultationFee || 200}
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
                to="/doctor/schedule"
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold text-[#10847e] bg-white hover:bg-gray-50 shadow-md transition-all"
              >
                <Calendar className="w-4 h-4" />
                <span>{t('manageSchedule')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Calendar}
            label="Today's Patients"
            value={todayApts.length}
            colorClass="bg-orange-50 text-[#ff6f61]"
            borderClass="border-orange-100"
          />
          <StatCard
            icon={Clock}
            label="Pending Confirmations"
            value={pending.length}
            colorClass="bg-amber-50 text-amber-700"
            borderClass="border-amber-100"
          />
          <StatCard
            icon={CheckCircle}
            label="Completed Sessions"
            value={completed.length}
            colorClass="bg-teal-50 text-[#10847e]"
            borderClass="border-teal-100"
          />
          <StatCard
            icon={Users}
            label="Total Registered Patients"
            value={[...new Set(appointments.map(a => a.patient?._id))].length}
            colorClass="bg-purple-50 text-purple-700"
            borderClass="border-purple-100"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Today's schedule */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <Calendar className="w-4 h-4 text-[#ff6f61]" />
                <span>{t('todaySchedule')}</span>
              </h2>
              <span className="text-xs font-semibold text-gray-500">
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
            {loading ? (
              <div className="py-12 flex items-center justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-[#10847e]" />
              </div>
            ) : todayApts.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                <Calendar className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-700">No consultations scheduled for today</p>
                <p className="text-xs text-gray-400 mt-0.5">Your schedule slots will appear here when patients book</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {todayApts.map(apt => (
                  <div key={apt._id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-teal-50 text-[#10847e] border border-teal-200 flex items-center justify-center font-bold text-sm">
                          {apt.patient?.name?.charAt(0) || 'P'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{apt.patient?.name || 'Unknown Patient'}</p>
                          <p className="text-xs text-gray-500">
                            {apt.timeSlot?.start} – {apt.timeSlot?.end} · <span className="capitalize font-semibold text-[#10847e]">{apt.type}</span>
                          </p>
                          {apt.symptoms && (
                            <p className="text-xs text-gray-600 mt-1 bg-gray-50 p-1.5 rounded border border-gray-100 line-clamp-1">
                              <strong>Symptoms:</strong> {apt.symptoms}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <StatusBadge status={apt.status} />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 mt-3 pl-13">
                      {apt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatus(apt._id, 'confirmed')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-[#10847e] hover:bg-[#0c6b66] transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Slot</span>
                          </button>
                          <button
                            onClick={() => handleStatus(apt._id, 'cancelled')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </>
                      )}
                      {apt.status === 'confirmed' && (
                        <Link
                          to={`/doctor/consultation/${apt._id}`}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-[#ff6f61] hover:bg-[#e2584a] shadow-xs transition-colors"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Enter Consultation Room</span>
                        </Link>
                      )}
                      {apt.status === 'completed' && (
                        <Link
                          to={`/doctor/prescription/${apt._id}`}
                          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-[#10847e] bg-[#e8f6f5] border border-teal-200 hover:bg-teal-100 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Issue e-Prescription</span>
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-[#fe8d00]" />
                <span>Next 7 Days Schedule</span>
              </h2>
            </div>
            {upcoming.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">
                <p className="font-semibold text-gray-700">No upcoming appointments</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {upcoming.slice(0, 10).map(apt => (
                  <div key={apt._id} className="p-3.5 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{apt.patient?.name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(apt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · {apt.timeSlot?.start}
                        </p>
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