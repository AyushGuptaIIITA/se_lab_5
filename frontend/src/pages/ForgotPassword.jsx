import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, Copy, Check, Stethoscope } from 'lucide-react';
import api from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';
import AlertBanner from '../components/AlertBanner';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();

  const handleRequestToken = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email });
      setToken(res.data.resetToken || '');
      setStep(2);
      setAlert({ type: 'success', message: 'Reset token generated! Use it below to set a new password.' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Email not found.' });
    } finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (newPassword.length < 6) { setAlert({ type: 'error', message: 'Password must be at least 6 characters.' }); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      setAlert({ type: 'success', message: 'Password reset! You can now sign in.' });
      setTimeout(() => { window.location.href = '/'; }, 1500);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Invalid or expired token.' });
    } finally { setLoading(false); }
  };

  const copyToken = () => { navigator.clipboard.writeText(token); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50">
      <div className="w-full max-w-md text-center mb-6 animate-fade-in">
        <div className="inline-flex items-center justify-center space-x-2.5 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tele<span className="text-blue-600">Med</span>
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-700">{t('resetPassword')}</p>
        <p className="text-xs text-slate-500">{step === 1 ? 'Enter your email to receive a password reset token' : 'Enter the token and create your new password'}</p>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 space-y-5">
          {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

          {step === 1 ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="Your registered email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating token...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Reset Token</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="w-full text-xs font-semibold text-slate-500 hover:text-blue-600 text-center py-1"
              >
                Already have a token? Enter it →
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {token && (
                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                  <div className="flex items-center justify-between text-xs text-slate-700 font-bold mb-1">
                    <span>Generated Token:</span>
                    <button type="button" onClick={copyToken} className="text-blue-600 hover:underline flex items-center space-x-1">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-xs text-blue-800 break-all select-all font-semibold">{token}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Reset Token</label>
                <input
                  type="text"
                  required
                  placeholder="Paste reset token here"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  className="glass-input font-mono w-full px-4 py-2.5 rounded-xl text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('newPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm placeholder-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Resetting password...</span>
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
                className="w-full text-xs font-semibold text-slate-500 hover:text-slate-800 text-center py-1"
              >
                ← Back
              </button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-100 text-center">
            <Link to="/" className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('backToLogin')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}