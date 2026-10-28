import React, { useEffect, useState } from 'react';
import { 
  Plus, Trash2, Save, Loader2, Calendar, Clock, ToggleLeft, ToggleRight, 
  Check, CalendarDays, AlertTriangle, Sparkles, CheckCircle2
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const DURATION_PRESETS = [
  { label: '15 Mins', minutes: 15 },
  { label: '30 Mins (Std)', minutes: 30 },
  { label: '45 Mins', minutes: 45 },
  { label: '1 Hour', minutes: 60 },
  { label: '1.5 Hours', minutes: 90 },
  { label: '2 Hours', minutes: 120 },
  { label: 'Custom', minutes: null },
];

export default function ManageSchedule() {
  const { t } = useLanguage();
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Mode: 'date' (Specific calendar date) vs 'weekly' (Recurring day)
  const [scheduleMode, setScheduleMode] = useState('date');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Time & Duration
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [selectedPreset, setSelectedPreset] = useState(30); // 30 minutes default

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

  // Helper to calculate end time from start time + minutes
  const calculateEndTime = (startStr, mins) => {
    if (!startStr || mins == null) return newEndTime;
    const [h, m] = startStr.split(':').map(Number);
    const totalMins = h * 60 + m + mins;
    const endH = Math.floor(totalMins / 60) % 24;
    const endM = totalMins % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  // When start time changes, update end time if a preset is active
  const handleStartTimeChange = (newStart) => {
    setNewStartTime(newStart);
    if (selectedPreset !== null) {
      setNewEndTime(calculateEndTime(newStart, selectedPreset));
    }
  };

  // When a duration preset chip is clicked
  const handlePresetClick = (mins) => {
    setSelectedPreset(mins);
    if (mins !== null) {
      setNewEndTime(calculateEndTime(newStartTime, mins));
    }
  };

  // Real-time validation
  const isTimeRangeValid = newStartTime && newEndTime && newStartTime < newEndTime;

  const addSlot = async () => {
    if (!newStartTime || !newEndTime) {
      setAlert({ type: 'error', message: 'Please specify both start time and end time.' });
      return;
    }
    if (newStartTime >= newEndTime) {
      setAlert({ 
        type: 'error', 
        message: `Invalid Time Range: End time (${newEndTime}) cannot be earlier than or equal to start time (${newStartTime}).` 
      });
      return;
    }

    const newSlot = {
      day: scheduleMode === 'weekly' ? selectedDay : 'Specific Date',
      date: scheduleMode === 'date' ? selectedDate : null,
      startTime: newStartTime,
      endTime: newEndTime,
      isActive: true
    };

    const updated = [...slots, newSlot];
    setSlots(updated);
    setSaving(true);
    setAlert(null);
    try {
      const res = await api.put('/doctors/schedule', { availableSlots: updated });
      if (res.data?.doctor?.availableSlots) {
        setSlots(res.data.doctor.availableSlots);
      }
      const label = scheduleMode === 'date' ? `Date: ${selectedDate}` : `${selectedDay}`;
      setAlert({ type: 'success', message: `Added & saved slot for ${label} (${newStartTime} – ${newEndTime}).` });
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

  const upcomingApts = appointments.filter(a => ['confirmed', 'pending', 'in-progress'].includes(a.status) && new Date(a.date) >= new Date());
  
  // Group slots
  const specificDateSlots = slots.filter(s => s.date).sort((a, b) => a.date.localeCompare(b.date));
  const uniqueDates = [...new Set(specificDateSlots.map(s => s.date))];
  const byDay = DAYS.reduce((acc, d) => { acc[d] = slots.filter(s => !s.date && s.day === d); return acc; }, {});

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

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>{t('manageSchedule')}</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Customize availability by specific calendar date or weekly recurring days with automated preset duration calculations
            </p>
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
        <div className="glass-panel p-5 rounded-3xl bg-white shadow-card space-y-4 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Add Consultation Time Slot</span>
            </h2>

            {/* Mode Switcher */}
            <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
              <button
                type="button"
                onClick={() => setScheduleMode('date')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scheduleMode === 'date'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Specific Calendar Date
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('weekly')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  scheduleMode === 'weekly'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Weekly Recurring Day
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Date / Day Picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                {scheduleMode === 'date' ? 'Select Calendar Date' : 'Select Day of Week'} *
              </label>
              {scheduleMode === 'date' ? (
                <input
                  type="date"
                  min={new Date().toISOString().split('T')[0]}
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold"
                />
              ) : (
                <select
                  value={selectedDay}
                  onChange={e => setSelectedDay(e.target.value)}
                  className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              )}
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Start Time *
              </label>
              <input
                type="time"
                value={newStartTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>End Time *</span>
                {selectedPreset !== null && (
                  <span className="text-[10px] text-blue-600 font-normal">Auto ({selectedPreset}m)</span>
                )}
              </label>
              <input
                type="time"
                value={newEndTime}
                disabled={selectedPreset !== null}
                onChange={e => setNewEndTime(e.target.value)}
                className={`glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold ${
                  selectedPreset !== null ? 'bg-slate-50 text-slate-700' : 'bg-white'
                }`}
              />
            </div>

            {/* Add Slot Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={addSlot}
                disabled={!isTimeRangeValid || saving}
                className="w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {saving ? 'Saving...' : `Add Slot (${newStartTime} - ${newEndTime})`}
                </span>
              </button>
            </div>
          </div>

          {/* Preset Duration Chips (User Requirement: 15m, 30m, 45m, 1h, 1.5h, 2h, Custom) */}
          <div className="space-y-1.5 pt-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Quick Duration Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS.map(preset => {
                const isActive = selectedPreset === preset.minutes;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => handlePresetClick(preset.minutes)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Validation Feedback Warning */}
          {!isTimeRangeValid && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Invalid Time Range:</strong> End time ({newEndTime}) must be strictly after start time ({newStartTime}). Reverse ranges (e.g. 9:00 PM to 8:00 PM) are prohibited.
              </span>
            </div>
          )}
        </div>

        {/* Schedule Display */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Specific Calendar Date Slots */}
            {uniqueDates.length > 0 && (
              <div className="glass-panel rounded-2xl overflow-hidden bg-white shadow-card">
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                    <Calendar className="w-4 h-4 text-blue-600" />
                    <span>Specific Calendar Date Availability ({specificDateSlots.length} slots)</span>
                  </h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {uniqueDates.map(dateStr => {
                    const dateSlots = specificDateSlots.filter(s => s.date === dateStr);
                    const formatted = new Date(dateStr).toLocaleDateString('en-IN', {
                      weekday: 'short',
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric'
                    });
                    return (
                      <div key={dateStr} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="w-40 flex-shrink-0">
                          <p className="text-xs font-bold text-slate-900">{formatted}</p>
                          <span className="text-[10px] text-blue-600 font-semibold">{dateStr}</span>
                        </div>
                        <div className="flex-1 flex flex-wrap gap-2">
                          {dateSlots.map(sl => {
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
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Weekly Recurring Schedule Overview */}
            <div className="glass-panel rounded-2xl overflow-hidden bg-white shadow-card">
              <div className="p-4 border-b border-slate-100 bg-slate-50/70">
                <h2 className="text-sm font-bold text-slate-800 flex items-center space-x-1.5">
                  <CalendarDays className="w-4 h-4 text-blue-600" />
                  <span>Weekly Recurring Schedule Overview</span>
                </h2>
              </div>
              <div className="divide-y divide-slate-100">
                {DAYS.map(day => (
                  <div key={day} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800 uppercase tracking-wider w-28">{day}</span>
                    <div className="flex-1 flex flex-wrap gap-2">
                      {byDay[day].length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No recurring slots</span>
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
          <div className="glass-panel rounded-2xl overflow-hidden bg-white shadow-card">
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
