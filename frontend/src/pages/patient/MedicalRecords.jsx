import React, { useEffect, useState } from 'react';
import { FileText, Pill, Calendar, User, Loader2, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

function RecordCard({ record }) {
  const [open, setOpen] = useState(false);
  const pres = record.prescription;

  return (
    <div className="glass-card rounded-2xl border border-slate-800 overflow-hidden">
      <div className="p-5 flex items-start justify-between cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-start space-x-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <p className="font-semibold text-slate-200">Dr. {record.doctor?.name || 'Unknown'}</p>
              <StatusBadge status={record.status} />
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · {record.timeSlot?.start}
            </p>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">{record.type} · {record.doctor?.specialization}</p>
            {pres && <p className="text-xs text-emerald-400 mt-1">✓ Prescription: {pres.diagnosis}</p>}
          </div>
        </div>
        <button className="text-slate-400 hover:text-slate-200 flex-shrink-0 mt-1">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-slate-800 pt-4 space-y-4">
          {record.symptoms && (
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Symptoms</p>
              <p className="text-sm text-slate-300">{record.symptoms}</p>
            </div>
          )}
          {pres ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Diagnosis</p>
                <p className="text-sm text-slate-300">{pres.diagnosis}</p>
              </div>
              {pres.medications?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Medications</p>
                  <div className="space-y-2">
                    {pres.medications.map((med, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-xs">
                        <div className="flex items-center space-x-2">
                          <Pill className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                          <span className="font-semibold text-slate-200">{med.name}</span>
                          <span className="text-slate-400">· {med.dosage} · {med.frequency}</span>
                        </div>
                        <p className="text-slate-500 mt-1 ml-5">Duration: {med.duration}{med.instructions ? ` · ${med.instructions}` : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pres.digitalSignature?.signedBy && (
                <div className="p-3 rounded-xl bg-emerald-900/10 border border-emerald-800/30">
                  <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">Digital Signature</p>
                  <div className="text-xs text-slate-400 space-y-1">
                    <p>Signed by: <span className="text-slate-300">Dr. {pres.digitalSignature.signedBy}</span></p>
                    <p>Time: <span className="text-slate-300">{new Date(pres.digitalSignature.signedAt).toLocaleString('en-IN')}</span></p>
                    <p className="font-mono text-[10px] text-slate-500 truncate">Hash: {pres.digitalSignature.signatureHash}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center space-x-2 text-xs">
                <StatusBadge status={pres.pharmacyStatus} />
                <span className="text-slate-400">Pharmacy status</span>
              </div>
            </div>
          ) : record.status === 'completed' ? (
            <p className="text-xs text-slate-500">No prescription was generated for this consultation.</p>
          ) : (
            <p className="text-xs text-slate-500">Prescription not available yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function MedicalRecords() {
  const { t } = useLanguage();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await api.get('/medical-records');
        setRecords(res.data.records || []);
      } catch (err) {
        setAlert({ type: 'error', message: 'Failed to load medical records.' });
      } finally { setLoading(false); }
    };
    fetch();
  }, []);

  const filtered = records.filter(r => {
    if (fromDate && new Date(r.date) < new Date(fromDate)) return false;
    if (toDate && new Date(r.date) > new Date(toDate)) return false;
    return true;
  });

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2">
              <FileText className="w-6 h-6 text-indigo-400" /><span>{t('medicalRecords')}</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">Your complete consultation and prescription history</p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="glass-input px-3 py-2 rounded-xl text-slate-100 focus:outline-none" placeholder="From" />
            <span className="text-slate-500">–</span>
            <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="glass-input px-3 py-2 rounded-xl text-slate-100 focus:outline-none" placeholder="To" />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Visits', value: records.length, color: 'text-indigo-400 bg-indigo-500/10' },
            { label: 'Prescriptions', value: records.filter(r => r.prescription).length, color: 'text-emerald-400 bg-emerald-500/10' },
            { label: 'Completed', value: records.filter(r => r.status === 'completed').length, color: 'text-teal-400 bg-teal-500/10' },
          ].map(({ label, value, color }) => (
            <div key={label} className="glass-card p-4 rounded-2xl border border-slate-800">
              <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
              <p className={`text-2xl font-bold mt-1 ${color.split(' ')[0]}`}>{value}</p>
            </div>
          ))}
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>{t('noMedicalRecords')}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(record => <RecordCard key={record._id} record={record} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}
