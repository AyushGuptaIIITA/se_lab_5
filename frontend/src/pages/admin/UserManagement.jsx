import React, { useEffect, useState } from 'react';
import { Users, Search, Filter, Trash2, Loader2, ChevronLeft, ChevronRight, AlertTriangle, ShieldCheck } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

const roleBadge = {
  patient: 'bg-teal-50 text-[#10847e] border-teal-200',
  doctor: 'bg-orange-50 text-[#ff6f61] border-orange-200',
  admin: 'bg-purple-50 text-purple-700 border-purple-200'
};

function ConfirmInline({ message, onConfirm, onCancel }) {
  return (
    <div className="flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2 text-xs">
      <AlertTriangle className="w-3.5 h-3.5 text-[#ff6f61] flex-shrink-0" />
      <span className="text-gray-800 font-semibold flex-1">{message}</span>
      <button
        onClick={onConfirm}
        className="px-2.5 py-1 rounded bg-[#ff6f61] text-white font-bold hover:bg-[#e2584a] transition-colors"
      >
        Yes
      </button>
      <button
        onClick={onCancel}
        className="px-2.5 py-1 rounded bg-gray-200 text-gray-700 font-bold hover:bg-gray-300 transition-colors"
      >
        No
      </button>
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
  const [confirm, setConfirm] = useState(null);
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
    } catch {
      setAlert({ type: 'error', message: 'Failed to load users.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, [page, roleFilter, statusFilter, search]);

  const handleToggleStatus = async (userId, currentStatus) => {
    setActionLoading(userId);
    setConfirm(null);
    try {
      const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
      await api.patch(`/admin/users/${userId}/status`, { status: nextStatus });
      setAlert({ type: 'success', message: `User marked as ${nextStatus}.` });
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update user.' });
    } finally {
      setActionLoading('');
    }
  };

  const handleDelete = async (userId) => {
    setActionLoading(userId);
    setConfirm(null);
    try {
      await api.delete(`/admin/users/${userId}`);
      setAlert({ type: 'success', message: 'User deleted successfully.' });
      fetchUsers();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete.' });
    } finally {
      setActionLoading('');
    }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
              <span className="text-[#10847e]">{t('userManagement')}</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage credentials, permissions, account suspensions & role allocations (SRS FR-10)</p>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 self-start">
            {total} Total Registered Accounts
          </span>
        </div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search user by name or email address..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              className="glass-input w-full pl-10 pr-4 py-2 rounded-lg text-xs"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={roleFilter}
              onChange={e => { setRoleFilter(e.target.value); setPage(1); }}
              className="glass-input px-3 py-2 rounded-lg text-xs bg-white"
            >
              <option value="">All Roles</option>
              <option value="patient">Patient</option>
              <option value="doctor">Doctor</option>
              <option value="admin">Admin</option>
            </select>
            <select
              value={statusFilter}
              onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
              className="glass-input px-3 py-2 rounded-lg text-xs bg-white"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">{t('name')}</th>
                  <th className="py-3 px-4">{t('email')}</th>
                  <th className="py-3 px-4">{t('role')}</th>
                  <th className="py-3 px-4">{t('status')}</th>
                  <th className="py-3 px-4">{t('dateJoined')}</th>
                  <th className="py-3 px-4 text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#ff6f61] mx-auto" />
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No matching user accounts found.
                    </td>
                  </tr>
                ) : users.map(u => (
                  <React.Fragment key={u._id}>
                    <tr className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-full bg-teal-50 border border-teal-200 text-[#10847e] flex items-center justify-center font-bold text-xs flex-shrink-0">
                            {u.name?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900">
                              {u.name}
                              {u._id === me?._id && <span className="ml-1 text-[10px] text-[#ff6f61] font-semibold">(You)</span>}
                            </p>
                            {u.specialization && <p className="text-[10px] text-[#10847e] font-semibold">{u.specialization}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">{u.email}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${roleBadge[u.role] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={u.status} /></td>
                      <td className="py-3 px-4 text-gray-500">{u.createdAt ? new Date(u.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                      <td className="py-3 px-4 text-right">
                        {u._id !== me?._id && (
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              onClick={() => setConfirm({ type: 'status', userId: u._id, currentStatus: u.status, message: u.status === 'active' ? t('confirmSuspend') : 'Activate this user?' })}
                              disabled={!!actionLoading}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold border transition-colors disabled:opacity-40 ${
                                u.status === 'active'
                                  ? 'border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                                  : 'border-teal-300 text-[#10847e] bg-teal-50 hover:bg-teal-100'
                              }`}
                            >
                              {u.status === 'active' ? t('suspendUser') : t('activateUser')}
                            </button>
                            <button
                              onClick={() => setConfirm({ type: 'delete', userId: u._id, message: t('confirmDelete') })}
                              disabled={!!actionLoading}
                              className="p-1 rounded text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors disabled:opacity-40"
                              title="Delete User"
                            >
                              {actionLoading === u._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                    {confirm?.userId === u._id && (
                      <tr>
                        <td colSpan={6} className="px-4 pb-3 bg-gray-50">
                          <ConfirmInline
                            message={confirm.message}
                            onConfirm={() => confirm.type === 'delete' ? handleDelete(u._id) : handleToggleStatus(u._id, confirm.currentStatus)}
                            onCancel={() => setConfirm(null)}
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
              <span>Page {page} of {totalPages} · {total} users</span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
                >
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