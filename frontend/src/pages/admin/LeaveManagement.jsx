import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Calendar, Loader2, MessageSquare } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';

const STATUS_COLORS = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  rejected: 'bg-rose-50 text-rose-700 border-rose-200',
};

const LEAVE_TYPE_LABELS = {
  sick: 'Sick Leave', casual: 'Casual Leave', emergency: 'Emergency Leave',
  personal: 'Personal Leave', conference: 'Conference/CME'
};

export default function LeaveManagement() {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [reviewing, setReviewing] = useState({});
  const [noteInputs, setNoteInputs] = useState({});

  const fetchLeaves = async () => {
    setLoading(true);
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await api.get(`/leaves${params}`);
      setLeaves(res.data.leaves || []);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load leave requests.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, [filterStatus]);

  const handleReview = async (leaveId, status) => {
    setReviewing(prev => ({ ...prev, [leaveId]: true }));
    try {
      const reviewNote = noteInputs[leaveId] || '';
      const res = await api.patch(`/leaves/${leaveId}/review`, { status, reviewNote });
      setAlert({ type: 'success', message: res.data.message });
      fetchLeaves();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to review leave.' });
    } finally {
      setReviewing(prev => ({ ...prev, [leaveId]: false }));
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const getDuration = (start, end) => {
    const diff = Math.round((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24)) + 1;
    return `${diff} day${diff !== 1 ? 's' : ''}`;
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Leave Management</h1>
            <p className="text-sm text-slate-500 mt-0.5">Review and approve/reject doctor leave requests</p>
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="glass-input px-3 py-2 rounded-xl text-sm font-semibold"
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : leaves.length === 0 ? (
          <div className="text-center py-12 glass-panel rounded-3xl bg-white">
            <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <p className="text-sm font-semibold text-slate-500">No leave requests {filterStatus && `with status "${filterStatus}"`}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {leaves.map(lv => (
              <div key={lv._id} className="glass-panel p-5 rounded-2xl bg-white shadow-card border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${STATUS_COLORS[lv.status]}`}>
                        {lv.status.charAt(0).toUpperCase() + lv.status.slice(1)}
                      </span>
                      <span className="text-xs font-bold text-slate-500 capitalize">{LEAVE_TYPE_LABELS[lv.type] || lv.type}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{lv.doctor?.name || 'Unknown Doctor'}</h3>
                    <p className="text-xs text-blue-600 font-semibold">{lv.doctor?.specialization || 'Physician'}</p>
                    <p className="text-xs text-slate-600">{lv.doctor?.email}</p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <div className="text-sm font-bold text-slate-900">{formatDate(lv.startDate)} → {formatDate(lv.endDate)}</div>
                    <div className="text-xs text-slate-500">{getDuration(lv.startDate, lv.endDate)}</div>
                    <div className="text-xs text-slate-400 capitalize">Handling: {lv.appointmentHandling}</div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700">
                  <span className="font-bold text-slate-500 block mb-0.5">Reason:</span>
                  {lv.reason}
                </div>

                {lv.status === 'pending' && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-bold text-slate-600">Review Note (optional)</span>
                    </div>
                    <input
                      type="text"
                      placeholder="Add a note for the doctor..."
                      value={noteInputs[lv._id] || ''}
                      onChange={e => setNoteInputs(prev => ({ ...prev, [lv._id]: e.target.value }))}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs"
                    />
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleReview(lv._id, 'approved')}
                        disabled={reviewing[lv._id]}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {reviewing[lv._id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
                        <span>Approve</span>
                      </button>
                      <button
                        onClick={() => handleReview(lv._id, 'rejected')}
                        disabled={reviewing[lv._id]}
                        className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors disabled:opacity-50"
                      >
                        <XCircle className="w-3.5 h-3.5" /><span>Reject</span>
                      </button>
                    </div>
                  </div>
                )}

                {lv.status !== 'pending' && lv.reviewedBy && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-0.5">
                    <span className="font-bold text-slate-500">Reviewed by {lv.reviewedBy?.name} on {formatDate(lv.reviewedAt)}</span>
                    {lv.reviewNote && <p className="text-slate-600 italic">"{lv.reviewNote}"</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
