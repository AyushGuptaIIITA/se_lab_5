import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, KeyRound, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, CheckCircle, AlertCircle, Copy, Check } from 'lucide-react';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 1 = Request Token, 2 = Set New Password
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();

  // Step 1: Request Reset Token
  const handleRequestToken = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setToken(res.data.resetToken);
      setStep(2);
      setAlert({
        type: 'success',
        message: res.data.message || 'Token generated! Proceed to set your new password below.',
      });
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to generate reset token. Make sure email exists.',
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Reset Password with Token
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAlert(null);

    if (newPassword.length < 6) {
      setAlert({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/reset-password', { token, newPassword });
      setAlert({
        type: 'success',
        message: res.data.message || 'Password reset successfully! Redirecting to login...',
      });
      setTimeout(() => {
        navigate('/');
      }, 1500);
    } catch (err) {
      setAlert({
        type: 'error',
        message: err.response?.data?.message || 'Failed to reset password. Token may be invalid or expired.',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    navigator.clipboard.writeText(token);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="auth-screen min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="auth-card relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 shadow-xl shadow-amber-500/20 mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Password Recovery
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {step === 1 ? 'Enter your registered email to request a reset token' : 'Verify token and set a new secure password'}
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

          {step === 1 ? (
            /* STEP 1: Request Token Form */
            <form onSubmit={handleRequestToken} className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Registered Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 shadow-lg shadow-amber-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating Token...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Reset Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="text-xs text-slate-400 hover:text-slate-200 underline"
                >
                  Already have a reset token? Enter it here
                </button>
              </div>
            </form>
          ) : (
            /* STEP 2: Submit Token & Set New Password */
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Token Info Callout */}
              {token && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Generated Reset Token:</span>
                    <button
                      type="button"
                      onClick={copyToken}
                      className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                    >
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-xs text-indigo-300 break-all select-all">
                    {token}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Reset Token
                </label>
                <input
                  type="text"
                  required
                  placeholder="Paste your 40-character reset token"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="glass-input font-mono w-full px-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                />
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
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 active:scale-[0.99] transition-all duration-200 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating Password...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm & Reset Password</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back to request token
              </button>
            </form>
          )}

          {/* Footer Back Link */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <Link
              to="/"
              className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
