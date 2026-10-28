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
      setAlert({ type: 'success', message: 'Schedule updated successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save.' });
    } finally { setSaving(false); }
  };

  const upcomingApts = appointments.filter(a => ['confirmed', 'pending'].includes(a.status) && new Date(a.date) >= new Date());
  const byDay = DAYS.reduce((acc, d) => { acc[d] = slots.filter(s => s.day === d); return acc; }, {});

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#10847e]" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
              <span className="text-[#10847e]">{t('manageSchedule')}</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Customize your weekly clinical availability and consultation booking slots</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={addSlot}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-gray-700 bg-white border border-gray-200 hover:border-gray-300 transition-colors shadow-xs"
            >
              <Plus className="w-4 h-4 text-[#ff6f61]" />
              <span>Add New Slot</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#10847e] hover:bg-[#0c6b66] shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Schedule</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Weekly Overview */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                <h2 className="text-sm font-bold text-gray-800">{t('weeklySchedule')} Overview</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {DAYS.map(day => (
                  <div key={day} className="p-3.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wider w-28">{day}</span>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {byDay[day].length === 0 ? (
                        <span className="text-xs text-gray-400 italic">No available consultation hours</span>
                      ) : (
                        byDay[day].map((sl, idx) => (
                          <span
                            key={idx}
                            className={`flex items-center space-x-1 px-2.5 py-1 rounded-md text-xs font-semibold border ${
                              sl.isActive
                                ? 'bg-teal-50 text-[#10847e] border-teal-200'
                                : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{sl.startTime} – {sl.endTime}</span>
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Slot list editor */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h2 className="text-sm font-bold text-gray-800">Edit Time Slots ({slots.length})</h2>
              </div>
              <div className="divide-y divide-gray-100 p-2">
                {slots.length === 0 ? (
                  <div className="py-8 text-center text-sm text-gray-500">
                    <Clock className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-700">No consultation slots configured</p>
                    <button
                      onClick={addSlot}
                      className="mt-2 text-xs font-bold text-[#ff6f61] hover:underline"
                    >
                      + Add your first consultation slot
                    </button>
                  </div>
                ) : (
                  slots.map((sl, idx) => (
                    <div key={sl._key || idx} className="p-3 flex items-center gap-2.5 flex-wrap">
                      <select
                        value={sl.day}
                        onChange={e => updateSlot(idx, 'day', e.target.value)}
                        className="glass-input px-2.5 py-1.5 rounded-lg text-xs bg-white flex-1 min-w-[120px]"
                      >
                        {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                      <input
                        type="time"
                        value={sl.startTime}
                        onChange={e => updateSlot(idx, 'startTime', e.target.value)}
                        className="glass-input px-2.5 py-1.5 rounded-lg text-xs bg-white w-24"
                      />
                      <span className="text-gray-400 text-xs">to</span>
                      <input
                        type="time"
                        value={sl.endTime}
                        onChange={e => updateSlot(idx, 'endTime', e.target.value)}
                        className="glass-input px-2.5 py-1.5 rounded-lg text-xs bg-white w-24"
                      />
                      <button
                        onClick={() => toggleSlot(idx)}
                        className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                          sl.isActive
                            ? 'bg-teal-50 text-[#10847e] border-teal-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {sl.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        <span>{sl.isActive ? 'Active' : 'Off'}</span>
                      </button>
                      <button
                        onClick={() => removeSlot(idx)}
                        className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Bookings Panel */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-800">
                {t('upcomingAppointments')} ({upcomingApts.length})
              </h2>
            </div>
            {upcomingApts.length === 0 ? (
              <div className="py-8 text-center text-xs text-gray-500">No upcoming appointments</div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[500px] overflow-y-auto">
                {upcomingApts.map(apt => (
                  <div key={apt._id} className="p-3.5 hover:bg-gray-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-gray-900">{apt.patient?.name}</p>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-[11px] text-gray-500 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>{new Date(apt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <span className="font-semibold text-gray-700 ml-1">· {apt.timeSlot?.start}</span>
                    </p>
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