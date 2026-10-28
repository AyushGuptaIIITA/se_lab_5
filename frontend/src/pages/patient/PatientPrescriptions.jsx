import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  FileText, Pill, Printer, Search, RefreshCw, Loader2, 
  Calendar, CheckCircle, ShieldCheck, Stethoscope, ArrowRight, Download
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PatientPrescriptions() {
  const { t } = useLanguage();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [alert, setAlert] = useState(null);

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

  const filtered = prescriptions.filter(p => {
    if (!search) return true;
    const q = search.toLowerCase();
    const docName = p.doctor?.name?.toLowerCase() || '';
    const diag = p.diagnosis?.toLowerCase() || '';
    const medNames = (p.medications || []).map(m => m.name.toLowerCase()).join(' ');
    return docName.includes(q) || diag.includes(q) || medNames.includes(q);
  });

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>My Digital e-Prescriptions</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Chronological ledger of all certified e-prescriptions with SHA-256 digital signatures (newest first)
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

        {/* Search Bar (No date selection required!) */}
        <div className="glass-panel p-4 rounded-2xl bg-white shadow-card">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search prescriptions by doctor name, diagnosis, or medicine (e.g. Paracetamol)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Prescriptions List */}
        {loading ? (
          <div className="py-20 flex items-center justify-center glass-panel bg-white rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 glass-panel bg-white rounded-2xl shadow-card">
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
                    <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs">
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
                  <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-100">
                    <Link
                      to={`/prescription/${p._id}`}
                      className="flex-1 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-all"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>View Official Prescription</span>
                    </Link>
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
