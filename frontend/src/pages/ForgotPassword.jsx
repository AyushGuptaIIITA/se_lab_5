import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { KeyRound, Mail, Lock, Eye, EyeOff, ArrowRight, ArrowLeft, Loader2, Copy, Check } from 'lucide-react';
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/6 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 shadow-xl shadow-amber-500/20 mb-4">
            <KeyRound className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{t('resetPassword')}</h1>
          <p className="text-sm text-slate-400 mt-1">{step === 1 ? 'Enter your email to receive a reset token' : 'Enter the token and set your new password'}</p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl space-y-5">
          {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

          {step === 1 ? (
            <form onSubmit={handleRequestToken} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{t('email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input type="email" required placeholder="Your registered email" value={email} onChange={e => setEmail(e.target.value)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-amber-500 to-rose-600 hover:from-amber-400 hover:to-rose-500 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></> : <><span>Generate Reset Token</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => setStep(2)} className="w-full text-xs text-slate-400 hover:text-slate-200 text-center py-1">
                Already have a token? Enter it →
              </button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              {token && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Generated Token:</span>
                    <button type="button" onClick={copyToken} className="text-indigo-400 hover:text-indigo-300 flex items-center space-x-1">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copied ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <p className="font-mono text-xs text-indigo-300 break-all select-all">{token}</p>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Reset Token</label>
                <input type="text" required placeholder="Paste reset token here" value={token} onChange={e => setToken(e.target.value)}
                  className="glass-input font-mono w-full px-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{t('newPassword')}</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input type={showPass ? 'text' : 'password'} required placeholder="Min 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                    className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading}
                className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Resetting...</span></> : <><span>Confirm & Reset Password</span><ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => setStep(1)} className="w-full text-xs text-slate-400 hover:text-slate-200 text-center py-1">← Back</button>
            </form>
          )}

          <div className="pt-4 border-t border-slate-800 text-center">
            <Link to="/" className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-400">
              <ArrowLeft className="w-3.5 h-3.5" /><span>{t('backToLogin')}</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
