import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, Clock, Video, FileText, Search, RefreshCw, Loader2, 
  User, CheckCircle, X, AlertCircle, ArrowRight, ShieldCheck, Stethoscope
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PatientAppointments() {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState('');
  const [alert, setAlert] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments?limit=100');
      setAppointments(res.data.appointments || []);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load your consultations.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleCancel = async (id) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    setActionLoading(id);
    setAlert(null);
    try {
      await api.patch(`/appointments/${id}/status`, { status: 'cancelled' });
      setAlert({ type: 'success', message: 'Appointment cancelled successfully.' });
      fetchAppointments();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to cancel appointment.' });
    } finally {
      setActionLoading('');
    }
  };

  const filtered = appointments.filter(apt => {
    if (statusFilter === 'active' && !['pending', 'confirmed', 'in-progress'].includes(apt.status)) return false;
    if (statusFilter === 'completed' && apt.status !== 'completed') return false;
    if (statusFilter === 'cancelled' && apt.status !== 'cancelled') return false;
    if (search) {
      const q = search.toLowerCase();
      const docName = apt.doctor?.name?.toLowerCase() || '';
      const spec = apt.doctor?.specialization?.toLowerCase() || '';
      if (!docName.includes(q) && !spec.includes(q)) return false;
    }
    return true;
  });

  const activeCount = appointments.filter(a => ['pending', 'confirmed', 'in-progress'].includes(a.status)).length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const cancelledCount = appointments.filter(a => a.status === 'cancelled').length;

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>My Consultation Schedule & History</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review your scheduled medical appointments, join live video rooms, and access prescriptions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchAppointments}
              disabled={loading}
              title="Refresh"
              className="p-2.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/patient/search-doctors"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all hover:scale-105"
            >
              <Search className="w-3.5 h-3.5" />
              <span>Book New Consultation</span>
            </Link>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="glass-panel p-4 rounded-2xl bg-white shadow-card space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {[
              { id: 'all', label: 'All Consultations', count: appointments.length },
              { id: 'active', label: 'Upcoming & Active', count: activeCount },
              { id: 'completed', label: 'Completed', count: completedCount },
              { id: 'cancelled', label: 'Cancelled', count: cancelledCount },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  statusFilter === tab.id ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Filter by doctor name or specialization..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Consultations List */}
        {loading ? (
          <div className="py-20 flex items-center justify-center glass-panel bg-white rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 glass-panel bg-white rounded-2xl shadow-card">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700">No appointments found</p>
            <p className="text-xs text-slate-400 mt-1">Book an appointment with certified specialists online</p>
            <Link
              to="/patient/search-doctors"
              className="mt-3 inline-block px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              Find a Doctor →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(apt => {
              const docName = apt.doctor?.name?.startsWith('Dr.') ? apt.doctor?.name : `Dr. ${apt.doctor?.name || 'Specialist'}`;
              const isToday = new Date(apt.date).toDateString() === new Date().toDateString();

              return (
                <div
                  key={apt._id}
                  className="glass-card p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-card-hover transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs">
                        {apt.doctor?.name?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{docName}</h3>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              Today
                            </span>
                          )}
                          <span className="text-xs font-semibold text-blue-600">· {apt.doctor?.specialization}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>{new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</span>
                          </span>
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>{apt.timeSlot?.start} – {apt.timeSlot?.end}</span>
                          </span>
                          <span className="capitalize font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[11px]">
                            {apt.type}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 flex-shrink-0">
                      <StatusBadge status={apt.status} />
                    </div>
                  </div>

                  {apt.symptoms && (
                    <div className="text-xs bg-slate-50/80 p-2.5 rounded-xl border border-slate-200/80">
                      <span className="font-bold text-slate-700">Reported Symptoms: </span>
                      <span className="text-slate-600">{apt.symptoms}</span>
                    </div>
                  )}

                  {/* Action Buttons Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Confirmed meeting: Join Video Consultation */}
                      {apt.status === 'confirmed' && (
                        <Link
                          to={`/patient/consultation/${apt._id}`}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Join Video Consultation</span>
                        </Link>
                      )}

                      {/* In-Progress meeting: Rejoin Video Consultation */}
                      {apt.status === 'in-progress' && (
                        <Link
                          to={`/patient/consultation/${apt._id}`}
                          className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all hover:scale-105 active:scale-95"
                          title="Rejoin active video session after accidental disconnect"
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Rejoin Active Call</span>
                        </Link>
                      )}

                      {/* Completed: View e-Prescription (Rejoining is strictly prohibited per user request) */}
                      {apt.status === 'completed' && (
                        <>
                          <Link
                            to={`/prescription/appointment/${apt._id}`}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View & Print e-Prescription</span>
                          </Link>
                          <span className="text-[11px] text-slate-400 italic">
                            (Consultation concluded — rejoining closed)
                          </span>
                        </>
                      )}

                      {/* Pending: Awaiting Doctor notice */}
                      {apt.status === 'pending' && (
                        <span className="text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-xl border border-amber-200">
                          Waiting for Doctor Confirmation
                        </span>
                      )}
                    </div>

                    {/* Cancel action if pending or confirmed */}
                    {['pending', 'confirmed'].includes(apt.status) && (
                      <button
                        onClick={() => handleCancel(apt._id)}
                        disabled={actionLoading === apt._id}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        {actionLoading === apt._id ? 'Cancelling...' : 'Cancel Appointment'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
