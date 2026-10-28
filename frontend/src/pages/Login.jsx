import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AlertBanner from '../components/AlertBanner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);
    try {
      const user = await login(email, password);
      setAlert({ type: 'success', message: t('loginSuccess') });
      setTimeout(() => {
        navigate(`/${user.role}/dashboard`);
      }, 600);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || t('loginError') });
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    const creds = {
      patient: { email: 'patient1@demo.com', password: 'password123' },
      doctor: { email: 'dr.sharma@demo.com', password: 'password123' },
      admin: { email: 'admin@demo.com', password: 'password123' },
    };
    setEmail(creds[role].email);
    setPassword(creds[role].password);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-500/8 rounded-full blur-3xl pointer-events-none" />
      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-teal-600 to-indigo-500 shadow-xl shadow-indigo-500/25 mb-4">
            <Stethoscope className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">{t('appName')}</h1>
          <p className="text-sm text-slate-400 mt-1">{t('tagline')}</p>
        </div>

        <div className="glass-panel p-6 sm:p-8 rounded-2xl shadow-2xl space-y-5">
          {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type="email" required placeholder="name@example.com" value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('password')}</label>
                <Link to="/forgot-password" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">{t('forgotPassword')}</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input type={showPass ? 'text' : 'password'} required placeholder="••••••••" value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 active:scale-[0.99] transition-all disabled:opacity-50">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></> : <><span>{t('login')}</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          {/* Demo Credentials */}
          <div className="pt-4 border-t border-slate-800">
            <p className="text-xs text-slate-400 mb-2 flex items-center space-x-1"><Sparkles className="w-3.5 h-3.5 text-amber-400" /><span>Quick test credentials:</span></p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {['patient', 'doctor', 'admin'].map(role => (
                <button key={role} type="button" onClick={() => fillDemo(role)}
                  className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 capitalize transition-colors">
                  {role === 'patient' ? '👤' : role === 'doctor' ? '🩺' : '⚡'} {role}
                </button>
              ))}
            </div>
          </div>

          <div className="text-center text-xs text-slate-400">
            {t('dontHaveAccount')}{' '}
            <Link to="/register" className="font-semibold text-indigo-400 hover:text-indigo-300">{t('register')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
