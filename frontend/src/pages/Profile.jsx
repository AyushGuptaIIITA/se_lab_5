import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, Loader2, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AlertBanner from '../components/AlertBanner';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

const SPECIALIZATIONS = ['General Medicine', 'Pediatrics', 'Cardiology', 'Dermatology', 'Orthopedics', 'ENT', 'Psychiatry', 'Gynecology', 'Neurology', 'Ophthalmology'];

export default function Profile() {
  const { user, updateUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [tab, setTab] = useState('info');
  const [form, setForm] = useState({
    name: '', email: '', phone: '', specialization: '', licenseNumber: '', bio: '', consultationFee: '',
    gender: '', bloodGroup: '', dateOfBirth: '', village: '', district: '', state: '', pincode: '',
    emergencyContactName: '', emergencyContactPhone: '', emergencyContactRelation: '',
  });
  const [passForm, setPassForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        specialization: user.specialization || '',
        licenseNumber: user.licenseNumber || '',
        bio: user.bio || '',
        consultationFee: user.consultationFee || '',
        gender: user.gender || '',
        bloodGroup: user.bloodGroup || '',
        dateOfBirth: user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '',
        village: user.address?.village || '',
        district: user.address?.district || '',
        state: user.address?.state || '',
        pincode: user.address?.pincode || '',
        emergencyContactName: user.emergencyContact?.name || '',
        emergencyContactPhone: user.emergencyContact?.phone || '',
        emergencyContactRelation: user.emergencyContact?.relation || '',
      });
    }
  }, [user]);

  const setF = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));
  const setP = (field) => (e) => setPassForm(f => ({ ...f, [field]: e.target.value }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);
    try {
      const payload = {
        name: form.name, email: form.email, phone: form.phone,
        ...(user?.role === 'doctor' && { specialization: form.specialization, licenseNumber: form.licenseNumber, bio: form.bio, consultationFee: Number(form.consultationFee) }),
        ...(user?.role === 'patient' && { gender: form.gender, bloodGroup: form.bloodGroup, dateOfBirth: form.dateOfBirth || undefined, address: { village: form.village, district: form.district, state: form.state, pincode: form.pincode }, emergencyContact: { name: form.emergencyContactName, phone: form.emergencyContactPhone, relation: form.emergencyContactRelation } }),
      };
      const res = await api.put('/user/profile/edit', payload);
      updateUser(res.data.user);
      setAlert({ type: 'success', message: t('profileUpdated') });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally { setLoading(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (passForm.newPassword !== passForm.confirmPassword) { setAlert({ type: 'error', message: 'New passwords do not match.' }); return; }
    if (passForm.newPassword.length < 6) { setAlert({ type: 'error', message: 'Password must be at least 6 characters.' }); return; }
    setLoading(true);
    try {
      await api.put('/user/change-password', { currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      setAlert({ type: 'success', message: t('passwordChanged') });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to change password.' });
    } finally { setLoading(false); }
  };

  const roleBadge = { patient: 'bg-blue-950 text-blue-300 border-blue-800/50', doctor: 'bg-emerald-950 text-emerald-300 border-emerald-800/50', admin: 'bg-purple-950 text-purple-300 border-purple-800/50' };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <button onClick={() => navigate(-1)} className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-400 mb-2 transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" /><span>Back</span>
          </button>
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-2xl font-bold text-white border border-indigo-500/30">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white">{user?.name}</h1>
              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider border mt-1 ${roleBadge[user?.role] || 'bg-slate-800 text-slate-300 border-slate-700'}`}>{t(user?.role || 'user')}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex space-x-2 border-b border-slate-800 pb-3">
          {['info', 'password'].map(tabName => (
            <button key={tabName} onClick={() => { setTab(tabName); setAlert(null); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${tab === tabName ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'}`}>
              {tabName === 'info' ? 'Profile Information' : 'Change Password'}
            </button>
          ))}
        </div>

        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="glass-panel p-6 rounded-2xl border border-slate-800 shadow-2xl">
          {tab === 'info' ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              {/* Common */}
              {[
                { field: 'name', label: t('name'), type: 'text', icon: <User className="w-4 h-4" />, required: true },
                { field: 'email', label: t('email'), type: 'email', icon: <Mail className="w-4 h-4" />, required: true },
                { field: 'phone', label: t('phone'), type: 'tel', icon: <Phone className="w-4 h-4" /> },
              ].map(({ field, label, type, icon, required }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{label}</label>
                  <div className="relative">
                    <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</div>
                    <input type={type} required={required} value={form[field]} onChange={setF(field)}
                      className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none" />
                  </div>
                </div>
              ))}

              {/* Doctor-specific */}
              {user?.role === 'doctor' && (
                <div className="space-y-3 p-4 rounded-xl bg-emerald-900/10 border border-emerald-800/30">
                  <p className="text-xs font-semibold text-emerald-400 uppercase">Doctor Details</p>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('specialization')}</label>
                    <select value={form.specialization} onChange={setF('specialization')} className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none">
                      <option value="">Select...</option>
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('licenseNumber')}</label>
                    <input type="text" value={form.licenseNumber} onChange={setF('licenseNumber')} className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('consultationFee')}</label>
                    <input type="number" value={form.consultationFee} onChange={setF('consultationFee')} className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('bio')}</label>
                    <textarea rows={3} value={form.bio} onChange={setF('bio')} className="glass-input w-full px-3 py-2 rounded-xl text-sm text-slate-100 focus:outline-none resize-none" />
                  </div>
                </div>
              )}

              {/* Patient-specific */}
              {user?.role === 'patient' && (
                <div className="space-y-3 p-4 rounded-xl bg-blue-900/10 border border-blue-800/30">
                  <p className="text-xs font-semibold text-blue-400 uppercase">Patient Details</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('gender')}</label>
                      <select value={form.gender} onChange={setF('gender')} className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none">
                        <option value="">Select...</option>
                        <option value="male">{t('male')}</option>
                        <option value="female">{t('female')}</option>
                        <option value="other">{t('other')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('bloodGroup')}</label>
                      <select value={form.bloodGroup} onChange={setF('bloodGroup')} className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none">
                        <option value="">Select...</option>
                        {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['village', 'district', 'state', 'pincode'].map(f => (
                      <div key={f}>
                        <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t(f)}</label>
                        <input type="text" value={form[f]} onChange={setF(f)} className="glass-input w-full px-3 py-2 rounded-xl text-sm text-slate-100 focus:outline-none" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <button type="submit" disabled={loading} className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50">
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></> : <><Save className="w-4 h-4" /><span>{t('save')}</span></>}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              {[
                { field: 'currentPassword', label: t('currentPassword') },
                { field: 'newPassword', label: t('newPassword') },
                { field: 'confirmPassword', label: t('confirmPassword') },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input type={showPass ? 'text' : 'password'} required value={passForm[field]} onChange={setP(field)}
                      className="glass-input w-full pl-10 pr-10 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
                    {field === 'confirmPassword' && (
                      <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button type="submit" disabled={loading} className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Updating...</span></> : <><Save className="w-4 h-4" /><span>Update Password</span></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}
