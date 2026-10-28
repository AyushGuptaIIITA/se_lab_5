import React, { useEffect, useState } from 'react';
import { FileText, Pill, Calendar, Loader2, ChevronDown, ChevronUp, CheckCircle, ShieldCheck } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import StatusBadge from '../../components/StatusBadge';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

function RecordCard({ record }) {
  const [open, setOpen] = useState(false);
  const pres = record.prescription;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
      <div
        className="p-5 flex items-start justify-between cursor-pointer hover:bg-gray-50/70 transition-colors"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 font-bold border border-blue-100">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap gap-1">
              <p className="font-bold text-gray-900 text-sm">Dr. {record.doctor?.name || 'Specialist'}</p>
              <StatusBadge status={record.status} />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {new Date(record.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · {record.timeSlot?.start}
            </p>
            <p className="text-xs text-blue-700 font-semibold mt-0.5 capitalize">{record.type} · {record.doctor?.specialization}</p>
            {pres && (
              <span className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-700 mt-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5" />
                <span>e-Prescription: {pres.diagnosis}</span>
              </span>
            )}
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-1 p-1">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4 bg-gray-50/50">
          {record.symptoms && (
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Reported Symptoms</p>
              <p className="text-xs text-gray-800 bg-white p-2.5 rounded-lg border border-gray-200">{record.symptoms}</p>
            </div>
          )}
          {pres ? (
            <div className="space-y-3">
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Clinical Diagnosis</p>
                <p className="text-xs font-semibold text-gray-900 bg-white p-2.5 rounded-lg border border-gray-200">{pres.diagnosis}</p>
              </div>
              {pres.medications?.length > 0 && (
                <div>
                  <p className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Prescribed Medicines</p>
                  <div className="space-y-2">
                    {pres.medications.map((med, i) => (
                      <div key={i} className="p-3 rounded-lg bg-white border border-gray-200 text-xs flex items-start space-x-2.5">
                        <Pill className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold text-gray-900">{med.name}</span>
                          <span className="text-gray-500"> · {med.dosage} · {med.frequency}</span>
                          <p className="text-gray-500 mt-0.5">Duration: <strong>{med.duration}</strong>{med.instructions ? ` · ${med.instructions}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {pres.digitalSignature?.signedBy && (
                <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-gray-700">
                  <p className="font-bold text-blue-700 uppercase tracking-wider mb-1 flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Verified SHA-256 Digital Signature</span>
                  </p>
                  <p>Signed by: <strong>Dr. {pres.digitalSignature.signedBy}</strong> on {new Date(pres.digitalSignature.signedAt).toLocaleDateString('en-IN')}</p>
                  <p className="font-mono text-[10px] text-gray-500 truncate mt-0.5">Hash: {pres.digitalSignature.signatureHash}</p>
                </div>
              )}
              <div className="flex items-center space-x-2 text-xs pt-1">
                <span className="text-gray-500">TeleMed Pharmacy Status:</span>
                <StatusBadge status={pres.pharmacyStatus} />
              </div>
            </div>
          ) : record.status === 'completed' ? (
            <p className="text-xs text-gray-500">No prescription was required for this session.</p>
          ) : (
            <p className="text-xs text-gray-500">Consultation is currently in progress / awaiting completion.</p>
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

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
              <span className="text-blue-600">My Health Records & e-Prescriptions</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Permanent immutable log of clinical consultations and verified prescriptions</p>
          </div>
          <div className="flex items-center space-x-2 text-xs">
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-lg text-xs bg-white"
            />
            <span className="text-gray-400">–</span>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="glass-input px-3 py-1.5 rounded-lg text-xs bg-white"
            />
          </div>
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Consultations</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{records.length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-teal-100 shadow-xs">
            <p className="text-xs font-bold text-[#10847e] uppercase tracking-wider">Signed Prescriptions</p>
            <p className="text-2xl font-black text-[#10847e] mt-1">{records.filter(r => r.prescription).length}</p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-orange-100 shadow-xs">
            <p className="text-xs font-bold text-[#ff6f61] uppercase tracking-wider">Completed Sessions</p>
            <p className="text-2xl font-black text-[#ff6f61] mt-1">{records.filter(r => r.status === 'completed').length}</p>
          </div>
        </div>

        {loading ? (
          <div className="py-16 flex items-center justify-center bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff6f61]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-white rounded-xl border border-gray-200 shadow-xs">
            <FileText className="w-10 h-10 mx-auto mb-2 text-gray-300" />
            <p className="font-semibold text-gray-700">{t('noMedicalRecords')}</p>
            <p className="text-xs text-gray-400 mt-1">Book your first doctor consultation to start your medical record history.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(record => <RecordCard key={record._id} record={record} />)}
          </div>
        )}
      </div>
    </Layout>
  );
}