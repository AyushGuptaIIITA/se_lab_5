import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Stethoscope, User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import AlertBanner from '../components/AlertBanner';

const SPECIALIZATIONS = ['General Medicine', 'Pediatrics', 'Cardiology', 'Dermatology', 'Orthopedics', 'ENT', 'Psychiatry', 'Gynecology', 'Neurology', 'Ophthalmology'];

function PasswordStrength({ password }) {
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  const colors = ['bg-rose-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];
  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  return password ? (
    <div className="mt-1.5">
      <div className="grid grid-cols-4 gap-1 h-1.5 mb-1">
        {[0,1,2,3].map(i => (
          <div key={i} className={`rounded-full transition-colors ${i < score ? colors[score-1] : 'bg-slate-200'}`} />
        ))}
      </div>
      <span className="text-[11px] font-semibold text-slate-500">{labels[score-1] || 'Enter password'}</span>
    </div>
  ) : null;
}

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '', role: 'patient', specialization: '', licenseNumber: '', bio: '', consultationFee: '', gender: 'male', bloodGroup: '', dateOfBirth: '', village: '', district: '', state: '', pincode: '', emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);
  const { register } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (form.password.length < 6) { setAlert({ type: 'error', message: 'Password must be at least 6 characters.' }); return; }
    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, password: form.password, phone: form.phone, role: form.role,
        ...(form.role === 'doctor' && { specialization: form.specialization, licenseNumber: form.licenseNumber, bio: form.bio, consultationFee: Number(form.consultationFee) || 200 }),
        ...(form.role === 'patient' && { gender: form.gender, bloodGroup: form.bloodGroup, dateOfBirth: form.dateOfBirth || undefined, address: { village: form.village, district: form.district, state: form.state, pincode: form.pincode }, emergencyContact: { name: form.emergencyContactName, phone: form.emergencyContactPhone, relation: form.emergencyContactRelation } }),
      };
      const res = await register(payload);
      setAlert({ type: 'success', message: t('registerSuccess') });
      const user = res.user;
      if (user) setTimeout(() => navigate(`/${user.role}/dashboard`), 700);
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Registration failed.' });
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center p-4 bg-slate-50">
      <div className="w-full max-w-lg text-center mb-5 mt-4 animate-fade-in">
        <div className="inline-flex items-center justify-center space-x-2.5 mb-2">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <Stethoscope className="w-6 h-6 text-white" />
          </div>
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Tele<span className="text-blue-600">Med</span>
          </span>
        </div>
        <p className="text-sm font-semibold text-slate-700">Create your TeleMed Account</p>
      </div>

      <div className="relative w-full max-w-lg mb-8 animate-slide-up">
        <div className="bg-white p-7 sm:p-8 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 space-y-5">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{t('register')}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Join the TeleMed healthcare and e-prescription network</p>
          </div>

          {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">{t('selectRole')}</label>
              <div className="grid grid-cols-3 gap-2">
                {['patient', 'doctor', 'admin'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`p-3 rounded-xl border text-xs font-bold capitalize transition-all ${
                      form.role === r
                        ? 'bg-blue-50 border-blue-600 text-blue-700 shadow-xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {r === 'patient' ? '👤' : r === 'doctor' ? '🩺' : '⚡'} {t(r)}
                  </button>
                ))}
              </div>
            </div>

            {/* Common fields */}
            {[
              { field: 'name', label: t('name'), type: 'text', icon: <User className="w-4 h-4" />, placeholder: 'Full Name' },
              { field: 'email', label: t('email'), type: 'email', icon: <Mail className="w-4 h-4" />, placeholder: 'email@example.com' },
              { field: 'phone', label: t('phone'), type: 'tel', icon: <Phone className="w-4 h-4" />, placeholder: '+91 98765 43210' },
            ].map(({ field, label, type, icon, placeholder }) => (
              <div key={field}>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{label}</label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</div>
                  <input
                    type={type}
                    required={field !== 'phone'}
                    placeholder={placeholder}
                    value={form[field]}
                    onChange={set(field)}
                    className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400"
                  />
                </div>
              </div>
            ))}

            {/* Password */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">{t('password')}</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={set('password')}
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
              <PasswordStrength password={form.password} />
            </div>

            {/* Doctor-specific fields */}
            {form.role === 'doctor' && (
              <div className="space-y-3 p-4 rounded-xl bg-blue-50/70 border border-blue-200 animate-fade-in">
                <p className="text-xs font-bold text-blue-700 uppercase">Doctor Professional Details</p>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('specialization')}</label>
                  <select
                    value={form.specialization}
                    onChange={set('specialization')}
                    required
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                  >
                    <option value="">Select specialization...</option>
                    {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('licenseNumber')}</label>
                  <input
                    type="text"
                    required
                    placeholder="MCI-12345"
                    value={form.licenseNumber}
                    onChange={set('licenseNumber')}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('consultationFee')} (₹)</label>
                  <input
                    type="number"
                    placeholder="200"
                    value={form.consultationFee}
                    onChange={set('consultationFee')}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('bio')}</label>
                  <textarea
                    rows={2}
                    placeholder="Brief professional bio..."
                    value={form.bio}
                    onChange={set('bio')}
                    className="glass-input w-full px-3 py-2 rounded-xl text-sm bg-white resize-none"
                  />
                </div>
              </div>
            )}

            {/* Patient-specific fields */}
            {form.role === 'patient' && (
              <div className="space-y-3 p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 animate-fade-in">
                <p className="text-xs font-bold text-emerald-800 uppercase">Patient Profile Information</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('gender')}</label>
                    <select
                      value={form.gender}
                      onChange={set('gender')}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                    >
                      <option value="male">{t('male')}</option>
                      <option value="female">{t('female')}</option>
                      <option value="other">{t('other')}</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('bloodGroup')}</label>
                    <select
                      value={form.bloodGroup}
                      onChange={set('bloodGroup')}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                    >
                      <option value="">Select...</option>
                      {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('village')}</label>
                  <input
                    type="text"
                    placeholder="Village / Town"
                    value={form.village}
                    onChange={set('village')}
                    className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('district')}</label>
                    <input
                      type="text"
                      placeholder="District"
                      value={form.district}
                      onChange={set('district')}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">{t('state')}</label>
                    <input
                      type="text"
                      placeholder="State"
                      value={form.state}
                      onChange={set('state')}
                      className="glass-input w-full px-3 py-2.5 rounded-xl text-sm bg-white"
                    />
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Creating account...</span>
                </>
              ) : (
                <>
                  <span>{t('register')}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="text-center text-xs text-slate-600">
            {t('alreadyHaveAccount')}{' '}
            <Link to="/" className="font-bold text-blue-600 hover:underline">
              {t('login')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}