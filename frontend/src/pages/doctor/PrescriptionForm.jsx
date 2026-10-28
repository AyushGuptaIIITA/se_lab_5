import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Plus, Trash2, Send, Loader2, CheckCircle, Shield, ArrowLeft, Pill, ShieldCheck } from 'lucide-react';
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

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get(`/appointments/${appointmentId}`);
        setAppointment(res.data.appointment);
        if (res.data.appointment.prescription) {
          setExistingPrescription(res.data.appointment.prescription);
        }
      } catch {
        setAlert({ type: 'error', message: 'Failed to load appointment.' });
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [appointmentId]);

  const addMed = () => setMedications(m => [...m, { ...emptyMed }]);
  const removeMed = (idx) => setMedications(m => m.filter((_, i) => i !== idx));
  const updateMed = (idx, field, val) => setMedications(m => m.map((med, i) => i === idx ? { ...med, [field]: val } : med));

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!diagnosis.trim()) { setAlert({ type: 'error', message: 'Diagnosis is required.' }); return; }
    if (medications.some(m => !m.name || !m.dosage || !m.duration)) {
      setAlert({ type: 'error', message: 'All medication fields are required.' });
      return;
    }
    setGenerating(true);
    setAlert(null);
    try {
      const res = await api.post('/prescriptions', { appointmentId, diagnosis, medications, additionalNotes });
      setExistingPrescription(res.data.prescription);
      setAlert({ type: 'success', message: t('prescriptionSuccess') });
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
      setAlert({ type: 'success', message: 'Prescription successfully dispatched to designated pharmacy!' });
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

        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div>
            <button
              onClick={() => navigate('/doctor/dashboard')}
              className="flex items-center space-x-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-1.5 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </button>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>Digital e-Prescription (FR-7 & FR-8)</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Patient: <strong className="text-slate-800">{appointment?.patient?.name}</strong> · Consultation Date: {appointment ? new Date(appointment.date).toLocaleDateString('en-IN') : ''}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span>SHA-256 Digitally Signed</span>
            </span>
          </div>
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
                    className="flex items-center justify-center space-x-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all disabled:opacity-50"
                  >
                    {sendingPharmacy ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending to Pharmacy...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Dispatch to Partner Pharmacy (FR-8)</span>
                      </>
                    )}
                  </button>
                ) : (
                  <span className="text-xs font-bold text-emerald-700 flex items-center space-x-1.5">
                    <CheckCircle className="w-4 h-4" />
                    <span>Prescription dispatched to pharmacy adapter for fulfillment</span>
                  </span>
                )}
              </div>
            </div>

            <button
              onClick={() => navigate('/doctor/dashboard')}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:border-slate-300"
            >
              ← Return to Dashboard
            </button>
          </div>
        ) : (
          <form onSubmit={handleGenerate} className="space-y-5">
            {/* Diagnosis */}
            <div className="glass-panel p-5 rounded-2xl bg-white shadow-card space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{t('diagnosis')} *</label>
              <textarea
                required
                rows={2}
                value={diagnosis}
                onChange={e => setDiagnosis(e.target.value)}
                placeholder="Enter clinical diagnosis (e.g. Acute Pharyngitis with Low Grade Fever)..."
                className="glass-input w-full p-3 rounded-xl text-sm bg-white resize-none"
              />
            </div>

            {/* Medications List */}
            <div className="glass-panel p-5 rounded-2xl bg-white shadow-card space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">{t('medications')} *</label>
                <button
                  type="button"
                  onClick={addMed}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 border border-blue-200 hover:bg-blue-100 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{t('addMedication')}</span>
                </button>
              </div>

              {medications.map((med, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Medication #{idx + 1}</span>
                    {medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMed(idx)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{t('drugName')} *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Paracetamol 650mg / Amoxicillin 500mg"
                        value={med.name}
                        onChange={e => updateMed(idx, 'name', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{t('dosage')} *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 1 Tablet"
                        value={med.dosage}
                        onChange={e => updateMed(idx, 'dosage', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{t('frequency')} *</label>
                      <select
                        value={med.frequency}
                        onChange={e => updateMed(idx, 'frequency', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                      >
                        {FREQUENCIES.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{t('duration')} *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 5 days"
                        value={med.duration}
                        onChange={e => updateMed(idx, 'duration', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">{t('instructions')}</label>
                      <input
                        type="text"
                        placeholder="e.g. Take after meals with warm water"
                        value={med.instructions}
                        onChange={e => updateMed(idx, 'instructions', e.target.value)}
                        className="glass-input w-full px-3 py-2 rounded-xl text-xs bg-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Additional notes */}
            <div className="glass-panel p-5 rounded-2xl bg-white shadow-card space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">{t('additionalNotes')}</label>
              <textarea
                rows={2}
                value={additionalNotes}
                onChange={e => setAdditionalNotes(e.target.value)}
                placeholder="Dietary instructions, fluids, follow-up recommendations..."
                className="glass-input w-full p-3 rounded-xl text-sm bg-white resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => navigate('/doctor/dashboard')}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:border-slate-300"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={generating}
                className="flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/25 transition-all disabled:opacity-50"
              >
                {generating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing with SHA-256...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Sign & Generate e-Prescription (FR-7)</span>
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