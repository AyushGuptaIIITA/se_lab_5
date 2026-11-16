import React, { useState, useEffect } from 'react';
import { Shield, ShieldOff, UserCheck, Calendar, Loader2, AlertCircle, Trash2, Search } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';

export default function AdminDelegation() {
  const [delegations, setDelegations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [alert, setAlert] = useState(null);
  const [userSearch, setUserSearch] = useState('');

  const [form, setForm] = useState({
    userId: '',
    reason: '',
    startDate: '',
    endDate: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const fetchData = async () => {
    setLoading(true);
    try {
      const [delegRes, usersRes] = await Promise.all([
        api.get('/admin/delegates'),
        api.get('/admin/users?limit=100')
      ]);
      setDelegations(delegRes.data.delegations || []);
      // Show only active doctors (delegation target is restricted to doctors only)
      setUsers((usersRes.data.users || []).filter(u => u.role === 'doctor' && u.status === 'active'));
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleDelegate = async (e) => {
    e.preventDefault();
    if (!form.userId || !form.reason || !form.startDate || !form.endDate) {
      setAlert({ type: 'error', message: 'All fields are required.' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post('/admin/delegate', form);
      setAlert({ type: 'success', message: res.data.message });
      setForm({ userId: '', reason: '', startDate: '', endDate: '' });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delegate admin role.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (delegationId, name) => {
    if (!window.confirm(`Revoke admin access from ${name}?`)) return;
    try {
      const res = await api.delete(`/admin/delegate/${delegationId}`);
      setAlert({ type: 'success', message: res.data.message });
      fetchData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to revoke delegation.' });
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

  const isExpired = (d) => new Date(d) < new Date();

  const filteredUsers = users.filter(u =>
    u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  const activeDelegations = delegations.filter(d => d.isActive && !isExpired(d.endDate));
  const pastDelegations = delegations.filter(d => !d.isActive || isExpired(d.endDate));

  return (
    <Layout>
      <div className="max-w-5xl mx-auto py-6 px-4 space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div>
          <h1 className="text-2xl font-black text-slate-900">Admin Role Delegation</h1>
          <p className="text-sm text-slate-500 mt-0.5">Temporarily grant admin privileges to staff members during your absence</p>
        </div>

        {/* Grant Form */}
        <div className="glass-panel p-6 rounded-3xl bg-white shadow-card border border-slate-200">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Shield className="w-4 h-4 text-blue-600" /><span>Grant Temporary Admin Access</span>
          </h2>

          <form onSubmit={handleDelegate} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Doctor for Admin Delegation *</label>
              <div className="relative mb-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctors by name or email..."
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="glass-input w-full pl-9 pr-3 py-2 rounded-xl text-sm"
                />
              </div>
              <select
                value={form.userId}
                onChange={e => handleChange('userId', e.target.value)}
                className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                size={4}
                required
              >
                <option value="">-- Select a Doctor --</option>
                {filteredUsers.map(u => (
                  <option key={u._id} value={u._id}>
                    {u.name.startsWith('Dr.') ? u.name : `Dr. ${u.name}`} ({u.specialization || 'Consultant Physician'}) — {u.email}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Start Date *</label>
                <input
                  type="date"
                  value={form.startDate}
                  min={today}
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
                  min={form.startDate || today}
                  onChange={e => handleChange('endDate', e.target.value)}
                  className="glass-input w-full px-3 py-2.5 rounded-xl text-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">Reason for Delegation *</label>
              <textarea
                rows={2}
                value={form.reason}
                onChange={e => handleChange('reason', e.target.value)}
                placeholder="e.g. Annual leave from Dec 20-27, covering hospital admin duties"
                className="glass-input w-full px-3 py-2.5 rounded-xl text-sm resize-none"
                required
              />
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                The delegated user will gain full admin privileges (approve users, manage leaves, view reports) for the specified period.
                Only a full admin can create or revoke delegations.
              </p>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center space-x-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all disabled:opacity-50"
            >
              {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Granting...</span></> : <><Shield className="w-4 h-4" /><span>Grant Admin Access</span></>}
            </button>
          </form>
        </div>

        {/* Active Delegations */}
        {!loading && activeDelegations.length > 0 && (
          <div className="glass-panel p-6 rounded-3xl bg-white shadow-card border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Active Delegations ({activeDelegations.length})</span>
            </h2>
            <div className="space-y-3">
              {activeDelegations.map(d => (
                <div key={d._id} className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span className="font-bold text-slate-900">{d.delegatedTo?.name}</span>
                      <span className="text-xs text-emerald-700 font-semibold capitalize">({d.delegatedTo?.role})</span>
                    </div>
                    <p className="text-xs text-slate-600">{d.delegatedTo?.email}</p>
                    <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{formatDate(d.startDate)} → {formatDate(d.endDate)}</span>
                    </div>
                    <p className="text-xs text-slate-500 italic">Reason: {d.reason}</p>
                    <p className="text-xs text-slate-400">Delegated by: {d.delegatedBy?.name}</p>
                  </div>
                  <button
                    onClick={() => handleRevoke(d._id, d.delegatedTo?.name)}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-white hover:bg-rose-50 border border-rose-200 transition-colors flex-shrink-0"
                  >
                    <ShieldOff className="w-3.5 h-3.5" /><span>Revoke Access</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Past Delegations */}
        {!loading && pastDelegations.length > 0 && (
          <div className="glass-panel p-6 rounded-3xl bg-white shadow-card border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Trash2 className="w-4 h-4 text-slate-400" />
              <span>Past Delegations</span>
            </h2>
            <div className="space-y-3">
              {pastDelegations.map(d => (
                <div key={d._id} className="p-4 rounded-2xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 opacity-70">
                  <div className="space-y-0.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-700">{d.delegatedTo?.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${d.revokedAt ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-slate-200 text-slate-600 border-slate-300'}`}>
                        {d.revokedAt ? 'Revoked' : 'Expired'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(d.startDate)} → {formatDate(d.endDate)} · {d.reason}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
      </div>
    </Layout>
  );
}
