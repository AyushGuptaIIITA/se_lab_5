import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Save, Loader2, Calendar, Clock, ToggleLeft, ToggleRight, Check, CalendarDays } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function ManageSchedule() {
  const { t } = useLanguage();
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // New slot inputs
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('10:00');

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

  const addSlot = async () => {
    if (!newStartTime || !newEndTime) {
      setAlert({ type: 'error', message: 'Please specify both start and end times.' });
      return;
    }
    if (newStartTime >= newEndTime) {
      setAlert({ type: 'error', message: 'End time must be after start time.' });
      return;
    }

    const newSlot = {
      day: selectedDay,
      startTime: newStartTime,
      endTime: newEndTime,
      isActive: true
    };

    const updated = [...slots, newSlot];
    setSlots(updated);
    setSaving(true);
    try {
      const res = await api.put('/doctors/schedule', { availableSlots: updated });
      if (res.data?.doctor?.availableSlots) {
        setSlots(res.data.doctor.availableSlots);
      }
      setAlert({ type: 'success', message: `Added & saved ${selectedDay} (${newStartTime} – ${newEndTime}) slot.` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save slot.' });
    } finally {
      setSaving(false);
    }
  };

  const removeSlot = async (idx) => {
    const updated = slots.filter((_, i) => i !== idx);
    setSlots(updated);
    try {
      await api.put('/doctors/schedule', { availableSlots: updated });
      setAlert({ type: 'success', message: 'Slot deleted.' });
    } catch {
      setAlert({ type: 'error', message: 'Failed to update schedule on server.' });
    }
  };

  const toggleSlot = async (idx) => {
    const updated = slots.map((sl, i) => i === idx ? { ...sl, isActive: !sl.isActive } : sl);
    setSlots(updated);
    try {
      await api.put('/doctors/schedule', { availableSlots: updated });
      setAlert({ type: 'success', message: 'Slot availability updated.' });
    } catch {
      setAlert({ type: 'error', message: 'Failed to update slot status.' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const res = await api.put('/doctors/schedule', { availableSlots: slots });
      if (res.data?.doctor?.availableSlots) {
        setSlots(res.data.doctor.availableSlots);
      }
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
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>{t('manageSchedule')}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">Customize your weekly clinical availability and consultation booking slots</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
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

        {/* Add Slot Form */}
        <div className="glass-panel p-5 rounded-2xl bg-white space-y-3">
          <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add Consultation Time Slot</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Day of Week</label>
              <select
                value={selectedDay}
                onChange={e => setSelectedDay(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold"
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Start Time</label>
              <input
                type="time"
                value={newStartTime}
                onChange={e => setNewStartTime(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">End Time</label>
              <input
                type="time"
                value={newEndTime}
                onChange={e => setNewEndTime(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={addSlot}
                className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Add Slot to {selectedDay}</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Weekly Calendar Slots Overview */}
            <div className="glass-panel rounded-2xl overflow-hidden bg-white">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <h2 className="text-sm font-bold text-slate-800">{t('weeklySchedule')} Overview</h2>
              </div>
              <div className="divide-y divide-slate-100">
                {DAYS.map(day => (
                  <div key={day} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider w-28">{day}</span>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {byDay[day].length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No slots scheduled</span>
                      ) : (
                        byDay[day].map((sl) => {
                          const originalIdx = slots.indexOf(sl);
                          return (
                            <span
                              key={originalIdx}
                              className={`flex items-center space-x-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
                                sl.isActive
                                  ? 'bg-blue-50 text-blue-700 border-blue-200 shadow-xs'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 line-through'
                              }`}
                            >
                              <Clock className="w-3.5 h-3.5" />
                              <span>{sl.startTime} – {sl.endTime}</span>
                              <button
                                onClick={() => toggleSlot(originalIdx)}
                                className="ml-1 text-slate-400 hover:text-blue-600"
                                title="Toggle active/inactive"
                              >
                                {sl.isActive ? <ToggleRight className="w-4 h-4 text-blue-600" /> : <ToggleLeft className="w-4 h-4" />}
                              </button>
                              <button
                                onClick={() => removeSlot(originalIdx)}
                                className="ml-0.5 text-slate-300 hover:text-rose-500"
                                title="Delete slot"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upcoming Bookings Panel */}
          <div className="glass-panel rounded-2xl overflow-hidden bg-white">
            <div className="p-4 border-b border-slate-100 bg-slate-50/70">
              <h2 className="text-sm font-bold text-slate-800">
                {t('upcomingAppointments')} ({upcomingApts.length})
              </h2>
            </div>
            {upcomingApts.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No upcoming consultations booked</div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                {upcomingApts.map(apt => (
                  <div key={apt._id} className="p-3.5 hover:bg-slate-50 transition-colors space-y-1">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-900">{apt.patient?.name}</p>
                      <StatusBadge status={apt.status} />
                    </div>
                    <p className="text-[11px] text-slate-500 flex items-center space-x-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>{new Date(apt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                      <span className="font-semibold text-slate-700 ml-1">· {apt.timeSlot?.start}</span>
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