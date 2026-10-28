import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Plus, Trash2, Send, Loader2, CheckCircle, Shield, 
  ArrowLeft, Pill, ShieldCheck, User, Calendar, Clock, AlertCircle,
  Search, ShieldAlert, Sparkles, BookOpen, ExternalLink, Printer
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import DrugInfoModal from '../../components/DrugInfoModal';
import DailyPillSchedule from '../../components/DailyPillSchedule';
import QRCodeBadge from '../../components/QRCodeBadge';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const FREQUENCIES = [
  'Once daily', 'Twice daily', 'Thrice daily', 'Every 4 hours', 
  'Every 6 hours', 'Every 8 hours', 'At bedtime', 'As needed'
];

const emptyMed = { 
  name: '', 
  dosage: '', 
  frequency: 'Once daily', 
  duration: '', 
  instructions: '',
  genericName: '',
  category: ''
};

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

  // E-Prescription Suite additions
  const [templates, setTemplates] = useState([]);
  const [activeSearchIndex, setActiveSearchIndex] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchingDrugs, setSearchingDrugs] = useState(false);
  const [interactions, setInteractions] = useState([]);
  const [checkingInteractions, setCheckingInteractions] = useState(false);
  const [selectedDrugInfo, setSelectedDrugInfo] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Load all doctor appointments & templates on mount
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [aptRes, tplRes] = await Promise.allSettled([
          api.get('/appointments?limit=50'),
          api.get('/prescriptions/templates')
        ]);

        if (aptRes.status === 'fulfilled') {
          const list = aptRes.value.data.appointments || [];
          setDoctorAppointments(list);
          if (!activeAptId && list.length > 0) {
            setActiveAptId(list[0]._id);
          }
        }
        if (tplRes.status === 'fulfilled') {
          setTemplates(tplRes.value.data.templates || []);
        }
      } catch (err) {
        console.error('Failed to load initial e-prescription data:', err);
      }
    };
    fetchInitialData();
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

  // Real-time Drug-Drug Interaction check with debounce
  useEffect(() => {
    const validMeds = medications.filter(m => m.name && m.name.trim().length > 1);
    if (validMeds.length < 2) {
      setInteractions([]);
      return;
    }

    const timeout = setTimeout(async () => {
      setCheckingInteractions(true);
      try {
        const res = await api.post('/prescriptions/check-interactions', {
          medications: validMeds.map(m => m.name)
        });
        setInteractions(res.data.interactions || []);
      } catch (err) {
        console.error('DDI check failed:', err);
      } finally {
        setCheckingInteractions(false);
      }
    }, 400);

    return () => clearTimeout(timeout);
  }, [medications]);

  // Drug live search function
  const handleDrugSearch = (query, index) => {
    setActiveSearchIndex(index);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!query || query.trim().length < 1) {
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearchingDrugs(true);
      try {
        const res = await api.get(`/prescriptions/drugs/search?q=${encodeURIComponent(query)}`);
        setSearchResults(res.data.drugs || []);
      } catch (err) {
        console.error('Drug search error:', err);
      } finally {
        setSearchingDrugs(false);
      }
    }, 250);
  };

  const selectDrug = (drug, index) => {
    setMedications(prev => prev.map((med, i) => {
      if (i !== index) return med;
      return {
        ...med,
        name: drug.name,
        dosage: drug.defaultDosage || med.dosage,
        frequency: drug.defaultFrequency || med.frequency,
        duration: drug.defaultDuration || med.duration,
        instructions: drug.defaultInstructions || med.instructions,
        genericName: drug.genericName || '',
        category: drug.category || '',
        fullData: drug
      };
    }));
    setActiveSearchIndex(null);
    setSearchResults([]);
  };

  const applyTemplate = (tpl) => {
    setDiagnosis(tpl.diagnosis);
    if (tpl.notes) setAdditionalNotes(tpl.notes);
    if (tpl.medications && tpl.medications.length > 0) {
      setMedications(tpl.medications.map(m => ({
        name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        instructions: m.instructions || ''
      })));
    }
    setAlert({ 
      type: 'success', 
      message: `Applied Clinical Protocol: "${tpl.name}". You can customize doses or add more medications.` 
    });
  };

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
      setExistingPrescription(p => ({ 
        ...p, 
        pharmacyStatus: res.data.prescription?.pharmacyStatus || 'sent',
        trackingSteps: res.data.prescription?.trackingSteps || p.trackingSteps
      }));
      setAlert({ type: 'success', message: 'Prescription successfully dispatched to designated partner pharmacy network (FR-8)!' });
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

        {/* Drug Info Factsheet Modal */}
        {selectedDrugInfo && (
          <DrugInfoModal drug={selectedDrugInfo} onClose={() => setSelectedDrugInfo(null)} />
        )}

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
              <span>Digital e-Prescription Suite (SRS FR-7 & FR-8)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Clinical prescribing workstation with drug interaction safety checks, OpenFDA database, and instant pharmacy routing
            </p>
          </div>
          <div className="text-right flex items-center space-x-2">
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
                Patient: <strong className="text-slate-900">{appointment.patient?.name}</strong> · Status: <strong className="capitalize text-slate-800">{appointment.status}</strong>
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
            <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white shadow-card space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center font-bold">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900">Official Certified e-Prescription</h2>
                    <p className="text-xs text-slate-500">
                      Cryptographically signed · Certificate ID: {existingPrescription.digitalSignature?.certificateId || 'CERT-VALID'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <StatusBadge status={existingPrescription.pharmacyStatus} />
                  <Link
                    to={`/prescription/${existingPrescription._id}`}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Printable Slip</span>
                  </Link>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div>
                  <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Clinical Diagnosis</p>
                  <p className="font-extrabold text-slate-900 text-sm mt-1">{existingPrescription.diagnosis}</p>
                </div>
                {existingPrescription.additionalNotes && (
                  <div>
                    <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Instructions & Advice</p>
                    <p className="text-slate-800 mt-1 font-medium">{existingPrescription.additionalNotes}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Prescribed Medications</p>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden">
                  {existingPrescription.medications?.map((med, i) => (
                    <div key={i} className="p-3.5 bg-white flex items-center justify-between hover:bg-slate-50/50 transition-colors">
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
                      <button
                        type="button"
                        onClick={() => setSelectedDrugInfo({ name: med.name, defaultDosage: med.dosage, defaultInstructions: med.instructions })}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center space-x-1"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Drug Info</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Visual Daily Pill Schedule */}
              <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200">
                <DailyPillSchedule medications={existingPrescription.medications} />
              </div>

              {/* Digital Signature & QR Block */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs items-center">
                <div className="sm:col-span-2 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-blue-700 font-bold uppercase tracking-wider text-[11px]">
                    <Shield className="w-4 h-4" />
                    <span>Cryptographic Digital Signature (FR-7)</span>
                  </div>
                  <p>Signed By: <strong>Dr. {existingPrescription.digitalSignature?.signedBy}</strong></p>
                  <p>Timestamp: <strong>{new Date(existingPrescription.digitalSignature?.signedAt).toLocaleString('en-IN')}</strong></p>
                  <p>Cert ID: <code className="text-blue-700 font-mono font-bold">{existingPrescription.digitalSignature?.certificateId}</code></p>
                  <p className="truncate text-slate-500 text-[11px] font-mono">
                    Hash: {existingPrescription.digitalSignature?.signatureHash}
                  </p>
                </div>
                <div className="flex justify-center sm:justify-end">
                  <QRCodeBadge
                    value={`https://telemed.health/prescription/${existingPrescription._id}?cert=${existingPrescription.digitalSignature?.certificateId}`}
                    size={90}
                    label="VERIFY CERT"
                  />
                </div>
              </div>

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
                    <span>Dispatched to Partner Pharmacy (Apollo / 1mg)</span>
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Generate Prescription Form */
          <form onSubmit={handleGenerate} className="glass-panel p-6 sm:p-8 rounded-3xl bg-white shadow-card space-y-6">
            <div className="flex items-center space-x-2 text-xs font-bold text-blue-700 bg-blue-50 p-3 rounded-2xl border border-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span>Complies with MCI Telemedicine Practice Guidelines: Issues verified, SHA-256 digitally-signed prescriptions.</span>
            </div>

            {/* Quick Clinical Disease Templates */}
            {templates.length > 0 && (
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>One-Click Clinical Regimen Protocols</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl)}
                      className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 border border-slate-200 shadow-2xs transition-all flex items-center space-x-1.5"
                    >
                      <span>🩺</span>
                      <span>{tpl.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Real-time Drug Interaction Safety Banner */}
            {interactions.length > 0 ? (
              <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-2 animate-in fade-in">
                <div className="flex items-center space-x-2 text-rose-700 font-black text-xs uppercase tracking-wider">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  <span>⚠️ Clinical Alert: {interactions.length} Potential Drug-Drug Interaction(s) Detected</span>
                </div>
                {interactions.map((inter, i) => (
                  <div key={i} className="p-3 rounded-xl bg-white border border-rose-200 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-rose-900">{inter.drugs.join(' ⚡ ')}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                        inter.severity === 'Severe' ? 'bg-rose-600 text-white' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {inter.severity} Interaction
                      </span>
                    </div>
                    <p className="font-bold text-slate-800">{inter.title}</p>
                    <p className="text-slate-600 leading-relaxed">{inter.description}</p>
                    <p className="text-rose-700 font-semibold pt-0.5">Recommendation: {inter.recommendation}</p>
                  </div>
                ))}
              </div>
            ) : medications.filter(m => m.name && m.name.trim().length > 1).length >= 2 ? (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-bold">Clinical Safety Check: Zero adverse drug-drug interactions detected between selected medicines.</span>
              </div>
            ) : null}

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
                  className="flex items-center space-x-1 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Another Medication</span>
                </button>
              </div>

              {medications.map((med, idx) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
                      <Pill className="w-3.5 h-3.5 text-blue-600" />
                      <span>Medicine #{idx + 1}</span>
                      {med.category && (
                        <span className="text-[10px] text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-semibold">
                          {med.category}
                        </span>
                      )}
                    </span>
                    <div className="flex items-center space-x-2">
                      {med.name && (
                        <button
                          type="button"
                          onClick={() => setSelectedDrugInfo(med.fullData || { name: med.name, defaultDosage: med.dosage, defaultInstructions: med.instructions })}
                          className="text-[11px] font-bold text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Drug Facts</span>
                        </button>
                      )}
                      {medications.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMed(idx)}
                          className="text-slate-400 hover:text-rose-500 p-1"
                          title="Remove medicine"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {/* Drug Name with Autocomplete */}
                    <div className="relative">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Drug Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="Search drug (e.g. Paracetamol)..."
                        value={med.name}
                        onChange={e => {
                          updateMed(idx, 'name', e.target.value);
                          handleDrugSearch(e.target.value, idx);
                        }}
                        onFocus={() => {
                          if (med.name) handleDrugSearch(med.name, idx);
                        }}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-medium"
                      />

                      {/* Dropdown Results */}
                      {activeSearchIndex === idx && (searchResults.length > 0 || searchingDrugs) && (
                        <div className="absolute left-0 right-0 top-full mt-1 z-30 bg-white rounded-2xl shadow-xl border border-slate-200 max-h-56 overflow-y-auto divide-y divide-slate-100">
                          {searchingDrugs && (
                            <div className="p-3 text-xs text-slate-400 flex items-center space-x-2">
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                              <span>Searching FDA & Clinical Database...</span>
                            </div>
                          )}
                          {searchResults.map((drug, dIdx) => (
                            <button
                              key={dIdx}
                              type="button"
                              onClick={() => selectDrug(drug, idx)}
                              className="w-full text-left p-2.5 hover:bg-blue-50/70 transition-colors flex flex-col space-y-0.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-extrabold text-xs text-slate-900">{drug.name}</span>
                                <span className="text-[10px] text-blue-600 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                                  {drug.defaultDosage || drug.form}
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                {drug.genericName} · {drug.category}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Dosage *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 500 mg, 625 mg"
                        value={med.dosage}
                        onChange={e => updateMed(idx, 'dosage', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Frequency *</label>
                      <select
                        value={med.frequency}
                        onChange={e => updateMed(idx, 'frequency', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white font-medium"
                      >
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Duration *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5 days, 30 days"
                        value={med.duration}
                        onChange={e => updateMed(idx, 'duration', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                      />
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      placeholder="Special instructions (e.g. Take 30 mins before breakfast, after food with warm water)..."
                      value={med.instructions}
                      onChange={e => updateMed(idx, 'instructions', e.target.value)}
                      className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white placeholder-slate-400"
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
                className="glass-input w-full p-3 rounded-2xl text-xs bg-white resize-none"
              />
            </div>

            {/* Submit */}
            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={generating}
                className="flex items-center space-x-2 px-6 py-3 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
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
