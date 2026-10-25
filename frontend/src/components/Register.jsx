import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowRight, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../services/api';

export default function Register() {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'user',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const navigate = useNavigate();

  // Password strength calculation
  const getPasswordStrength = (pass) => {
    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score; // 0 to 5
  };

  const strength = getPasswordStrength(formData.password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (formData.password.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register', formData);
      setAlert({
        type: 'success',
        message: 'Account created successfully! Redirecting to login...',
      });
      setTimeout(() => {
        navigate('/');
      }, 1200);
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 shadow-xl shadow-indigo-500/25 mb-4">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Create an Account
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Join the SE Lab 5 portal with your assigned role
          </p>
        </div>

        {/* Card */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl">
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Full Name / Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ayush Gupta"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Email */}
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
                  placeholder="name@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 6 characters"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

              {/* Password strength meter */}
              {formData.password && (
                <div className="mt-2">
                  <div className="grid grid-cols-4 gap-1.5 h-1.5 mb-1">
                    <div
                      className={`rounded-full transition-colors ${
                        strength >= 1 ? 'bg-rose-500' : 'bg-slate-800'
                      }`}
                    />
                    <div
                      className={`rounded-full transition-colors ${
                        strength >= 2 ? 'bg-amber-500' : 'bg-slate-800'
                      }`}
                    />
                    <div
                      className={`rounded-full transition-colors ${
                        strength >= 3 ? 'bg-blue-500' : 'bg-slate-800'
                      }`}
                    />
                    <div
                      className={`rounded-full transition-colors ${
                        strength >= 4 ? 'bg-emerald-500' : 'bg-slate-800'
                      }`}
                    />
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {strength <= 1 && 'Weak password'}
                    {strength === 2 && 'Fair password'}
                    {strength === 3 && 'Good password'}
                    {strength >= 4 && 'Strong password!'}
                  </span>
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Select Account Role
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'user' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    formData.role === 'user'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-semibold">User Role</span>
                  <span className="text-[11px] text-slate-400 mt-1">Standard member access</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, role: 'admin' })}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    formData.role === 'admin'
                      ? 'bg-purple-600/20 border-purple-500 text-white shadow-md shadow-purple-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <span className="text-xs font-semibold">Admin Role</span>
                  <span className="text-[11px] text-slate-400 mt-1">Manage users & system</span>
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Complete Registration</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center text-xs text-slate-400">
            Already registered?{' '}
            <Link to="/" className="font-semibold text-indigo-400 hover:text-indigo-300 transition-colors">
              Sign In to Your Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
