import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, Mail, Lock, Eye, EyeOff, ArrowRight, Loader2, Sparkles, ShieldCheck } from 'lucide-react';
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
      }, 500);
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
        <p className="text-sm font-semibold text-slate-700">Telemedicine Appointment & e-Prescription Platform</p>
        <p className="text-xs text-slate-500">Secure digital consultations with certified medical specialists</p>
      </div>

      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 space-y-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t('login')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Please sign in to access your appointments and health records</p>
          </div>

          {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('email')}</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('password')}</label>
                <Link to="/forgot-password" className="text-xs font-bold text-blue-600 hover:underline">
                  {t('forgotPassword')}
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
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
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>{t('login')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-600 font-bold mb-2 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Click to test with demo accounts:</span>
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => fillDemo('patient')}
                className="py-2 px-2 rounded-xl bg-emerald-50 hover:bg-emerald-100/70 text-emerald-700 font-bold border border-emerald-200 transition-colors text-center"
              >
                👤 Patient
              </button>
              <button
                type="button"
                onClick={() => fillDemo('doctor')}
                className="py-2 px-2 rounded-xl bg-blue-50 hover:bg-blue-100/70 text-blue-700 font-bold border border-blue-200 transition-colors text-center"
              >
                🩺 Doctor
              </button>
              <button
                type="button"
                onClick={() => fillDemo('admin')}
                className="py-2 px-2 rounded-xl bg-purple-50 hover:bg-purple-100/70 text-purple-700 font-bold border border-purple-200 transition-colors text-center"
              >
                ⚡ Admin
              </button>
            </div>
          </div>

          <div className="text-center text-xs text-slate-600">
            {t('dontHaveAccount')}{' '}
            <Link to="/register" className="font-bold text-blue-600 hover:underline">
              {t('register')}
            </Link>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center space-x-4 text-xs font-semibold text-slate-500">
          <span className="flex items-center space-x-1">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>MCI-Verified Care</span>
          </span>
          <span>•</span>
          <span>End-to-End Encrypted</span>
        </div>
      </div>
    </div>
  );
}