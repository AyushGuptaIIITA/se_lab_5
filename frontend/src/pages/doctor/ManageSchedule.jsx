import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Loader2, Calendar, Clock, ToggleLeft, ToggleRight } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultSlot = { day: 'Monday', startTime: '09:00', endTime: '10:00', isActive: true };

export default function ManageSchedule() {
  const { t } = useLanguage();
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [doctorRes, apptRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/appointments?limit=50')
        ]);
        setSlots(doctorRes.data.user.availableSlots || []);
        setAppointments(apptRes.data.appointments || []);
      } catch {
        setAlert({ type: 'error', message: 'Failed to load schedule.' });
      } finally { setLoading(false); }
    };
    fetchAll();
  }, []);

  const addSlot = () => setSlots(s => [...s, { ...defaultSlot, _key: Date.now() }]);
  const removeSlot = (idx) => setSlots(s => s.filter((_, i) => i !== idx));
  const updateSlot = (idx, field, val) => setSlots(s => s.map((sl, i) => i === idx ? { ...sl, [field]: val } : sl));
  const toggleSlot = (idx) => setSlots(s => s.map((sl, i) => i === idx ? { ...sl, isActive: !sl.isActive } : sl));

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      await api.put('/doctors/schedule', { availableSlots: slots });
      setAlert({ type: 'success', message: 'Schedule saved successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save.' });
    } finally { setSaving(false); }
  };

  const upcomingApts = appointments.filter(a => ['confirmed', 'pending'].includes(a.status) && new Date(a.date) >= new Date());

  // Group slots by day for display
  const byDay = DAYS.reduce((acc, d) => { acc[d] = slots.filter(s => s.day === d); return acc; }, {});

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <Calendar className="w-6 h-6 text-indigo-400" /><span>{t('manageSchedule')}</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Set your weekly availability for patient bookings</p>
          </div>
          <div className="flex items-center space-x-3">
            <button onClick={addSlot} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
              <Plus className="w-4 h-4" /><span>Add Slot</span>
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></> : <><Save className="w-4 h-4" /><span>{t('save')}</span></>}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Slot editor */}
          <div className="lg:col-span-2 space-y-4">
            {/* Weekly view */}
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white">{t('weeklySchedule')}</h2>
              </div>
              <div className="divide-y divide-slate-800/60">
                {DAYS.map(day => (
                  <div key={day} className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{day}</span>
                      {byDay[day].length === 0 && <span className="text-xs text-slate-600">— No slots</span>}
                    </div>
                    {byDay[day].length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {byDay[day].map((sl, globalIdx) => {
                          const idx = slots.indexOf(sl);
                          return (
                            <span key={idx} className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium border ${sl.isActive ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30' : 'bg-slate-800 text-slate-500 border-slate-700 line-through'}`}>
                              <Clock className="w-3 h-3" />
                              <span>{sl.startTime}–{sl.endTime}</span>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Slot list editor */}
            <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
              <div className="p-5 border-b border-slate-800">
                <h2 className="text-sm font-bold text-white">Edit Slots ({slots.length})</h2>
              </div>
              <div className="divide-y divide-slate-800/60">
                {slots.length === 0 ? (
                  <div className="py-8 text-center text-sm text-slate-400">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p>No slots configured. Click "Add Slot" to start.</p>
                  </div>
                ) : slots.map((sl, idx) => (
                  <div key={sl._key || idx} className="p-4 flex items-center gap-3 flex-wrap">
                    <select value={sl.day} onChange={e => updateSlot(idx, 'day', e.target.value)}
                      className="glass-input px-3 py-2 rounded-xl text-xs text-slate-100 focus:outline-none flex-1 min-w-[130px]">
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                    <input type="time" value={sl.startTime} onChange={e => updateSlot(idx, 'startTime', e.target.value)}
                      className="glass-input px-3 py-2 rounded-xl text-xs text-slate-100 focus:outline-none w-28" />
                    <span className="text-slate-500 text-xs">to</span>
                    <input type="time" value={sl.endTime} onChange={e => updateSlot(idx, 'endTime', e.target.value)}
                      className="glass-input px-3 py-2 rounded-xl text-xs text-slate-100 focus:outline-none w-28" />
                    <button onClick={() => toggleSlot(idx)} className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs border transition-colors ${sl.isActive ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                      {sl.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      <span>{sl.isActive ? 'Active' : 'Off'}</span>
                    </button>
                    <button onClick={() => removeSlot(idx)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming appointments */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800">
              <h2 className="text-sm font-bold text-white">{t('upcomingAppointments')} ({upcomingApts.length})</h2>
            </div>
            {upcomingApts.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-400">No upcoming bookings</div>
            ) : (
              <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
                {upcomingApts.map(apt => (
                  <div key={apt._id} className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-200">{apt.patient?.name}</p>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-xs text-slate-400 flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{new Date(apt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                      <Clock className="w-3.5 h-3.5 ml-2" />
                      <span>{apt.timeSlot?.start}</span>
                    </p>
                    <span className="inline-block text-[10px] text-slate-500 capitalize border border-slate-700 px-2 py-0.5 rounded">{apt.type}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
