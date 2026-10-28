import React, { useEffect, useState } from 'react';
import { Users, Search, Filter, Trash2, Loader2, ChevronLeft, ChevronRight, Check, X, AlertTriangle } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const roleBadge = { patient: 'bg-blue-950 text-blue-300 border-blue-800/50', doctor: 'bg-emerald-950 text-emerald-300 border-emerald-800/50', admin: 'bg-purple-950 text-purple-300 border-purple-800/50' };

function ConfirmInline({ message, onConfirm, onCancel }) {
  return (
    <div className="flex items-center space-x-2 bg-slate-900 border border-rose-500/30 rounded-xl px-3 py-2 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
      <span className="text-slate-300 flex-1">{message}</span>
      <button onClick={onConfirm} className="px-2 py-1 rounded-lg bg-rose-600 text-white font-semibold hover:bg-rose-500 transition-colors">Yes</button>
      <button onClick={onCancel} className="px-2 py-1 rounded-lg bg-slate-700 text-slate-300 font-semibold hover:bg-slate-600 transition-colors">No</button>
    </div>
  );
}

export default function UserManagement() {
  const { user: me } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [alert, setAlert] = useState(null);
  const [actionLoading, setActionLoading] = useState('');
  const [confirm, setConfirm] = useState(null); // { type, userId, message }
  const LIMIT = 10;

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await api.get('/admin/users', { params });
      setUsers(res.data.users || []);
      setTotal(res.data.total || 0);
    } catch { setAlert({ type: 'error', message: 'Failed to load users.' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => { setPage(1); fetchUsers(); }, 400);
    return () => clearTimeout(timer);
  }, [search]);

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setActionLoading(userId);
    try {
      await api.patch(`/admin/users/${userId}/status`, { status: newStatus });
      setAlert({ type: 'success', message: `User ${newStatus} successfully.` });
      fetchUsers();
    } catch (err) { setAlert({ type: 'error', message: err.response?.data?.message || 'Failed.' }); }
    finally { setActionLoading(''); setConfirm(null); }
  };

  const handleDelete = async (userId) => {
    setActionLoading(userId);
    try {
      await api.delete(`/admin/users/${userId}`);
      setAlert({ type: 'success', message: 'User deleted.' });
      fetchUsers();
    } catch (err) { setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete.' }); }
    finally { setActionLoading(''); setConfirm(null); }
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2"><Users className="w-6 h-6 text-indigo-400" /><span>{t('userManagement')}</span></h1>
          <p className="text-sm text-slate-400 mt-1">Manage patient, doctor and admin accounts. Total: <span className="text-slate-200 font-semibold">{total}</span></p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
          </div>
          <select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }} className="glass-input px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none">
            <option value="">All Roles</option>
            <option value="patient">Patient</option>
            <option value="doctor">Doctor</option>
            <option value="admin">Admin</option>
          </select>
          <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} className="glass-input px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none">
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">{t('role')}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  <th className="py-3 px-4">{t('dateJoined')}</th>
                  <th className="py-3 px-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" /></td></tr>
                ) : users.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">No users found.</td></tr>
                ) : users.map(u => (
                  <React.Fragment key={u._id}>
                    <tr className="hover:bg-slate-900/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-200">{u.name}{u._id === me?._id && <span className="ml-1 text-[10px] text-indigo-400">(You)</span>}</p>
                            {u.specialization && <p className="text-[10px] text-slate-500">{u.specialization}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">{u.email}</td>
                      <td className="py-3.5 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${roleBadge[u.role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>{u.role}</span>
                      </td>
                      <td className="py-3.5 px-4"><StatusBadge status={u.status} /></td>
                      <td className="py-3.5 px-4 text-slate-400">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-end space-x-2">
                          {u._id !== me?._id && (
                            <>
                              <button
                                onClick={() => setConfirm({ type: 'status', userId: u._id, currentStatus: u.status, message: u.status === 'active' ? t('confirmSuspend') : 'Activate this user?' })}
                                disabled={!!actionLoading}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors disabled:opacity-40 ${u.status === 'active' ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10' : 'border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10'}`}>
                                {u.status === 'active' ? t('suspendUser') : t('activateUser')}
                              </button>
                              <button
                                onClick={() => setConfirm({ type: 'delete', userId: u._id, message: t('confirmDelete') })}
                                disabled={!!actionLoading}
                                className="p-1.5 rounded-lg border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 transition-colors disabled:opacity-40">
                                {actionLoading === u._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                    {/* Inline confirm row */}
                    {confirm?.userId === u._id && (
                      <tr><td colSpan={6} className="px-4 pb-3">
                        <ConfirmInline
                          message={confirm.message}
                          onConfirm={() => confirm.type === 'delete' ? handleDelete(u._id) : handleToggleStatus(u._id, confirm.currentStatus)}
                          onCancel={() => setConfirm(null)}
                        />
                      </td></tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Page {page} of {totalPages} · {total} users</span>
              <div className="flex items-center space-x-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
