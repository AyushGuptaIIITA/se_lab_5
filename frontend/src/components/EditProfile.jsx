import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, Save, ArrowLeft, Loader2, CheckCircle, AlertCircle, Shield } from 'lucide-react';
import Navbar from './Navbar';
import api from '../services/api';

export default function EditProfile() {
  const [activeTab, setActiveTab] = useState('info'); // 'info' | 'password'
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  
  // Change password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [alert, setAlert] = useState(null);

  const navigate = useNavigate();

  // Load current user profile
  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await api.get('/user/dashboard');
        if (res.data?.user) {
          setUsername(res.data.user.username || '');
          setEmail(res.data.user.email || '');
        }
      } catch (err) {
        setAlert({ type: 'error', message: 'Failed to load profile details.' });
      } finally {
        setFetching(false);
      }
    };
    loadProfile();
  }, []);

  // Update Username & Email
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      const res = await api.put('/user/profile/edit', { username, email });
      setAlert({ type: 'success', message: 'Profile details updated successfully!' });
      
      // Update stored user
      if (res.data?.user) {
        localStorage.setItem('user', JSON.stringify(res.data.user));
      }
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to update profile.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (newPassword.length < 6) {
      setAlert({ type: 'error', message: 'New password must be at least 6 characters long.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setAlert({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setLoading(true);

    try {
      const res = await api.put('/user/change-password', {
        currentPassword,
        newPassword,
      });
      setAlert({ type: 'success', message: res.data.message || 'Password changed successfully!' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to change password. Verify your current password.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8">
        {/* Navigation Breadcrumb */}
        <div className="mb-6">
          <Link
            to="/dashboard"
            className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-extrabold text-white mt-2">Account Settings</h1>
          <p className="text-xs text-slate-400">Update your identity information and security credentials</p>
        </div>

        {/* Tab switcher */}
        <div className="flex space-x-2 border-b border-slate-800 pb-3 mb-6">
          <button
            onClick={() => { setActiveTab('info'); setAlert(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'info'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Profile Information
          </button>
          <button
            onClick={() => { setActiveTab('password'); setAlert(null); }}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'password'
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            Change Password
          </button>
        </div>

        {/* Notification Banner */}
        {alert && (
          <div
            className={`mb-6 p-4 rounded-xl flex items-start space-x-3 text-sm animate-in fade-in duration-200 ${
              alert.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border border-rose-500/30 text-rose-300'
            }`}
          >
            {alert.type === 'success' ? (
              <CheckCircle className="w-5 h-5 flex-shrink-0 text-emerald-400 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400 mt-0.5" />
            )}
            <span className="flex-1">{alert.message}</span>
          </div>
        )}

        {/* Main Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-slate-800 shadow-2xl">
          {fetching ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <span>Loading current profile information...</span>
            </div>
          ) : activeTab === 'info' ? (
            /* TAB 1: Profile Info Form */
            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            /* TAB 2: Change Password Form */
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Current Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Enter existing password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-3 flex items-center space-x-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 py-2.5 px-5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Updating Password...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Update Password</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/dashboard')}
                  className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
