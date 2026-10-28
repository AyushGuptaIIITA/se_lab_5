import React, { useEffect, useState } from 'react';
import { Search, Filter, ChevronRight, Star, IndianRupee, Loader2, Calendar, Clock, Check, X, ShieldCheck, Stethoscope, AlertCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const SPECIALIZATIONS = ['All', 'General Medicine', 'Pediatrics', 'Cardiology', 'Dermatology', 'Orthopedics', 'ENT', 'Psychiatry', 'Gynecology', 'Neurology', 'Ophthalmology'];
const TYPES = ['general', 'follow-up', 'emergency'];

function DoctorCard({ doctor, onSelect, selected }) {
  // Clean prefix if double "Dr. Dr." happens
  const displayName = doctor.name?.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name}`;

  return (
    <div
      onClick={() => onSelect(doctor)}
      className={`glass-card p-5 rounded-2xl border cursor-pointer transition-all duration-200 ${
        selected
          ? 'border-blue-600 ring-2 ring-blue-500/20 shadow-md bg-blue-50/30'
          : 'border-slate-200 hover:border-blue-400 hover:shadow-card-hover bg-white'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-lg font-black text-white flex-shrink-0 shadow-md shadow-blue-500/20">
            {doctor.name?.replace(/^(Dr\.|Dr\s)/i, '').trim().charAt(0).toUpperCase() || 'D'}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-slate-900 text-base">{displayName}</h3>
              <ShieldCheck className="w-4 h-4 text-blue-600" title="Verified Specialist" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 mt-1 border border-blue-200">
              {doctor.specialization}
            </span>
          </div>
        </div>
        {selected ? (
          <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs flex-shrink-0 font-bold shadow-xs">
            ✓
          </span>
        ) : (
          <span className="text-xs font-bold text-blue-600 hover:underline">Select</span>
        )}
      </div>

      {doctor.bio && (
        <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">{doctor.bio}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
        <div className="flex items-center text-xs text-slate-700 font-semibold">
          <Star className="w-4 h-4 text-amber-500 fill-amber-500 mr-1" />
          <span>4.9</span>
          <span className="text-slate-400 ml-1">(120+ consults)</span>
        </div>
        <div className="flex items-center text-sm font-extrabold text-blue-700">
          <span>₹{doctor.consultationFee || 200}</span>
          <span className="text-[10px] text-slate-400 font-normal ml-1">Fee</span>
        </div>
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
      } catch {
        setAlert({ type: 'error', message: 'Failed to load doctors.' });
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, [search, spec]);

  useEffect(() => {
    if (!selectedDoctor || !selectedDate) {
      setSlots([]);
      return;
    }
    const fetchSlots = async () => {
      setSlotsLoading(true);
      setSelectedSlot(null);
      try {
        const res = await api.get(`/doctors/${selectedDoctor._id}/availability`, { params: { date: selectedDate } });
        setSlots(res.data.slots || []);
      } catch {
        setSlots([]);
      } finally {
        setSlotsLoading(false);
      }
    };
    fetchSlots();
  }, [selectedDoctor, selectedDate]);

  const handleBook = async () => {
    if (!selectedSlot || !selectedDate) {
      setAlert({ type: 'error', message: 'Please select an appointment date and an available time slot.' });
      return;
    }
    setBooking(true);
    setAlert(null);
    try {
      await api.post('/appointments', {
        doctor: selectedDoctor._id,
        date: selectedDate,
        timeSlot: selectedSlot,
        type: apptType,
        symptoms,
      });
      setAlert({ type: 'success', message: t('bookingSuccess') });
      setSelectedDoctor(null);
      setSelectedSlot(null);
      setSymptoms('');
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Booking failed. Slot may already be reserved.' });
    } finally {
      setBooking(false);
    }
  };

  const today = new Date();
  const minDate = today.toISOString().split('T')[0];

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>Find & Book Certified Specialists</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Select date, view real-time time slots, and schedule instant video consultations
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-200">
            <ShieldCheck className="w-4 h-4 text-blue-600" />
            <span>MCI-Verified Medical Practitioners</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="glass-panel p-4 rounded-2xl flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search doctor by name (e.g. Sharma, Patel, Gupta)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm placeholder-slate-400"
            />
          </div>
          <div className="relative sm:w-64">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <select
              value={spec}
              onChange={e => setSpec(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm bg-white"
            >
              {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor list */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="py-16 flex items-center justify-center glass-panel">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              </div>
            ) : doctors.length === 0 ? (
              <div className="py-16 text-center text-slate-500 glass-panel">
                <Search className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-700">No doctors found matching criteria.</p>
                <p className="text-xs text-slate-400 mt-1">Try selecting 'All' specializations or clearing the search box.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {doctors.map(doc => (
                  <DoctorCard
                    key={doc._id}
                    doctor={doc}
                    onSelect={d => {
                      setSelectedDoctor(d._id === selectedDoctor?._id ? null : d);
                      setSelectedDate('');
                      setSlots([]);
                    }}
                    selected={selectedDoctor?._id === doc._id}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Booking panel */}
          <div>
            {selectedDoctor ? (
              <div className="glass-panel p-5 rounded-2xl sticky top-24 space-y-4 border-blue-200 animate-slide-up">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">{t('bookAppointment')}</h2>
                  <button
                    onClick={() => { setSelectedDoctor(null); setSlots([]); }}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                  <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white text-base">
                    {selectedDoctor.name?.replace(/^(Dr\.|Dr\s)/i, '').trim().charAt(0) || 'D'}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {selectedDoctor.name?.startsWith('Dr.') ? selectedDoctor.name : `Dr. ${selectedDoctor.name}`}
                    </p>
                    <p className="text-xs font-semibold text-blue-700">{selectedDoctor.specialization}</p>
                    <p className="text-xs text-slate-600 mt-0.5 font-bold">₹{selectedDoctor.consultationFee || 200} Consultation Fee</p>
                  </div>
                </div>

                {/* Date picker */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    <Calendar className="inline w-3.5 h-3.5 mr-1 text-blue-600" />
                    {t('bookingDate')}
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-sm bg-white"
                  />
                </div>

                {/* Available Slots Display */}
                {selectedDate && (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                      <Clock className="inline w-3.5 h-3.5 mr-1 text-blue-600" />
                      {t('selectSlot')}
                    </label>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-5">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : slots.length === 0 ? (
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                        <AlertCircle className="w-4 h-4 text-slate-400 mx-auto mb-1" />
                        <p className="font-semibold text-slate-700">No slots available on this day</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Please pick another date or doctor</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {slots.map((slot, i) => {
                          const slotStart = slot.start || slot.startTime;
                          const slotEnd = slot.end || slot.endTime;
                          const isSelected = selectedSlot?.start === slotStart && selectedSlot?.end === slotEnd;
                          const isAvailable = slot.available !== false;

                          return (
                            <button
                              key={i}
                              type="button"
                              disabled={!isAvailable}
                              onClick={() => setSelectedSlot({ start: slotStart, end: slotEnd })}
                              className={`py-2 px-2 rounded-xl text-xs font-bold transition-all border ${
                                !isAvailable
                                  ? 'opacity-40 cursor-not-allowed border-slate-200 text-slate-400 bg-slate-100 line-through'
                                  : isSelected
                                  ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                                  : 'border-slate-200 text-slate-700 bg-white hover:border-blue-400 hover:bg-blue-50/50'
                              }`}
                            >
                              {slotStart} – {slotEnd}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Type & symptoms */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t('appointmentType')}
                  </label>
                  <select
                    value={apptType}
                    onChange={e => setApptType(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-sm bg-white"
                  >
                    {TYPES.map(tp => (
                      <option key={tp} value={tp}>
                        {t(tp === 'follow-up' ? 'followUp' : tp)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    {t('symptoms')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe symptoms, e.g. Fever, cough for 2 days..."
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-xl text-sm bg-white resize-none"
                  />
                </div>

                <button
                  onClick={handleBook}
                  disabled={booking || !selectedSlot}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {booking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming booking...</span>
                    </>
                  ) : (
                    <>
                      <span>{t('confirmBooking')}</span>
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="glass-panel p-8 text-center text-slate-500 space-y-2">
                <Stethoscope className="w-10 h-10 mx-auto text-blue-400/50" />
                <p className="font-bold text-slate-800 text-sm">Select a Doctor to Consult</p>
                <p className="text-xs text-slate-400">
                  Click on any practitioner card on the left to see available dates and time slots.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}