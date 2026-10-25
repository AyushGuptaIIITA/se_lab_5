import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Shield,
  ShieldAlert,
  UserCheck,
  Activity,
  Edit3,
  Trash2,
  Search,
  RefreshCw,
  Calendar,
  Mail,
  User,
  Clock,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Key
} from 'lucide-react';
import Navbar from './Navbar';
import api from '../services/api';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [userList, setUserList] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  const role = localStorage.getItem('role') || 'user';

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const res = await api.get('/user/dashboard');
      setData(res.data);

      // If user is admin, also fetch all registered users
      if (res.data.user?.role === 'admin' || role === 'admin') {
        const usersRes = await api.get('/user/admin/users');
        setUserList(usersRes.data.users || []);
      }
    } catch (err) {
      console.error('Dashboard load failed:', err);
      if (err.response?.status === 401) {
        navigate('/');
      } else {
        setAlert({ type: 'error', message: 'Could not refresh data. Server may be unreachable.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Admin Action: Toggle User Role
  const handleToggleRole = async (targetUserId, currentRole) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`Are you sure you want to change this user's role to ${newRole.toUpperCase()}?`)) return;

    setActionLoading(true);
    try {
      await api.patch(`/user/admin/users/${targetUserId}/role`, { role: newRole });
      setAlert({ type: 'success', message: `User role updated to ${newRole}!` });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update user role.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Admin Action: Delete User
  const handleDeleteUser = async (targetUserId, targetUsername) => {
    if (!window.confirm(`Are you sure you want to permanently delete user "${targetUsername}"?`)) return;

    setActionLoading(true);
    try {
      await api.delete(`/user/admin/users/${targetUserId}`);
      setAlert({ type: 'success', message: `User "${targetUsername}" was deleted successfully.` });
      fetchDashboardData();
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to delete user.' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = userList.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.username?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Alert notification banner */}
        {alert && (
          <div
            className={`p-4 rounded-xl flex items-center justify-between space-x-3 text-sm animate-in fade-in duration-200 ${
              alert.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              {alert.type === 'success' ? (
                <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
              )}
              <span>{alert.message}</span>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="text-xs opacity-75 hover:opacity-100 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Hero Header Banner */}
        <div
          className={`relative overflow-hidden rounded-2xl p-6 sm:p-8 border shadow-xl ${
            role === 'admin'
              ? 'bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border-purple-500/20'
              : 'bg-gradient-to-r from-indigo-900/40 via-blue-900/30 to-slate-900 border-indigo-500/20'
          }`}
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    role === 'admin'
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                      : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  }`}
                >
                  {role === 'admin' ? 'Administrator Control Portal' : 'User Member Portal'}
                </span>
                <span className="flex items-center space-x-1 text-xs text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Session Active</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">
                Welcome back, {data?.user?.username || 'Learner'}!
              </h1>
              <p className="text-sm text-slate-300 mt-1 max-w-2xl">
                {role === 'admin'
                  ? 'Manage system accounts, review real-time role distributions, and oversee SE Lab 5 identity records.'
                  : 'Your personal SE Lab 5 dashboard. Review account status, update your personal profile, or change credentials.'}
              </p>
            </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={fetchDashboardData}
                disabled={loading}
                title="Refresh latest data"
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <Link
                to="/edit-profile"
                className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 transition-all duration-200"
              >
                <Edit3 className="w-4 h-4" />
                <span>Edit Profile</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Stats Grid for Admin / User Overview */}
        {role === 'admin' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Users
                </span>
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-white mt-3">
                {data?.stats?.totalUsers ?? userList.length}
              </p>
              <p className="text-xs text-slate-400 mt-1">Registered in database</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
                  Administrators
                </span>
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-purple-300 mt-3">
                {data?.stats?.adminCount ?? userList.filter((u) => u.role === 'admin').length}
              </p>
              <p className="text-xs text-slate-400 mt-1">With elevated privileges</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Standard Users
                </span>
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <UserCheck className="w-4 h-4" />
                </div>
              </div>
              <p className="text-2xl font-bold text-emerald-300 mt-3">
                {data?.stats?.standardUserCount ?? userList.filter((u) => u.role === 'user').length}
              </p>
              <p className="text-xs text-slate-400 mt-1">Standard member accounts</p>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  System Health
                </span>
                <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-center space-x-2 mt-3">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-400 animate-ping" />
                <span className="text-lg font-bold text-teal-300">Operational</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">MongoDB & Express Active</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Account Username</p>
                <p className="text-base font-bold text-white mt-0.5">{data?.user?.username || '—'}</p>
                <p className="text-xs text-slate-500">ID: {data?.user?._id?.slice(-8) || '...'}</p>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-400 uppercase">Registered Email</p>
                <p className="text-base font-bold text-white mt-0.5 truncate">{data?.user?.email || '—'}</p>
                <p className="text-xs text-emerald-400">Verified & Active</p>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase">Assigned Role</p>
                <p className="text-base font-bold text-purple-300 mt-0.5 uppercase tracking-wide">
                  {data?.user?.role || role}
                </p>
                <p className="text-xs text-slate-500">JWT Authenticated</p>
              </div>
            </div>
          </div>
        )}

        {/* If Admin: User Management Table */}
        {role === 'admin' && (
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center space-x-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>User Directory & Role Management</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  View, filter, promote, or remove accounts across the system.
                </p>
              </div>

              {/* Search filter */}
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search user or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="glass-input w-full pl-9 pr-4 py-1.5 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Email Address</th>
                    <th className="py-3 px-4">Assigned Role</th>
                    <th className="py-3 px-4">Joined Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-slate-500">
                        {loading ? 'Loading users...' : 'No users match your search query.'}
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const isCurrentUser = u._id === data?.user?._id;
                      return (
                        <tr key={u._id} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-200">
                                {u.username ? u.username.charAt(0).toUpperCase() : 'U'}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-200">
                                  {u.username}{' '}
                                  {isCurrentUser && (
                                    <span className="ml-1 text-[10px] text-indigo-400 font-normal">(You)</span>
                                  )}
                                </p>
                                <p className="text-[10px] text-slate-500 font-mono">ID: {u._id.slice(-6)}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono text-slate-300">{u.email}</td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                u.role === 'admin'
                                  ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="py-3.5 px-4 text-right space-x-2">
                            {/* Toggle role button */}
                            <button
                              onClick={() => handleToggleRole(u._id, u.role)}
                              disabled={isCurrentUser || actionLoading}
                              title={
                                isCurrentUser
                                  ? 'Cannot change own role'
                                  : u.role === 'admin'
                                  ? 'Demote to user'
                                  : 'Promote to admin'
                              }
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors ${
                                isCurrentUser
                                  ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                                  : u.role === 'admin'
                                  ? 'border-amber-500/40 text-amber-300 hover:bg-amber-500/10'
                                  : 'border-purple-500/40 text-purple-300 hover:bg-purple-500/10'
                              }`}
                            >
                              {u.role === 'admin' ? 'Demote to User' : 'Make Admin'}
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteUser(u._id, u.username)}
                              disabled={isCurrentUser || actionLoading}
                              title={isCurrentUser ? 'Cannot delete own account here' : 'Delete user'}
                              className={`p-1.5 rounded-lg border transition-colors ${
                                isCurrentUser
                                  ? 'opacity-40 cursor-not-allowed border-slate-700 text-slate-500'
                                  : 'border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* User Card: Profile overview & quick links */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <UserCheck className="w-5 h-5 text-emerald-400" />
              <span>Personal Account Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-slate-400">Username:</span>
                <p className="text-sm font-semibold text-slate-200">{data?.user?.username || '—'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-slate-400">Email Address:</span>
                <p className="text-sm font-semibold text-slate-200">{data?.user?.email || '—'}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-slate-400">Account Role:</span>
                <p className="text-sm font-semibold text-indigo-300 uppercase">{data?.user?.role || role}</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-1">
                <span className="text-slate-400">Member Since:</span>
                <p className="text-sm font-semibold text-slate-200">
                  {data?.user?.createdAt ? new Date(data.user.createdAt).toLocaleDateString() : 'Active Member'}
                </p>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap gap-3">
              <Link
                to="/edit-profile"
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Update Account Information</span>
              </Link>
            </div>
          </div>

          {/* Quick Lab Summary / Info card */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-3">
            <h3 className="text-base font-bold text-white flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Lab Features Verified</span>
            </h3>
            <ul className="text-xs text-slate-300 space-y-2.5 pt-1">
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>JWT Authentication & Middleware</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Bcrypt Password Encryption</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Role-Based Access Control (User/Admin)</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Crypto Token Password Reset</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>Profile Management & Validation</span>
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
