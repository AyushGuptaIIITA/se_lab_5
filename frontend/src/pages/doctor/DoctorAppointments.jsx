import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, Clock, Video, FileText, Check, X, Search, Filter, 
  RefreshCw, Loader2, User, ChevronRight, AlertCircle, PhoneOff, 
  ShieldCheck, ArrowRight
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DoctorAppointments() {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [alert, setAlert] = useState(null);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/appointments?limit=100');
      setAppointments(res.data.appointments || []);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load consultation list.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const handleStatusUpdate = async (id, status) => {
    setActionLoading(id + status);
    setAlert(null);
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      setAlert({ type: 'success', message: `Appointment marked as ${status}.` });
      fetchAppointments();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update status.' });
    } finally {
      setActionLoading('');
    }
  };

  const filtered = appointments.filter(apt => {
    if (statusFilter !== 'all' && apt.status !== statusFilter) return false;
    if (dateFilter) {
      const aptDate = new Date(apt.date).toISOString().split('T')[0];
      if (aptDate !== dateFilter) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const pName = apt.patient?.name?.toLowerCase() || '';
      const symp = apt.symptoms?.toLowerCase() || '';
      if (!pName.includes(q) && !symp.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: appointments.length,
    pending: appointments.filter(a => a.status === 'pending').length,
    confirmed: appointments.filter(a => a.status === 'confirmed').length,
    'in-progress': appointments.filter(a => a.status === 'in-progress').length,
    completed: appointments.filter(a => a.status === 'completed').length,
    cancelled: appointments.filter(a => a.status === 'cancelled').length,
  };

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>All Doctor Consultations & Meetings</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Centralized clinical hub to manage all pending, confirmed, active and past patient consultations
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
              to="/doctor/schedule"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Manage Availability Slots</span>
            </Link>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="glass-panel p-4 rounded-2xl bg-white shadow-card space-y-3">
          {/* Status Tabs */}
          <div className="flex flex-wrap gap-1.5 border-b border-slate-100 pb-3">
            {[
              { id: 'all', label: 'All Consultations' },
              { id: 'pending', label: 'Pending Invitations' },
              { id: 'confirmed', label: 'Confirmed' },
              { id: 'in-progress', label: 'In-Progress (Active)' },
              { id: 'completed', label: 'Completed' },
              { id: 'incomplete', label: 'Incomplete' },
              { id: 'cancelled', label: 'Cancelled' },
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
                  {counts[tab.id] || 0}
                </span>
              </button>
            ))}
          </div>

          {/* Search inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="relative sm:col-span-2">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search by patient name or reported symptoms..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2 rounded-xl text-xs"
              />
            </div>
            <div>
              <input
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                title="Filter by appointment date"
              />
            </div>
          </div>
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="py-20 flex items-center justify-center glass-panel bg-white rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 glass-panel bg-white rounded-2xl shadow-card">
            <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700">No consultations found matching your filter</p>
            <p className="text-xs text-slate-400 mt-1">Try resetting the status filter or searching for another patient</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(apt => {
              const isToday = new Date(apt.date).toDateString() === new Date().toDateString();
              return (
                <div
                  key={apt._id}
                  className="glass-card p-5 rounded-2xl border border-slate-200 bg-white hover:shadow-card-hover transition-all space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-base flex-shrink-0 shadow-xs">
                        {apt.patient?.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{apt.patient?.name || 'Patient'}</h3>
                          {isToday && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                              Today
                            </span>
                          )}
                          <span className="text-xs text-slate-400">· ID: #{apt._id?.slice(-6)}</span>
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
                      {/* 1. Pending Actions */}
                      {apt.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'confirmed')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-colors disabled:opacity-50"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Confirm Invitation</span>
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'cancelled')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 hover:bg-rose-100 transition-colors disabled:opacity-50"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Decline</span>
                          </button>
                        </>
                      )}

                      {/* 2. Confirmed Actions */}
                      {apt.status === 'confirmed' && (
                        <>
                          <Link
                            to={`/doctor/consultation/${apt._id}`}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all hover:scale-105 active:scale-95"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Enter Call</span>
                          </Link>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'completed')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            title="Mark completed directly if consultation finished early"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Mark Complete</span>
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'incomplete')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                            title="Mark incomplete if call was dropped or unattended"
                          >
                            <span>Incomplete</span>
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'cancelled')}
                            disabled={!!actionLoading}
                            className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-400 hover:text-rose-600 transition-colors"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* 3. In-Progress Actions: Rejoin, Complete, or Incomplete */}
                      {apt.status === 'in-progress' && (
                        <>
                          <Link
                            to={`/doctor/consultation/${apt._id}`}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-500/20 transition-all hover:scale-105"
                            title="Rejoin active consultation after accidental drop"
                          >
                            <Video className="w-3.5 h-3.5" />
                            <span>Rejoin Call</span>
                          </Link>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'completed')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            title="Conclude and mark completed"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Complete</span>
                          </button>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'incomplete')}
                            disabled={!!actionLoading}
                            className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
                            title="Mark incomplete if dropped"
                          >
                            <span>Mark Incomplete</span>
                          </button>
                        </>
                      )}

                      {/* 4. Incomplete Status Badge & Re-open */}
                      {apt.status === 'incomplete' && (
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                            Marked Incomplete
                          </span>
                          <button
                            onClick={() => handleStatusUpdate(apt._id, 'confirmed')}
                            disabled={!!actionLoading}
                            className="text-xs font-bold text-blue-600 hover:underline"
                          >
                            Re-Open
                          </button>
                        </div>
                      )}

                      {/* 5. Completed Actions: Strict prohibition on rejoining */}
                      {apt.status === 'completed' && (
                        <span className="flex items-center space-x-1 text-xs text-slate-400 font-semibold italic">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Consultation concluded (Rejoin disabled)</span>
                        </span>
                      )}
                    </div>

                    {/* Right side: e-Prescription Buttons (View & Edit) */}
                    <div className="flex items-center space-x-2">
                      {apt.prescription ? (
                        <>
                          <Link
                            to={`/prescription/appointment/${apt._id}`}
                            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-xs"
                            title="View and print official certified e-prescription"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View e-Prescription</span>
                          </Link>
                          <Link
                            to={`/doctor/prescription/${apt._id}`}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 transition-colors"
                            title="Edit prescription medicines or instructions"
                          >
                            <span>Edit</span>
                          </Link>
                        </>
                      ) : (
                        <Link
                          to={`/doctor/prescription/${apt._id}`}
                          className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                          title="Write digitally signed e-prescription directly without starting call"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Write e-Prescription</span>
                        </Link>
                      )}
                    </div>
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
