import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Lock, Save, Eye, EyeOff, Loader2, ArrowLeft, ShieldCheck } from 'lucide-react';
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

  const setF = (f) => (e) => setForm(prev => ({ ...prev, [f]: e.target.value }));
  const setP = (f) => (e) => setPassForm(prev => ({ ...prev, [f]: e.target.value }));

  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setAlert(null);
    setLoading(true);
    try {
      const res = await api.put('/auth/me', form);
      updateUser(res.data.user);
      setAlert({ type: 'success', message: 'Profile details saved successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setAlert(null);
    if (passForm.newPassword !== passForm.confirmPassword) {
      setAlert({ type: 'error', message: 'New passwords do not match.' });
      return;
    }
    if (passForm.newPassword.length < 6) {
      setAlert({ type: 'error', message: 'New password must be at least 6 characters.' });
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/change-password', {
        currentPassword: passForm.currentPassword,
        newPassword: passForm.newPassword,
      });
      setAlert({ type: 'success', message: 'Password updated successfully!' });
      setPassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to change password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex items-center justify-between pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
              <span className="text-[#ff6f61]">Account & Clinical Profile</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Manage your personal details, contact info, and security settings</p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-orange-50 text-[#ff6f61] border border-orange-200">
            {user?.role} Account
          </span>
        </div>

        {/* Tab Controls */}
        <div className="flex border-b border-gray-200 gap-2">
          <button
            onClick={() => setTab('info')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 ${
              tab === 'info'
                ? 'border-[#ff6f61] text-[#ff6f61]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Personal & Clinical Information
          </button>
          <button
            onClick={() => setTab('password')}
            className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 ${
              tab === 'password'
                ? 'border-[#ff6f61] text-[#ff6f61]'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Security & Password
          </button>
        </div>

        <div className="bg-white p-6 sm:p-7 rounded-xl border border-gray-200 shadow-xs">
          {tab === 'info' ? (
            <form onSubmit={handleSaveInfo} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">{t('name')}</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={setF('name')}
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">{t('email')}</label>
                  <input
                    type="email"
                    disabled
                    value={form.email}
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-gray-100 text-gray-500 cursor-not-allowed"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">{t('phone')}</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={setF('phone')}
                    className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                  />
                </div>
              </div>

              {/* Doctor Details */}
              {user?.role === 'doctor' && (
                <div className="space-y-3 p-4 rounded-xl bg-orange-50/60 border border-orange-200">
                  <p className="text-xs font-bold text-[#ff6f61] uppercase">Practitioner Details</p>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('specialization')}</label>
                    <select
                      value={form.specialization}
                      onChange={setF('specialization')}
                      className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                    >
                      <option value="">Select...</option>
                      {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('licenseNumber')}</label>
                    <input
                      type="text"
                      value={form.licenseNumber}
                      onChange={setF('licenseNumber')}
                      className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('consultationFee')} (₹)</label>
                    <input
                      type="number"
                      value={form.consultationFee}
                      onChange={setF('consultationFee')}
                      className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('bio')}</label>
                    <textarea
                      rows={3}
                      value={form.bio}
                      onChange={setF('bio')}
                      className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Patient Details */}
              {user?.role === 'patient' && (
                <div className="space-y-3 p-4 rounded-xl bg-teal-50/60 border border-teal-200">
                  <p className="text-xs font-bold text-[#10847e] uppercase">Patient Profile Information</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('gender')}</label>
                      <select
                        value={form.gender}
                        onChange={setF('gender')}
                        className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                      >
                        <option value="">Select...</option>
                        <option value="male">{t('male')}</option>
                        <option value="female">{t('female')}</option>
                        <option value="other">{t('other')}</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t('bloodGroup')}</label>
                      <select
                        value={form.bloodGroup}
                        onChange={setF('bloodGroup')}
                        className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                      >
                        <option value="">Select...</option>
                        {['A+','A-','B+','B-','O+','O-','AB+','AB-'].map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {['village', 'district', 'state', 'pincode'].map(f => (
                      <div key={f}>
                        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">{t(f)}</label>
                        <input
                          type="text"
                          value={form[f]}
                          onChange={setF(f)}
                          className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#ff6f61] hover:bg-[#e2584a] shadow-sm transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Saving changes...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Information</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              {[
                { field: 'currentPassword', label: t('currentPassword') },
                { field: 'newPassword', label: t('newPassword') },
                { field: 'confirmPassword', label: t('confirmPassword') },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">{label}</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      value={passForm[field]}
                      onChange={setP(field)}
                      className="glass-input w-full pl-10 pr-10 py-2 rounded-lg text-xs bg-white"
                    />
                    {field === 'confirmPassword' && (
                      <button
                        type="button"
                        onClick={() => setShowPass(!showPass)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#10847e] hover:bg-[#0c6b66] shadow-sm transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Updating...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Update Security Password</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </Layout>
  );
}