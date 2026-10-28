import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Pill, Printer, Search, RefreshCw, Loader2, 
  Calendar, CheckCircle, ShieldCheck, Stethoscope, ArrowRight, Download,
  Clock, Package, Utensils, X, Check
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import DailyPillSchedule from '../../components/DailyPillSchedule';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PatientPrescriptions() {
  const { t } = useLanguage();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState(null);
  const [activeTab, setActiveTab] = useState('list'); // 'list' | 'schedule'

  // Refill Modal state
  const [refillPrescription, setRefillPrescription] = useState(null);
  const [refillNotes, setRefillNotes] = useState('');
  const [requestingRefill, setRequestingRefill] = useState(false);

  const fetchPrescriptions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/prescriptions?limit=100');
      setPrescriptions(res.data.prescriptions || []);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load your prescriptions.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
  }, []);

  const handleRequestRefill = async (e) => {
    e.preventDefault();
    if (!refillPrescription) return;
    setRequestingRefill(true);
    try {
      const res = await api.post(`/prescriptions/${refillPrescription._id}/refill-request`, {
        notes: refillNotes
      });
      setPrescriptions(prev => prev.map(p => p._id === refillPrescription._id ? res.data.prescription : p));
      setRefillPrescription(null);
      setRefillNotes('');
      setAlert({ type: 'success', message: 'Prescription renewal / refill requested successfully!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit refill request.' });
    } finally {
      setRequestingRefill(false);
    }
  };

  const filtered = prescriptions.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const docName = p.doctor?.name?.toLowerCase() || '';
    const diag = p.diagnosis?.toLowerCase() || '';
    const medNames = (p.medications || []).map(m => m.name.toLowerCase()).join(' ');
    return docName.includes(q) || diag.includes(q) || medNames.includes(q);
  });

  // Collect all medications from active recent prescriptions for the Daily Pill Schedule tab
  const allRecentMedications = filtered.flatMap(p => p.medications || []);

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Refill Modal */}
        {refillPrescription && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Request Prescription Refill</h3>
                </div>
                <button onClick={() => setRefillPrescription(null)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Request a refill from <strong>{refillPrescription.doctor?.name}</strong> for: <em>{refillPrescription.diagnosis}</em>
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notes or Symptoms (Optional)
                </label>
                <textarea
                  rows={3}
                  value={refillNotes}
                  onChange={e => setRefillNotes(e.target.value)}
                  placeholder="e.g. Taking regularly for blood pressure, medicine running out this week..."
                  className="glass-input w-full p-3 rounded-2xl text-xs bg-white resize-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRefillPrescription(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestRefill}
                  disabled={requestingRefill}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {requestingRefill ? 'Submitting...' : 'Submit Refill Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>My Digital e-Prescriptions</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive prescription ledger, daily pill timetable, and partner pharmacy tracking (newest first)
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPrescriptions}
              disabled={loading}
              title="Refresh"
              className="p-2.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/patient/appointments"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>My Appointments</span>
            </Link>
          </div>
        </div>

        {/* Tab Switcher & Search Bar */}
        <div className="glass-panel p-4 rounded-3xl bg-white shadow-card space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* View Tabs */}
            <div className="flex items-center p-1 rounded-2xl bg-slate-100 border border-slate-200 text-xs font-bold w-fit">
              <button
                onClick={() => setActiveTab('list')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'list'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Prescription Ledger ({filtered.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl transition-all ${
                  activeTab === 'schedule'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Utensils className="w-3.5 h-3.5" />
                <span>My Daily Pill Schedule</span>
              </button>
            </div>

            {/* Quick stats badge */}
            <span className="text-xs text-slate-500 font-semibold">
              Showing {filtered.length} verified prescription{filtered.length !== 1 ? 's' : ''}
            </span>
          </div>

          {activeTab === 'list' && (
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search prescriptions by doctor name, diagnosis, or medicine (e.g. Paracetamol)..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="glass-input w-full pl-10 pr-4 py-2.5 rounded-2xl text-xs"
              />
            </div>
          )}
        </div>

        {/* Content Tabs */}
        {activeTab === 'schedule' ? (
          <div className="glass-panel p-6 sm:p-8 rounded-3xl bg-white shadow-card space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-black text-slate-900">Your Complete Daily Medication Routine</h3>
                <p className="text-xs text-slate-500">
                  Aggregated Morning, Afternoon, and Night routine across all your current prescriptions
                </p>
              </div>
            </div>
            {allRecentMedications.length === 0 ? (
              <p className="text-xs text-slate-500 italic py-6 text-center">No active medications found to schedule.</p>
            ) : (
              <DailyPillSchedule medications={allRecentMedications} />
            )}
          </div>
        ) : loading ? (
          <div className="py-20 flex items-center justify-center glass-panel bg-white rounded-3xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 glass-panel bg-white rounded-3xl shadow-card">
            <FileText className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700">No prescriptions found</p>
            <p className="text-xs text-slate-400 mt-1">Prescriptions issued by your consulting doctors will appear here automatically</p>
            <Link
              to="/patient/search-doctors"
              className="mt-4 inline-block px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              Book a Consultation →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(p => {
              const docName = p.doctor?.name?.startsWith('Dr.') ? p.doctor?.name : `Dr. ${p.doctor?.name || 'Specialist'}`;
              const formattedDate = new Date(p.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              });

              return (
                <div
                  key={p._id}
                  className="glass-card p-5 rounded-3xl border border-slate-200 bg-white hover:shadow-card-hover transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center space-x-3">
                        <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-bold text-base shadow-xs">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{docName}</h3>
                          <p className="text-xs font-semibold text-blue-700">{p.doctor?.specialization || 'Physician'}</p>
                          <span className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>Issued: {formattedDate}</span>
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={p.pharmacyStatus} />
                    </div>

                    {/* Clinical Diagnosis */}
                    <div className="p-3 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs">
                      <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Clinical Diagnosis</span>
                      <p className="text-sm font-bold text-slate-900 mt-0.5">{p.diagnosis}</p>
                    </div>

                    {/* Prescribed Medications Chips */}
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                        Prescribed Medicines ({p.medications?.length || 0})
                      </span>
                      <div className="space-y-1.5">
                        {p.medications?.map((m, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Pill className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                              <span className="font-bold text-slate-900">{m.name}</span>
                              <span className="text-slate-500 text-[11px]">· {m.dosage}</span>
                            </div>
                            <span className="text-[10px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                              {m.frequency} ({m.duration})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Refill Status Banner if active */}
                    {p.refillStatus && p.refillStatus !== 'none' && (
                      <div className={`p-2.5 rounded-xl text-xs flex items-center justify-between border ${
                        p.refillStatus === 'approved'
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                          : p.refillStatus === 'declined'
                          ? 'bg-rose-50 border-rose-200 text-rose-800'
                          : 'bg-amber-50 border-amber-200 text-amber-800'
                      }`}>
                        <span className="font-bold flex items-center space-x-1.5">
                          <RefreshCw className="w-3.5 h-3.5" />
                          <span>Refill: {p.refillStatus.toUpperCase()}</span>
                        </span>
                        {p.refillRequestedAt && (
                          <span className="text-[10px] opacity-75">
                            {new Date(p.refillRequestedAt).toLocaleDateString('en-IN')}
                          </span>
                        )}
                      </div>
                    )}

                    {/* SHA-256 Digital Signature Badge */}
                    {p.digitalSignature?.signatureHash && (
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-center justify-between">
                        <span className="flex items-center space-x-1 font-semibold text-blue-700">
                          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
                          <span>MCI Verified Digital Signature</span>
                        </span>
                        <span className="font-mono text-[10px] text-slate-400 truncate max-w-[120px]">
                          {p.digitalSignature.certificateId || 'CERT-VALID'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                    <Link
                      to={`/prescription/${p._id}`}
                      className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Official Slip</span>
                    </Link>

                    {/* Refill Action Button */}
                    {p.refillStatus !== 'requested' && p.refillStatus !== 'approved' && (
                      <button
                        onClick={() => setRefillPrescription(p)}
                        className="flex items-center space-x-1 py-2 px-3 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                        title="Request Refill / Renewal"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                        <span>Refill</span>
                      </button>
                    )}

                    <Link
                      to={`/prescription/${p._id}`}
                      className="flex items-center space-x-1 py-2 px-3 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                      title="Print or Save as PDF"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-600" />
                      <span>Print</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
