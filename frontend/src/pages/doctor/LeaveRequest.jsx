import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, FileText, AlertCircle, CheckCircle, Clock, Trash2, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';

const LEAVE_TYPES = [
  { value: 'sick', label: 'Sick Leave' },
  { value: 'casual', label: 'Casual Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'personal', label: 'Personal Leave' },
  { value: 'conference', label: 'Conference / CME' },
];

const HANDLING_OPTIONS = [
  { value: 'reschedule', label: 'Reschedule affected appointments' },
  { value: 'cancel', label: 'Cancel affected appointments' },
  { value: 'transfer', label: 'Transfer to available colleague' },
];

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

export default function LeaveRequest() {
  const navigate = useNavigate();
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);

  const [form, setForm] = useState({
    startDate: '',
    endDate: '',
    reason: '',
    type: 'casual',
    appointmentHandling: 'reschedule',
  });

  const fetchLeaves = async () => {
    try {
      const res = await api.get('/leaves');
      setLeaves(res.data.leaves || []);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load leave requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason.trim()) {
      setAlert({ type: 'error', message: 'Please fill all required fields.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/leaves', form);
      setAlert({ type: 'success', message: res.data.message });
      setForm({ startDate: '', endDate: '', reason: '', type: 'casual', appointmentHandling: 'reschedule' });
      fetchLeaves();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit leave request.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = async (leaveId) => {
    if (!window.confirm('Cancel this leave request?')) return;
    try {
      await api.delete(`/leaves/${leaveId}`);
      setAlert({ type: 'success', message: 'Leave request cancelled.' });
      fetchLeaves();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to cancel leave.' });
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-6 px-4 space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Leave Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Apply for leave — requires admin approval before taking effect</p>
          </div>
        </div>

        {/* Leave Application Form */}
        <div className="glass-panel p-6 rounded-3xl bg-white shadow-card border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <FileText className="w-4 h-4 text-blue-600" /><span>Apply for Leave</span>
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Start Date *</label>
                <input
                  type="date"
                  value={form.startDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={e => handleChange('startDate', e.target.value)}
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">End Date *</label>
                <input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || new Date().toISOString().split('T')[0]}
                  onChange={e => handleChange('endDate', e.target.value)}
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Leave Type *</label>
                <select
                  value={form.type}
                  onChange={e => handleChange('type', e.target.value)}
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                >
                  {LEAVE_TYPES.map(lt => (
                    <option key={lt.value} value={lt.value}>{lt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Appointment Handling</label>
                <select
                  value={form.appointmentHandling}
                  onChange={e => handleChange('appointmentHandling', e.target.value)}
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                >
                  {HANDLING_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Reason *</label>
              <textarea
                rows={3}
                value={form.reason}
                onChange={e => handleChange('reason', e.target.value)}
                placeholder="Provide a brief reason for the leave..."
                className="glass-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800">Your leave request will be reviewed by the hospital admin. You'll be notified once it's approved or rejected.</p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Submitting...</span></> : <><Calendar className="w-4 h-4" /><span>Submit Leave Request</span></>}
            </button>
          </form>
        </div>

        {/* My Leave Requests */}
        <div className="glass-panel p-6 rounded-3xl bg-white shadow-card border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Clock className="w-4 h-4 text-blue-600" /><span>My Leave History</span>
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <Calendar className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold">No leave requests yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {leaves.map(lv => (
                <div key={lv._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border capitalize ${STATUS_COLORS[lv.status]}`}>
                        {lv.status}
                      </span>
                      <span className="text-xs font-bold text-slate-800 capitalize">{LEAVE_TYPES.find(t => t.value === lv.type)?.label || lv.type}</span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium">
                      {formatDate(lv.startDate)} → {formatDate(lv.endDate)}
                    </p>
                    <p className="text-xs text-slate-500">{lv.reason}</p>
                    {lv.reviewNote && (
                      <div className="text-xs text-slate-600 italic border-l-2 border-slate-300 pl-2 mt-1">
                        Admin note: {lv.reviewNote}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    {lv.status === 'pending' && (
                      <button
                        onClick={() => handleCancel(lv._id)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" /><span>Cancel</span>
                      </button>
                    )}
                    {lv.status === 'approved' && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
