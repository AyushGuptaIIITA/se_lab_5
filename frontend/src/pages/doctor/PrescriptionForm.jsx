import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Send, Loader2, CheckCircle, Shield, ArrowLeft, Pill } from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const FREQUENCIES = ['Once daily', 'Twice daily', 'Thrice daily', 'Every 4 hours', 'Every 6 hours', 'Every 8 hours', 'At bedtime', 'As needed'];

const emptyMed = { name: '', dosage: '', frequency: 'Once daily', duration: '', instructions: '' };

export default function PrescriptionForm() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [appointment, setAppointment] = useState(null);
  const [existingPrescription, setExistingPrescription] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [medications, setMedications] = useState([{ ...emptyMed }]);
  const [additionalNotes, setAdditionalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [sendingPharmacy, setSendingPharmacy] = useState(false);
  const [alert, setAlert] = useState(null);
  const [preview, setPreview] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/appointments/${appointmentId}`);
        setAppointment(res.data.appointment);
        if (res.data.appointment.prescription) {
          setExistingPrescription(res.data.appointment.prescription);
        }
      } catch { setAlert({ type: 'error', message: 'Failed to load appointment.' }); }
      finally { setLoading(false); }
    };
    fetch();
  }, [appointmentId]);

  const addMed = () => setMedications(m => [...m, { ...emptyMed }]);
  const removeMed = (idx) => setMedications(m => m.filter((_, i) => i !== idx));
  const updateMed = (idx, field, val) => setMedications(m => m.map((med, i) => i === idx ? { ...med, [field]: val } : med));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim()) { setAlert({ type: 'error', message: 'Diagnosis is required.' }); return; }
    if (medications.some(m => !m.name || !m.dosage || !m.duration)) { setAlert({ type: 'error', message: 'All medication fields are required.' }); return; }
    setGenerating(true);
    setAlert(null);
    try {
      const res = await api.post('/prescriptions', { appointmentId, diagnosis, medications, additionalNotes });
      setExistingPrescription(res.data.prescription);
      setAlert({ type: 'success', message: t('prescriptionSuccess') });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to generate prescription.' });
    } finally { setGenerating(false); }
  };

  const handleSendPharmacy = async () => {
    if (!existingPrescription) return;
    setSendingPharmacy(true);
    setAlert(null);
    try {
      const res = await api.post(`/prescriptions/${existingPrescription._id}/send-to-pharmacy`);
      setExistingPrescription(p => ({ ...p, pharmacyStatus: res.data.prescription?.pharmacyStatus || 'sent' }));
      setAlert({ type: 'success', message: t('pharmacySuccess') });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to send to pharmacy.' });
    } finally { setSendingPharmacy(false); }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div></Layout>;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex items-center justify-between">
          <div>
            <button onClick={() => navigate('/doctor/dashboard')} className="flex items-center space-x-1.5 text-xs text-slate-400 hover:text-indigo-400 mb-2 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /><span>{t('back')}</span>
            </button>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <FileText className="w-6 h-6 text-teal-400" /><span>e-Prescription</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Patient: <span className="font-semibold text-slate-200">{appointment?.patient?.name}</span> · {appointment ? new Date(appointment.date).toLocaleDateString('en-IN') : ''}</p>
          </div>
          {!existingPrescription && (
            <button type="button" onClick={() => setPreview(!preview)} className="text-xs px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors">
              {preview ? 'Edit Form' : 'Preview'}
            </button>
          )}
        </div>

        {/* Already generated — show signed prescription */}
        {existingPrescription ? (
          <div className="space-y-4">
            <div className="glass-panel p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
              <div className="flex items-center space-x-2 mb-4">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-emerald-300">Prescription Generated & Signed</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase">Diagnosis</p>
                  <p className="text-slate-200">{existingPrescription.diagnosis}</p>
                </div>
                {existingPrescription.additionalNotes && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase">Additional Notes</p>
                    <p className="text-slate-200">{existingPrescription.additionalNotes}</p>
                  </div>
                )}
              </div>

              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-3">Medications</p>
                <div className="space-y-2">
                  {existingPrescription.medications?.map((med, i) => (
                    <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-sm flex items-start space-x-3">
                      <Pill className="w-4 h-4 text-teal-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-200">{med.name}</span>
                        <span className="text-slate-400"> — {med.dosage} · {med.frequency} · {med.duration}</span>
                        {med.instructions && <p className="text-xs text-slate-500 mt-0.5">{med.instructions}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Digital Signature Block */}
              {existingPrescription.digitalSignature?.signedBy && (
                <div className="mt-4 p-4 rounded-xl bg-indigo-900/20 border border-indigo-500/30">
                  <p className="text-xs font-semibold text-indigo-400 uppercase flex items-center space-x-1.5 mb-2">
                    <Shield className="w-3.5 h-3.5" /><span>{t('digitalSignature')}</span>
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300">
                    <p>{t('signedBy')}: <span className="font-medium">Dr. {existingPrescription.digitalSignature.signedBy}</span></p>
                    <p>{t('signedAt')}: <span className="font-medium">{new Date(existingPrescription.digitalSignature.signedAt).toLocaleString('en-IN')}</span></p>
                    <p className="sm:col-span-2">Cert ID: <span className="font-mono text-indigo-300">{existingPrescription.digitalSignature.certificateId}</span></p>
                    <p className="sm:col-span-2 truncate">Hash: <span className="font-mono text-[10px] text-slate-500">{existingPrescription.digitalSignature.signatureHash}</span></p>
                  </div>
                </div>
              )}

              {/* Pharmacy status */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">{t('pharmacyStatus')}:</span>
                  <StatusBadge status={existingPrescription.pharmacyStatus} />
                </div>
                {existingPrescription.pharmacyStatus === 'pending' && (
                  <button onClick={handleSendPharmacy} disabled={sendingPharmacy} className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 shadow-lg shadow-teal-600/20 transition-all disabled:opacity-50">
                    {sendingPharmacy ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /><span>Sending...</span></> : <><Send className="w-3.5 h-3.5" /><span>{t('sendToPharmacy')}</span></>}
                  </button>
                )}
                {existingPrescription.pharmacyStatus !== 'pending' && (
                  <span className="text-xs text-emerald-400 flex items-center space-x-1"><CheckCircle className="w-3.5 h-3.5" /><span>Sent to pharmacy</span></span>
                )}
              </div>
            </div>

            <button onClick={() => navigate('/doctor/dashboard')} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
              <ArrowLeft className="w-4 h-4" /><span>Back to Dashboard</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Appointment context */}
            {appointment?.symptoms && (
              <div className="glass-card p-4 rounded-2xl border border-slate-800">
                <p className="text-xs font-semibold text-slate-400 uppercase mb-1">Patient's Symptoms</p>
                <p className="text-sm text-slate-300">{appointment.symptoms}</p>
              </div>
            )}

            {/* Diagnosis */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{t('diagnosis')} *</label>
              <textarea required rows={3} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} placeholder="Enter diagnosis..."
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none" />
            </div>

            {/* Medications */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{t('medications')} *</label>
                <button type="button" onClick={addMed} className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 transition-colors">
                  <Plus className="w-3.5 h-3.5" /><span>{t('addMedication')}</span>
                </button>
              </div>

              {medications.map((med, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 font-semibold">Medication #{idx + 1}</span>
                    {medications.length > 1 && (
                      <button type="button" onClick={() => removeMed(idx)} className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('drugName')} *</label>
                      <input type="text" required placeholder="e.g. Paracetamol 500mg" value={med.name} onChange={e => updateMed(idx, 'name', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('dosage')} *</label>
                      <input type="text" required placeholder="e.g. 1 tablet" value={med.dosage} onChange={e => updateMed(idx, 'dosage', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('frequency')} *</label>
                      <select value={med.frequency} onChange={e => updateMed(idx, 'frequency', e.target.value)} className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-100 focus:outline-none">
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('duration')} *</label>
                      <input type="text" required placeholder="e.g. 5 days" value={med.duration} onChange={e => updateMed(idx, 'duration', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none" />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">{t('instructions')}</label>
                      <input type="text" placeholder="e.g. After meals" value={med.instructions} onChange={e => updateMed(idx, 'instructions', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional notes */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">{t('additionalNotes')}</label>
              <textarea rows={2} value={additionalNotes} onChange={e => setAdditionalNotes(e.target.value)} placeholder="Rest, diet, follow-up instructions..."
                className="glass-input w-full px-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none" />
            </div>

            <div className="flex items-center justify-between">
              <button type="button" onClick={() => navigate('/doctor/dashboard')} className="flex items-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors">
                <ArrowLeft className="w-4 h-4" /><span>{t('cancel')}</span>
              </button>
              <button type="submit" disabled={generating} className="flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50">
                {generating ? <><Loader2 className="w-4 h-4 animate-spin" /><span>Generating...</span></> : <><Shield className="w-4 h-4" /><span>{t('generatePrescription')}</span></>}
              </button>
            </div>
          </form>
        )}
      </div>
    </Layout>
  );
}
