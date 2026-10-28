import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Plus, Trash2, Send, Loader2, CheckCircle, Shield, 
  ArrowLeft, Pill, ShieldCheck, User, Calendar, Clock, AlertCircle
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Thrice daily', 'Every 4 hours', 
  'Every 6 hours', 'Every 8 hours', 'At bedtime', 'As needed'
];
const emptyMed = { name: '', dosage: '', frequency: 'Once daily', duration: '', instructions: '' };

export default function PrescriptionForm() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();

  const [activeAptId, setActiveAptId] = useState(appointmentId && appointmentId !== 'new' ? appointmentId : '');
  const [doctorAppointments, setDoctorAppointments] = useState([]);
  const [appointment, setAppointment] = useState(null);
  const [existingPrescription, setExistingPrescription] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState([{ ...emptyMed }]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingPharmacy, setSendingPharmacy] = useState(false);
  const [alert, setAlert] = useState(null);

  // Load all doctor appointments for quick standalone selection
  useEffect(() => {
    const fetchAppointmentsList = async () => {
      try {
        const res = await api.get('/appointments?limit=50');
        const list = res.data.appointments || [];
        setDoctorAppointments(list);
        if (!activeAptId && list.length > 0) {
          setActiveAptId(list[0]._id);
        }
      } catch (err) {
        console.error('Failed to load appointments list:', err);
      }
    };
    fetchAppointmentsList();
  }, []);

  // Load specific appointment & existing prescription
  useEffect(() => {
    if (!activeAptId || activeAptId === 'new') {
      setLoading(false);
      return;
    }

    const fetchAppt = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/appointments/${activeAptId}`);
        const appt = res.data.appointment;
        setAppointment(appt);
        if (appt.prescription) {
          setExistingPrescription(appt.prescription);
        } else {
          setExistingPrescription(null);
          // Pre-populate diagnosis or symptoms if provided
          if (appt.symptoms) {
            setAdditionalNotes(`Patient symptoms noted: ${appt.symptoms}`);
          }
        }
      } catch {
        setAlert({ type: 'error', message: 'Failed to load consultation details for this prescription.' });
      } finally {
        setLoading(false);
      }
    };

    fetchAppt();
  }, [activeAptId]);

  const addMed = () => setMedications(m => [...m, { ...emptyMed }]);
  const removeMed = (idx) => setMedications(m => m.filter((_, i) => i !== idx));
  const updateMed = (idx, field, val) => setMedications(m => m.map((med, i) => i === idx ? { ...med, [field]: val } : med));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!activeAptId) {
      setAlert({ type: 'error', message: 'Please select a patient appointment to issue this prescription.' });
      return;
    }
    if (!diagnosis.trim()) { 
      setAlert({ type: 'error', message: 'Clinical diagnosis is required.' }); 
      return; 
    }
    if (medications.some(m => !m.name.trim() || !m.dosage.trim() || !m.duration.trim())) {
      setAlert({ type: 'error', message: 'All medication fields (Name, Dosage, Duration) are required.' });
      return;
    }

    setGenerating(true);
    setAlert(null);
    try {
      const res = await api.post('/prescriptions', { 
        appointmentId: activeAptId, 
        diagnosis, 
        medications, 
        additionalNotes 
      });
      setExistingPrescription(res.data.prescription);
      setAlert({ type: 'success', message: 'Digital e-Prescription generated & cryptographically signed (SHA-256)!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to generate prescription.' });
    } finally {
      setGenerating(false);
    }
  };

  const handleSendPharmacy = async () => {
    if (!existingPrescription) return;
    setSendingPharmacy(true);
    setAlert(null);
    try {
      const res = await api.post(`/prescriptions/${existingPrescription._id}/send-to-pharmacy`);
      setExistingPrescription(p => ({ ...p, pharmacyStatus: res.data.prescription?.pharmacyStatus || 'sent' }));
      setAlert({ type: 'success', message: 'Prescription successfully dispatched to designated partner pharmacy!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to send to pharmacy.' });
    } finally {
      setSendingPharmacy(false);
    }
  };

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
      <div className="space-y-6 max-w-4xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Header with Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <div className="flex items-center space-x-3 mb-1.5">
              <Link
                to="/doctor/appointments"
                className="flex items-center space-x-1 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>All Consultations</span>
              </Link>
              <span className="text-slate-300">·</span>
              <Link
                to="/doctor/dashboard"
                className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors"
              >
                Dashboard
              </Link>
            </div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>Digital e-Prescription (SRS FR-7 & FR-8)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Stand-alone certified e-Prescription generator — valid with or without an active video call
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-xs">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>SHA-256 Digitally Signed</span>
            </span>
          </div>
        </div>

        {/* Patient / Appointment Selector Dropdown */}
        <div className="glass-panel p-4 rounded-2xl bg-white shadow-card space-y-2 border border-blue-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
              <User className="w-4 h-4 text-blue-600" />
              <span>Select Consultation / Patient Record</span>
            </label>
            {appointment && (
              <span className="text-xs text-slate-500">
                Status: <strong className="capitalize text-slate-800">{appointment.status}</strong> · {appointment.timeSlot?.start} – {appointment.timeSlot?.end}
              </span>
            )}
          </div>
          <select
            value={activeAptId}
            onChange={e => {
              setActiveAptId(e.target.value);
              navigate(`/doctor/prescription/${e.target.value}`, { replace: true });
            }}
            className="glass-input w-full p-2.5 rounded-xl text-xs bg-white font-semibold text-slate-800"
          >
            {doctorAppointments.length === 0 ? (
              <option value="">No appointments found</option>
            ) : (
              doctorAppointments.map(apt => (
                <option key={apt._id} value={apt._id}>
                  {apt.patient?.name || 'Patient'} — {new Date(apt.date).toLocaleDateString('en-IN')} ({apt.timeSlot?.start} - {apt.timeSlot?.end}) [{apt.status.toUpperCase()}]
                </option>
              ))
            )}
          </select>
        </div>

        {/* Existing / Signed Prescription View */}
        {existingPrescription ? (
          <div className="space-y-4">
            <div className="glass-panel p-6 sm:p-8 rounded-2xl bg-white shadow-card space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Official Certified e-Prescription</h2>
                    <p className="text-xs text-slate-500">Cryptographically signed with SHA-256 certificate</p>
                  </div>
                </div>
                <StatusBadge status={existingPrescription.pharmacyStatus} />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinical Diagnosis</p>
                  <p className="font-semibold text-slate-900 mt-1">{existingPrescription.diagnosis}</p>
                </div>
                {existingPrescription.additionalNotes && (
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Instructions & Advice</p>
                    <p className="text-slate-800 mt-1">{existingPrescription.additionalNotes}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Prescribed Medications</p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                  {existingPrescription.medications?.map((med, i) => (
                    <div key={i} className="p-3.5 bg-white flex items-center justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                          <Pill className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{med.name}</p>
                          <p className="text-xs text-slate-500">
                            {med.dosage} · {med.frequency} · Duration: {med.duration}
                          </p>
                          {med.instructions && (
                            <p className="text-xs text-blue-600 font-semibold mt-0.5">Note: {med.instructions}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Signature Block (FR-7) */}
              {existingPrescription.digitalSignature?.signedBy && (
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center space-x-1.5 text-blue-700 font-bold uppercase tracking-wider mb-1">
                    <Shield className="w-4 h-4" />
                    <span>Cryptographic Digital Signature (FR-7)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 font-medium">
                    <p>Signed By: <strong>Dr. {existingPrescription.digitalSignature.signedBy}</strong></p>
                    <p>Timestamp: <strong>{new Date(existingPrescription.digitalSignature.signedAt).toLocaleString('en-IN')}</strong></p>
                    <p className="sm:col-span-2">Cert ID: <code className="text-blue-700 font-mono font-bold">{existingPrescription.digitalSignature.certificateId}</code></p>
                    <p className="sm:col-span-2 truncate">SHA-256 Hash: <code className="text-slate-500 font-mono text-[11px]">{existingPrescription.digitalSignature.signatureHash}</code></p>
                  </div>
                </div>
              )}

              {/* Pharmacy Dispatch Action (FR-8) */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100">
                <div className="text-xs text-slate-600">
                  <span>Pharmacy Dispatch: </span>
                  <strong className="uppercase text-blue-700">{existingPrescription.pharmacyStatus}</strong>
                </div>
                {existingPrescription.pharmacyStatus === 'pending' ? (
                  <button
                    onClick={handleSendPharmacy}
                    disabled={sendingPharmacy}
                    className="flex items-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
                  >
                    {sendingPharmacy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Transmitting to Partner Pharmacy...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Send to Partner Pharmacy (FR-8)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="flex items-center space-x-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Dispatched to Pharmacy</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Generate Prescription Form */
          <form onSubmit={handleGenerate} className="glass-panel p-6 sm:p-8 rounded-2xl bg-white shadow-card space-y-6">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 bg-blue-50 p-3 rounded-xl border border-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Complies with MCI Telemedicine Practice Guidelines: Issues verified, SHA-256 digitally-signed prescriptions.</span>
            </div>

            {/* Diagnosis */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Clinical Diagnosis & Observations *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Acute upper respiratory tract infection, Hypertension Stage 1..."
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm font-medium"
              />
            </div>

            {/* Medications List */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Prescribed Medications (Rx) *
                </label>
                <button
                  type="button"
                  onClick={addMed}
                  className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Medication</span>
                </button>
              </div>

              {medications.map((med, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-600">Medicine #{idx + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMed(idx)}
                        className="text-slate-400 hover:text-rose-500"
                        title="Remove medicine"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Drug Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Paracetamol"
                        value={med.name}
                        onChange={e => updateMed(idx, 'name', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dosage *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500 mg"
                        value={med.dosage}
                        onChange={e => updateMed(idx, 'dosage', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Frequency *</label>
                      <select
                        value={med.frequency}
                        onChange={e => updateMed(idx, 'frequency', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white font-medium"
                      >
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Duration *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5 days"
                        value={med.duration}
                        onChange={e => updateMed(idx, 'duration', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-lg text-xs bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="Special instructions (e.g. Take after meals, with warm water)..."
                      value={med.instructions}
                      onChange={e => updateMed(idx, 'instructions', e.target.value)}
                      className="glass-input w-full px-3 py-1.5 rounded-lg text-xs bg-white placeholder-slate-400"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Additional Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Lifestyle Advice & Follow-Up Notes
              </label>
              <textarea
                rows={3}
                placeholder="Dietary precautions, hydration advice, or when to seek immediate emergency care..."
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                className="glass-input w-full p-3 rounded-xl text-xs bg-white resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={generating}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing with Digital Certificate...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    <span>Digitally Sign & Issue e-Prescription (FR-7)</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
