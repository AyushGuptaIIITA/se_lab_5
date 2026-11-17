import React, { useEffect, useState } from 'react';
import { 
  Plus, Trash2, Save, Loader2, Calendar, Clock, ToggleLeft, ToggleRight, 
  Check, CalendarDays, AlertTriangle, Sparkles, CheckCircle2, Ban,
  ChevronRight, CalendarCheck, HelpCircle
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const DURATION_PRESETS = [
  { label: '15 Mins', minutes: 15 },
  { label: '30 Mins (Std)', minutes: 30 },
  { label: '45 Mins', minutes: 45 },
  { label: '1 Hour', minutes: 60 },
  { label: '1.5 Hours', minutes: 90 },
  { label: '2 Hours', minutes: 120 },
  { label: 'Custom', minutes: null },
];

// Helper to get formatted date string (YYYY-MM-DD)
function toDateStr(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Get ISO day name from a date string (YYYY-MM-DD)
function getDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'long' });
}

function formatDateDisplay(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function getDateRelativeLabel(dateStr) {
  const todayStr = toDateStr(new Date());
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateStr(tomorrow);

  if (dateStr === todayStr) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  return null;
}

export default function ManageSchedule() {
  const { t } = useLanguage();
  const [slots, setSlots] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState(null);

  // Pure Date-Centric Scheduling
  const todayStr = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);

  // Time & Duration
  const [newStartTime, setNewStartTime] = useState('09:00');
  const [newEndTime, setNewEndTime] = useState('09:30');
  const [selectedPreset, setSelectedPreset] = useState(30); // 30 minutes default

  // Deduplicate slots array by (date + startTime + endTime)
  const deduplicateSlots = (rawSlots) => {
    const seen = new Set();
    const result = [];
    for (const sl of rawSlots) {
      const dateVal = sl.date || todayStr;
      const start = sl.startTime || sl.start;
      const end = sl.endTime || sl.end;
      const key = `${dateVal}_${start}_${end}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          ...sl,
          date: dateVal,
          day: sl.day || getDayName(dateVal),
          startTime: start,
          endTime: end,
          isActive: sl.isActive !== false
        });
      }
    }
    return result;
  };

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [doctorRes, apptRes] = await Promise.all([
          api.get('/auth/me'),
          api.get('/appointments?limit=50')
        ]);
        const rawSlots = doctorRes.data.user.availableSlots || [];
        setSlots(deduplicateSlots(rawSlots));
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

  const handleStartTimeChange = (newStart) => {
    setNewStartTime(newStart);
    if (selectedPreset !== null) {
      setNewEndTime(calculateEndTime(newStart, selectedPreset));
    }
  };

  const handlePresetClick = (mins) => {
    setSelectedPreset(mins);
    if (mins !== null) {
      setNewEndTime(calculateEndTime(newStartTime, mins));
    }
  };

  const isTimeRangeValid = newStartTime && newEndTime && newStartTime < newEndTime;

  // ── Exact Duplicate & Overlap Detection ──────────────────────────────────
  const isDuplicate = () => {
    return slots.some(sl => {
      const slDate = sl.date || todayStr;
      return slDate === selectedDate && sl.startTime === newStartTime && sl.endTime === newEndTime;
    });
  };

  const findOverlap = () => {
    return slots.find(sl => {
      const slDate = sl.date || todayStr;
      if (slDate !== selectedDate) return false;
      // Overlap condition: start < otherEnd && end > otherStart
      return newStartTime < sl.endTime && newEndTime > sl.startTime;
    });
  };

  const duplicateExists = isTimeRangeValid && isDuplicate();
  const overlapSlot = isTimeRangeValid && !duplicateExists ? findOverlap() : null;

  const addSlot = async () => {
    if (!selectedDate) {
      setAlert({ type: 'error', message: 'Please select a calendar date.' });
      return;
    }
    if (!newStartTime || !newEndTime) {
      setAlert({ type: 'error', message: 'Please specify both start time and end time.' });
      return;
    }
    if (newStartTime >= newEndTime) {
      setAlert({ type: 'error', message: 'Invalid Time Range: End time must be strictly after start time.' });
      return;
    }

    // ── Prevent Duplicates ──
    if (isDuplicate()) {
      setAlert({
        type: 'error',
        message: `Duplicate slot: ${newStartTime}–${newEndTime} already exists for ${formatDateDisplay(selectedDate)}. Duplicate entries are blocked.`
      });
      return;
    }

    const newSlot = {
      day: getDayName(selectedDate),
      date: selectedDate,
      startTime: newStartTime,
      endTime: newEndTime,
      isActive: true
    };

    const updated = deduplicateSlots([...slots, newSlot]);
    setSlots(updated);
    setSaving(true);
    setAlert(null);
    try {
      const res = await api.put('/doctors/schedule', { availableSlots: updated });
      if (res.data?.doctor?.availableSlots) {
        setSlots(deduplicateSlots(res.data.doctor.availableSlots));
      }
      setAlert({ type: 'success', message: `Slot added for ${formatDateDisplay(selectedDate)} (${newStartTime}–${newEndTime}).` });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save slot.' });
      setSlots(prev => prev.filter(s => s !== newSlot));
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
      setAlert({ type: 'error', message: 'Failed to update schedule.' });
    }
  };

  const removeAllSlotsForDate = async (dateStr) => {
    if (!window.confirm(`Are you sure you want to delete all scheduled slots for ${formatDateDisplay(dateStr)}?`)) return;
    const updated = slots.filter(s => (s.date || todayStr) !== dateStr);
    setSlots(updated);
    try {
      await api.put('/doctors/schedule', { availableSlots: updated });
      setAlert({ type: 'success', message: `All slots deleted for ${formatDateDisplay(dateStr)}.` });
    } catch {
      setAlert({ type: 'error', message: 'Failed to delete date slots.' });
    }
  };

  const toggleSlot = async (idx) => {
    const updated = slots.map((sl, i) => i === idx ? { ...sl, isActive: !sl.isActive } : sl);
    setSlots(updated);
    try {
      await api.put('/doctors/schedule', { availableSlots: updated });
    } catch {
      setAlert({ type: 'error', message: 'Failed to update slot status.' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const res = await api.put('/doctors/schedule', { availableSlots: slots });
      if (res.data?.doctor?.availableSlots) setSlots(deduplicateSlots(res.data.doctor.availableSlots));
      setAlert({ type: 'success', message: 'All date-wise schedule slots saved successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to save schedule.' });
    } finally { setSaving(false); }
  };

  const upcomingApts = appointments.filter(a =>
    ['confirmed', 'pending', 'in-progress'].includes(a.status) && new Date(a.date) >= new Date()
  );

  // Group slots strictly date-wise, sorted chronologically
  const groupedDates = {};
  slots.forEach(slot => {
    const d = slot.date || todayStr;
    if (!groupedDates[d]) groupedDates[d] = [];
    groupedDates[d].push(slot);
  });

  // Sort slots inside each date by start time
  Object.keys(groupedDates).forEach(d => {
    groupedDates[d].sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  });

  // Sort dates chronologically
  const sortedDates = Object.keys(groupedDates).sort((a, b) => a.localeCompare(b));

  // Quick next 7 days list for instant 1-click date picking
  const quickDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = toDateStr(d);
    return {
      dateStr,
      label: i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short' }),
      dateNum: d.getDate(),
      month: d.toLocaleDateString('en-IN', { month: 'short' })
    };
  });

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
      <div className="space-y-6 max-w-7xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-700">
                Date-Wise Availability Management
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 mt-1">{t('manageSchedule')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Schedule consultation time slots strictly by calendar date. Duplicate slots are blocked in real-time.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Saving...</span></>
              : <><Save className="w-4 h-4" /><span>Save All Changes</span></>}
          </button>
        </div>

        {/* ── Add Slot Card ── */}
        <div className="glass-panel p-5 rounded-3xl bg-white shadow-card space-y-4 border border-blue-100">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
              <Plus className="w-4 h-4 text-blue-600" />
              <span>Add Consultation Slot by Date</span>
            </h2>
            <span className="text-[11px] text-slate-400 font-medium">
              Selected: <strong className="text-blue-700">{formatDateDisplay(selectedDate)}</strong>
            </span>
          </div>

          {/* Quick Date Chips (Next 7 Days) */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              1. Choose Calendar Date:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
              {quickDays.map(q => {
                const isSelected = selectedDate === q.dateStr;
                const slotCount = (groupedDates[q.dateStr] || []).length;
                return (
                  <button
                    key={q.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(q.dateStr)}
                    className={`p-2 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-[1.02]'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-[10px] font-extrabold uppercase tracking-wide opacity-90">{q.label}</div>
                    <div className="text-lg font-black leading-tight mt-0.5">{q.dateNum}</div>
                    <div className="text-[10px] font-medium opacity-80">{q.month}</div>
                    {slotCount > 0 && (
                      <span className={`inline-block mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {slotCount} slot{slotCount > 1 ? 's' : ''}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker & Time Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
            {/* Custom Date Picker */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Custom Calendar Date *
              </label>
              <input
                type="date"
                min={todayStr}
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold text-slate-800"
              />
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">Start Time *</label>
              <input
                type="time"
                value={newStartTime}
                onChange={e => handleStartTimeChange(e.target.value)}
                className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-semibold text-slate-800"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1 flex items-center justify-between">
                <span>End Time *</span>
                {selectedPreset !== null && (
                  <span className="text-[10px] text-blue-600 font-bold">Auto ({selectedPreset}m)</span>
                )}
              </label>
              <input
                type="time"
                value={newEndTime}
                disabled={selectedPreset !== null}
                onChange={e => setNewEndTime(e.target.value)}
                className={`glass-input w-full px-3 py-2 rounded-xl text-xs font-semibold ${
                  selectedPreset !== null ? 'bg-slate-50 text-slate-700 cursor-not-allowed' : 'bg-white text-slate-800'
                }`}
              />
            </div>

            {/* Add Slot Button */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={addSlot}
                disabled={!isTimeRangeValid || saving || duplicateExists}
                className={`w-full flex items-center justify-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold shadow-md transition-all disabled:cursor-not-allowed ${
                  duplicateExists
                    ? 'bg-rose-100 text-rose-700 border border-rose-300 opacity-90'
                    : !isTimeRangeValid
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'text-white bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {duplicateExists ? (
                  <><Ban className="w-4 h-4 flex-shrink-0" /><span>Slot Already Exists</span></>
                ) : saving ? (
                  <><Loader2 className="w-4 h-4 animate-spin flex-shrink-0" /><span>Adding...</span></>
                ) : (
                  <><Plus className="w-4 h-4 flex-shrink-0" /><span>Add Slot ({newStartTime}–{newEndTime})</span></>
                )}
              </button>
            </div>
          </div>

          {/* Duration Preset Chips */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              2. Quick Duration Presets:
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

          {/* Validation & Duplicate Warnings */}
          {!isTimeRangeValid && newStartTime && newEndTime && (
            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span><strong>Invalid Time Range:</strong> End time must be strictly after start time.</span>
            </div>
          )}

          {duplicateExists && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-xs text-rose-900 flex items-start space-x-2.5 animate-in fade-in">
              <Ban className="w-5 h-5 flex-shrink-0 text-rose-600 mt-0.5" />
              <div>
                <strong className="font-extrabold text-rose-800">Duplicate Slot Detected:</strong>{' '}
                The time slot <strong>{newStartTime} – {newEndTime}</strong> is already added for{' '}
                <strong>{formatDateDisplay(selectedDate)}</strong>. A doctor cannot add the same slot twice for the same date.
              </div>
            </div>
          )}

          {overlapSlot && (
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 text-amber-600" />
              <span>
                <strong>Notice:</strong> This slot overlaps with an existing slot ({overlapSlot.startTime} – {overlapSlot.endTime}) on this date.
              </span>
            </div>
          )}
        </div>

        {/* ── Main Schedule View: Strictly Date-Wise ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <CalendarCheck className="w-5 h-5 text-blue-600" />
                <span>Date-Wise Consultation Hours ({sortedDates.length} Dates, {slots.length} Total Slots)</span>
              </h2>
              <span className="text-xs text-slate-500 font-medium">Sorted chronologically</span>
            </div>

            {sortedDates.length === 0 ? (
              <div className="glass-panel p-12 text-center rounded-3xl bg-white shadow-card border border-slate-200/80 space-y-3">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
                  <Calendar className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800">No Consultation Slots Scheduled</h3>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Select a calendar date from the top panel and click "+ Add Slot" to make yourself available for patient bookings.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {sortedDates.map(dateStr => {
                  const dateSlots = groupedDates[dateStr];
                  const dayName = getDayName(dateStr);
                  const relLabel = getDateRelativeLabel(dateStr);
                  const isSelected = selectedDate === dateStr;

                  return (
                    <div
                      key={dateStr}
                      className={`glass-panel rounded-3xl overflow-hidden bg-white shadow-card border transition-all ${
                        isSelected ? 'border-blue-400 ring-2 ring-blue-500/10' : 'border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {/* Date Card Header */}
                      <div className="p-4 bg-slate-50/80 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center space-x-3">
                          {/* Calendar date badge */}
                          <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex flex-col items-center justify-center font-bold flex-shrink-0 shadow-sm shadow-blue-500/20">
                            <span className="text-[9px] uppercase tracking-wider opacity-90">{dayName.slice(0, 3)}</span>
                            <span className="text-base font-black leading-none">{new Date(dateStr + 'T00:00:00').getDate()}</span>
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="text-sm font-black text-slate-900">{formatDateDisplay(dateStr)}</h3>
                              {relLabel && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                  relLabel === 'Today' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-blue-100 text-blue-800'
                                }`}>
                                  {relLabel}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 font-medium">
                              {dateSlots.filter(s => s.isActive).length} active · {dateSlots.length} total consultation slot{dateSlots.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>

                        {/* Quick action buttons for this date */}
                        <div className="flex items-center space-x-2 self-end sm:self-auto">
                          <button
                            type="button"
                            onClick={() => setSelectedDate(dateStr)}
                            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                            title="Add another slot to this date"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Slot</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAllSlotsForDate(dateStr)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            title="Delete all slots for this date"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Slots Grid for this Date */}
                      <div className="p-4">
                        <div className="flex flex-wrap gap-2.5">
                          {dateSlots.map(sl => {
                            const originalIdx = slots.indexOf(sl);
                            return (
                              <div
                                key={originalIdx}
                                className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all ${
                                  sl.isActive
                                    ? 'bg-blue-50 text-blue-900 border-blue-200 shadow-2xs'
                                    : 'bg-slate-100 text-slate-400 border-slate-200 line-through opacity-60'
                                }`}
                              >
                                <Clock className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span>{sl.startTime} – {sl.endTime}</span>

                                <button
                                  type="button"
                                  onClick={() => toggleSlot(originalIdx)}
                                  className="text-slate-400 hover:text-blue-700 transition-colors ml-1"
                                  title={sl.isActive ? 'Deactivate this slot' : 'Activate this slot'}
                                >
                                  {sl.isActive
                                    ? <ToggleRight className="w-4 h-4 text-blue-600" />
                                    : <ToggleLeft className="w-4 h-4 text-slate-400" />}
                                </button>

                                <button
                                  type="button"
                                  onClick={() => removeSlot(originalIdx)}
                                  className="text-slate-300 hover:text-rose-600 transition-colors ml-0.5"
                                  title="Delete slot"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── Right Panel: Upcoming Booked Appointments ── */}
          <div className="space-y-4">
            <div className="glass-panel rounded-3xl overflow-hidden bg-white shadow-card border border-slate-200/80">
              <div className="p-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
                <h2 className="text-sm font-extrabold text-slate-900 flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span>Upcoming Consultations ({upcomingApts.length})</span>
                </h2>
              </div>

              {upcomingApts.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-400 px-4">
                  No upcoming patient consultations booked yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[460px] overflow-y-auto">
                  {upcomingApts.map(apt => (
                    <div key={apt._id} className="p-3.5 hover:bg-slate-50 transition-colors space-y-1.5">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-900">{apt.patient?.name || 'Patient'}</p>
                        <StatusBadge status={apt.status} />
                      </div>
                      <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{formatDateDisplay(toDateStr(new Date(apt.date)))}</span>
                        </span>
                        <span className="font-semibold text-slate-700">· {apt.timeSlot?.start} - {apt.timeSlot?.end}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Tips */}
            <div className="p-4 rounded-3xl bg-blue-50/70 border border-blue-200/60 text-xs text-blue-900 space-y-2">
              <div className="flex items-center space-x-1.5 font-bold text-blue-800">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Doctor Scheduling Rules</span>
              </div>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-blue-700/90">
                <li>Availability is configured strictly by calendar date.</li>
                <li>Adding duplicate slots for the same date & time is blocked.</li>
                <li>Patients can only book active consultation slots.</li>
                <li>You can toggle a slot active or inactive at any time.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
