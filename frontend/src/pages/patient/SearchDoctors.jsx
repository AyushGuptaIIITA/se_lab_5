import React, { useEffect, useState } from 'react';
import { Search, Filter, ChevronRight, Star, IndianRupee, Loader2, Calendar, Clock, Check, X } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const SPECIALIZATIONS = ['All', 'General Medicine', 'Pediatrics', 'Cardiology', 'Dermatology', 'Orthopedics', 'ENT', 'Psychiatry', 'Gynecology', 'Neurology', 'Ophthalmology'];
const TYPES = ['general', 'follow-up', 'emergency'];

function DoctorCard({ doctor, onSelect, selected }) {
  return (
    <div onClick={() => onSelect(doctor)}
      className={`glass-card p-5 rounded-2xl border cursor-pointer transition-all hover:border-indigo-500/40 ${selected ? 'border-indigo-500 ring-1 ring-indigo-500/50' : 'border-slate-800'}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center text-lg font-bold text-white flex-shrink-0">
            {doctor.name?.charAt(0).toUpperCase() || 'D'}
          </div>
          <div>
            <h3 className="font-semibold text-slate-200">Dr. {doctor.name}</h3>
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 mt-0.5">
              {doctor.specialization}
            </span>
          </div>
        </div>
        {selected && <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />}
      </div>
      {doctor.bio && <p className="text-xs text-slate-400 mt-3 line-clamp-2">{doctor.bio}</p>}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center text-xs text-amber-300"><Star className="w-3.5 h-3.5 mr-1" /><span>4.8 · 200+ patients</span></div>
        <div className="flex items-center text-xs text-slate-300"><IndianRupee className="w-3 h-3" /><span>{doctor.consultationFee || 200}</span></div>
      </div>
    </div>
  );
}

export default function SearchDoctors() {
  const { t } = useLanguage();
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [spec, setSpec] = useState('All');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [symptoms, setSymptoms] = useState('');
  const [apptType, setApptType] = useState('general');
  const [booking, setBooking] = useState(false);
  const [alert, setAlert] = useState(null);

  useEffect(() => {
    const fetchDoctors = async () => {
      setLoading(true);
      try {
        const params = {};
        if (spec !== 'All') params.specialization = spec;
        if (search) params.search = search;
        const res = await api.get('/doctors', { params });
        setDoctors(res.data.doctors || []);
      } catch { setAlert({ type: 'error', message: 'Failed to load doctors.' }); }
      finally { setLoading(false); }
    };
    fetchDoctors();
  }, [search, spec]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) return;
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const res = await api.get(`/doctors/${selectedDoctor._id}/availability`, { params: { date: selectedDate } });
        setSlots(res.data.slots || []);
      } catch { setSlots([]); }
      finally { setSlotsLoading(false); }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) { setAlert({ type: 'error', message: 'Select a date and time slot.' }); return; }
    setBooking(true);
    setAlert(null);
    try {
      await api.post('/appointments', { doctor: selectedDoctor._id, date: selectedDate, timeSlot: selectedSlot, type: apptType, symptoms });
      setAlert({ type: 'success', message: t('bookingSuccess') });
      setSelectedDoctor(null);
      setSelectedSlot(null);
      setSymptoms('');
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Booking failed. Slot may be taken.' });
    } finally { setBooking(false); }
  };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div>
          <h1 className="text-2xl font-extrabold text-white">🔍 {t('searchDoctors')}</h1>
          <p className="text-sm text-slate-400 mt-1">Find specialists and book a consultation slot</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input type="text" placeholder={t('search') + ' doctor by name...'} value={search} onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
          </div>
          <div className="relative">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select value={spec} onChange={e => setSpec(e.target.value)}
              className="glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none appearance-none">
              {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor list */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
            ) : doctors.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No doctors found. Try a different search.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {doctors.map(doc => (
                  <DoctorCard key={doc._id} doctor={doc} onSelect={d => { setSelectedDoctor(d === selectedDoctor ? null : d); setSelectedDate(''); setSlots([]); }} selected={selectedDoctor?._id === doc._id} />
                ))}
              </div>
            )}
          </div>

          {/* Booking panel */}
          <div>
            {selectedDoctor ? (
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 sticky top-24 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-white">{t('bookAppointment')}</h2>
                  <button onClick={() => { setSelectedDoctor(null); setSlots([]); }} className="text-slate-400 hover:text-slate-200"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-600 to-indigo-600 flex items-center justify-center font-bold text-white text-sm">{selectedDoctor.name?.charAt(0)}</div>
                  <div><p className="text-sm font-semibold text-slate-200">Dr. {selectedDoctor.name}</p><p className="text-xs text-slate-400">{selectedDoctor.specialization}</p></div>
                </div>

                {/* Date picker */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1"><Calendar className="inline w-3.5 h-3.5 mr-1" />{t('bookingDate')}</label>
                  <input type="date" min={minDate} value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                    className="glass-input w-full px-4 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none" />
                </div>

                {/* Slots */}
                {selectedDate && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"><Clock className="inline w-3.5 h-3.5 mr-1" />{t('selectSlot')}</label>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-indigo-500" /></div>
                    ) : slots.length === 0 ? (
                      <p className="text-xs text-slate-500">No available slots for this date.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {slots.map((slot, i) => (
                          <button key={i} type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot({ start: slot.start, end: slot.end })}
                            className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all border ${
                              !slot.available ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-500 line-through' :
                              selectedSlot?.start === slot.start ? 'bg-indigo-600 border-indigo-500 text-white' :
                              'border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:bg-indigo-500/10'
                            }`}>
                            {slot.start}–{slot.end}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Type & symptoms */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('appointmentType')}</label>
                  <select value={apptType} onChange={e => setApptType(e.target.value)} className="glass-input w-full px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none">
                    {TYPES.map(tp => <option key={tp} value={tp}>{t(tp === 'follow-up' ? 'followUp' : tp)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">{t('symptoms')}</label>
                  <textarea rows={3} placeholder="Describe your symptoms..." value={symptoms} onChange={e => setSymptoms(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none" />
                </div>

                <button onClick={handleBook} disabled={booking || !selectedSlot}
                  className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50">
                  {booking ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Booking...</span></> : <><span>{t('confirmBooking')}</span><ChevronRight className="w-4 h-4" /></>}
                </button>
              </div>
            ) : (
              <div className="glass-panel p-6 rounded-2xl border border-slate-800 text-center text-slate-400 text-sm">
                <Search className="w-8 h-8 mx-auto mb-3 opacity-30" />
                <p>Select a doctor to book an appointment</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
