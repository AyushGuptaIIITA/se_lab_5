import React, { useEffect, useState } from 'react';
import { Search, Filter, ChevronRight, Star, IndianRupee, Loader2, Calendar, Clock, Check, X, ShieldCheck, Stethoscope } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const SPECIALIZATIONS = ['All', 'General Medicine', 'Pediatrics', 'Cardiology', 'Dermatology', 'Orthopedics', 'ENT', 'Psychiatry', 'Gynecology', 'Neurology', 'Ophthalmology'];
const TYPES = ['general', 'follow-up', 'emergency'];

function DoctorCard({ doctor, onSelect, selected }) {
  return (
    <div
      onClick={() => onSelect(doctor)}
      className={`bg-white p-5 rounded-xl border cursor-pointer transition-all ${
        selected
          ? 'border-[#ff6f61] ring-2 ring-[#ff6f61]/20 shadow-md bg-[#fffbfb]'
          : 'border-gray-200 hover:border-[#ff6f61] hover:shadow-md'
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3.5">
          <div className="w-13 h-13 rounded-xl bg-gradient-to-tr from-[#10847e] to-[#26a69a] flex items-center justify-center text-xl font-black text-white flex-shrink-0 shadow-xs">
            {doctor.name?.charAt(0).toUpperCase() || 'D'}
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h3 className="font-bold text-gray-900 text-base">Dr. {doctor.name}</h3>
              <ShieldCheck className="w-4 h-4 text-[#10847e]" title="Verified Specialist" />
            </div>
            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#e8f6f5] text-[#10847e] mt-1 border border-teal-200/60">
              {doctor.specialization}
            </span>
          </div>
        </div>
        {selected ? (
          <span className="w-6 h-6 rounded-full bg-[#ff6f61] text-white flex items-center justify-center text-xs flex-shrink-0">
            ✓
          </span>
        ) : (
          <span className="text-xs font-bold text-[#ff6f61] hover:underline">Select</span>
        )}
      </div>

      {doctor.bio && (
        <p className="text-xs text-gray-600 mt-3 line-clamp-2 leading-relaxed">{doctor.bio}</p>
      )}

      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex items-center text-xs text-gray-700 font-semibold">
          <Star className="w-4 h-4 text-[#fe8d00] fill-[#fe8d00] mr-1" />
          <span>4.8</span>
          <span className="text-gray-400 ml-1">(250+ consults)</span>
        </div>
        <div className="flex items-center text-sm font-extrabold text-[#10847e]">
          <span>₹{doctor.consultationFee || 200}</span>
          <span className="text-[10px] text-gray-400 font-normal ml-1">Fee</span>
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
    if (!selectedDoctor || !selectedDate) return;
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
      setAlert({ type: 'error', message: 'Select a date and time slot.' });
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
      setAlert({ type: 'error', message: err.response?.data?.message || 'Booking failed. Slot may be taken.' });
    } finally {
      setBooking(false);
    }
  };

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
              <span className="text-[#ff6f61]">Consult Qualified Doctors</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose from certified specialists across India for online audio/video consultation
            </p>
          </div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-[#10847e] bg-teal-50 px-3 py-1.5 rounded-lg border border-teal-200">
            <ShieldCheck className="w-4 h-4" />
            <span>100% MCI Verified Doctors</span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search doctor by name (e.g. Sharma, Patel, Gupta)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm placeholder-gray-400"
            />
          </div>
          <div className="relative sm:w-64">
            <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={spec}
              onChange={e => setSpec(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-lg text-sm bg-white"
            >
              {SPECIALIZATIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Doctor list */}
          <div className="lg:col-span-2 space-y-4">
            {loading ? (
              <div className="py-16 flex items-center justify-center bg-white rounded-xl border border-gray-200">
                <Loader2 className="w-8 h-8 animate-spin text-[#ff6f61]" />
              </div>
            ) : doctors.length === 0 ? (
              <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200">
                <Search className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-semibold text-gray-700">No doctors found matching criteria.</p>
                <p className="text-xs text-gray-400 mt-1">Try selecting 'All' specializations or clearing the search box.</p>
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
              <div className="bg-white p-5 rounded-xl border border-[#ff6f61]/40 shadow-sm sticky top-24 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">{t('bookAppointment')}</h2>
                  <button
                    onClick={() => { setSelectedDoctor(null); setSlots([]); }}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center space-x-3 p-3 rounded-xl bg-orange-50/60 border border-orange-100">
                  <div className="w-10 h-10 rounded-xl bg-[#ff6f61] flex items-center justify-center font-bold text-white text-base">
                    {selectedDoctor.name?.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">Dr. {selectedDoctor.name}</p>
                    <p className="text-xs font-semibold text-[#10847e]">{selectedDoctor.specialization}</p>
                    <p className="text-xs text-gray-500 mt-0.5 font-bold">₹{selectedDoctor.consultationFee || 200} Consultation Fee</p>
                  </div>
                </div>

                {/* Date picker */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    <Calendar className="inline w-3.5 h-3.5 mr-1 text-[#ff6f61]" />
                    {t('bookingDate')}
                  </label>
                  <input
                    type="date"
                    min={minDate}
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-white"
                  />
                </div>

                {/* Slots */}
                {selectedDate && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                      <Clock className="inline w-3.5 h-3.5 mr-1 text-[#10847e]" />
                      {t('selectSlot')}
                    </label>
                    {slotsLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-[#ff6f61]" />
                      </div>
                    ) : slots.length === 0 ? (
                      <p className="text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg text-center">No available slots for this date.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        {slots.map((slot, i) => (
                          <button
                            key={i}
                            type="button"
                            disabled={!slot.available}
                            onClick={() => setSelectedSlot({ start: slot.start, end: slot.end })}
                            className={`py-2 px-2 rounded-lg text-xs font-bold transition-all border ${
                              !slot.available
                                ? 'opacity-40 cursor-not-allowed border-gray-200 text-gray-400 bg-gray-100 line-through'
                                : selectedSlot?.start === slot.start
                                ? 'bg-[#ff6f61] border-[#ff6f61] text-white shadow-xs'
                                : 'border-gray-200 text-gray-700 bg-white hover:border-[#ff6f61] hover:bg-orange-50/50'
                            }`}
                          >
                            {slot.start} – {slot.end}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Type & symptoms */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t('appointmentType')}
                  </label>
                  <select
                    value={apptType}
                    onChange={e => setApptType(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-white"
                  >
                    {TYPES.map(tp => (
                      <option key={tp} value={tp}>
                        {t(tp === 'follow-up' ? 'followUp' : tp)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">
                    {t('symptoms')}
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe symptoms, e.g. Fever for 2 days..."
                    value={symptoms}
                    onChange={e => setSymptoms(e.target.value)}
                    className="glass-input w-full px-3 py-2 rounded-lg text-sm bg-white resize-none"
                  />
                </div>

                <button
                  onClick={handleBook}
                  disabled={booking || !selectedSlot}
                  className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl text-sm font-bold text-white bg-[#ff6f61] hover:bg-[#e2584a] shadow-md shadow-[#ff6f61]/20 transition-all disabled:opacity-50"
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
              <div className="bg-white p-7 rounded-xl border border-gray-200 text-center text-gray-500 shadow-xs">
                <Stethoscope className="w-10 h-10 mx-auto mb-2 text-[#ff6f61]/40" />
                <p className="font-bold text-gray-800 text-sm">Select a Doctor to Consult</p>
                <p className="text-xs text-gray-400 mt-1">
                  Click on any doctor card on the left to see available dates and time slots.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}