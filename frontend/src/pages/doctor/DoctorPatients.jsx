import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, User, Search, RefreshCw, Loader2, Calendar, FileText, 
  Phone, MapPin, Heart, ChevronDown, ChevronUp, Clock, AlertCircle, 
  Stethoscope, ShieldCheck, Plus, ExternalLink
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

export default function DoctorPatients() {
  const { t } = useLanguage();
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedPatientId, setExpandedPatientId] = useState(null);
  const [alert, setAlert] = useState(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await api.get('/doctors/my/patients');
      setPatients(res.data.patients || []);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load patient directory.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filtered = patients.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    const p = item.patient || {};
    const name = p.name?.toLowerCase() || '';
    const phone = p.phone?.toLowerCase() || '';
    const village = p.address?.village?.toLowerCase() || '';
    const district = p.address?.district?.toLowerCase() || '';
    const blood = p.bloodGroup?.toLowerCase() || '';
    return name.includes(q) || phone.includes(q) || village.includes(q) || district.includes(q) || blood.includes(q);
  });

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>Patient Directory & Medical Records</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Review patient profiles, complete clinical consultation histories, and past issued e-prescriptions
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={fetchPatients}
              disabled={loading}
              title="Refresh"
              className="p-2.5 rounded-xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <Link
              to="/doctor/prescription"
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New e-Prescription</span>
            </Link>
          </div>
        </div>

        {/* Search Bar */}
        <div className="glass-panel p-4 rounded-2xl bg-white shadow-card">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search patients by name, phone number, village/district, or blood group..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-xs"
            />
          </div>
        </div>

        {/* Patients List */}
        {loading ? (
          <div className="py-20 flex items-center justify-center glass-panel bg-white rounded-2xl">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500 glass-panel bg-white rounded-2xl shadow-card">
            <Users className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-bold text-slate-700">No patient records found</p>
            <p className="text-xs text-slate-400 mt-1">Patients who book consultations with you will appear here with full history</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(item => {
              const p = item.patient || {};
              const isExpanded = expandedPatientId === p._id;

              return (
                <div
                  key={p._id}
                  className="glass-card rounded-3xl border border-slate-200 bg-white shadow-xs overflow-hidden transition-all duration-200"
                >
                  {/* Patient Summary Header */}
                  <div
                    onClick={() => setExpandedPatientId(isExpanded ? null : p._id)}
                    className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/60 transition-colors"
                  >
                    <div className="flex items-start space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center font-black text-lg flex-shrink-0 shadow-xs">
                        {p.name?.charAt(0) || 'P'}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{p.name || 'Patient'}</h3>
                          {p.bloodGroup && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 text-rose-700 border border-rose-200">
                              {p.bloodGroup}
                            </span>
                          )}
                          {p.gender && (
                            <span className="capitalize text-xs font-semibold text-slate-500">
                              · {p.gender}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mt-1">
                          {p.phone && (
                            <span className="flex items-center space-x-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{p.phone}</span>
                            </span>
                          )}
                          {p.address?.district && (
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span>{p.address.village ? `${p.address.village}, ` : ''}{p.address.district}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end space-x-4">
                      <div className="text-left sm:text-right">
                        <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          {item.totalAppointments} Consultation{item.totalAppointments === 1 ? '' : 's'}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {item.prescriptions?.length || 0} Prescriptions Issued
                        </p>
                      </div>

                      <button className="text-slate-400 hover:text-slate-600 p-1">
                        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Patient Detailed History */}
                  {isExpanded && (
                    <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-6 animate-fadeIn">
                      {/* Emergency Contact & Demographics */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-white border border-slate-200 text-xs">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Demographics</span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {p.gender ? <span className="capitalize">{p.gender}</span> : 'Not specified'}
                            {p.dateOfBirth ? ` · DOB: ${new Date(p.dateOfBirth).toLocaleDateString('en-IN')}` : ''}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Address</span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {p.address?.village ? `${p.address.village}, ` : ''}
                            {p.address?.district ? `${p.address.district}, ` : ''}
                            {p.address?.state || 'India'}
                          </p>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Emergency Contact</span>
                          <p className="font-semibold text-slate-800 mt-0.5">
                            {p.emergencyContact?.name ? `${p.emergencyContact.name} (${p.emergencyContact.relation || 'Contact'})` : 'None registered'}
                            {p.emergencyContact?.phone ? ` · ${p.emergencyContact.phone}` : ''}
                          </p>
                        </div>
                      </div>

                      {/* Chronological Consultations List */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                            <span>Consultation History ({item.appointments.length})</span>
                          </h4>
                        </div>

                        <div className="space-y-2">
                          {item.appointments.map(apt => (
                            <div key={apt._id} className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                              <div className="space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="font-bold text-slate-900">
                                    {new Date(apt.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span className="text-slate-400">· {apt.timeSlot?.start} - {apt.timeSlot?.end}</span>
                                  <StatusBadge status={apt.status} />
                                </div>
                                {apt.symptoms && (
                                  <p className="text-slate-600">
                                    <strong>Symptoms:</strong> {apt.symptoms}
                                  </p>
                                )}
                              </div>

                              <div className="flex items-center space-x-2 flex-shrink-0">
                                {apt.prescription && (
                                  <Link
                                    to={`/prescription/${apt.prescription._id || apt.prescription}`}
                                    className="flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                                  >
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>View e-Rx</span>
                                  </Link>
                                )}
                                {['confirmed', 'in-progress'].includes(apt.status) && (
                                  <Link
                                    to={`/doctor/consultation/${apt._id}`}
                                    className="px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs"
                                  >
                                    Enter Room
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Issued Prescriptions for this Patient */}
                      {item.prescriptions?.length > 0 && (
                        <div className="space-y-3 pt-2 border-t border-slate-200/80">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                            <FileText className="w-3.5 h-3.5 text-blue-600" />
                            <span>Issued e-Prescriptions ({item.prescriptions.length})</span>
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {item.prescriptions.map(pres => (
                              <div key={pres._id} className="p-3.5 rounded-2xl bg-white border border-slate-200 text-xs space-y-2 shadow-xs">
                                <div className="flex items-start justify-between">
                                  <div>
                                    <p className="font-bold text-slate-900">{pres.diagnosis}</p>
                                    <p className="text-[11px] text-slate-400">
                                      {new Date(pres.createdAt).toLocaleDateString('en-IN')}
                                    </p>
                                  </div>
                                  <StatusBadge status={pres.pharmacyStatus} />
                                </div>
                                <div className="text-[11px] text-slate-600 space-y-0.5">
                                  <p><strong>Medicines:</strong> {pres.medications?.map(m => m.name).join(', ') || '—'}</p>
                                </div>
                                <div className="pt-1 flex items-center justify-between">
                                  <span className="text-[10px] text-blue-600 font-mono truncate max-w-[120px]">
                                    {pres.digitalSignature?.certificateId || 'CERT-VALID'}
                                  </span>
                                  <Link
                                    to={`/prescription/${pres._id}`}
                                    className="text-xs font-bold text-blue-600 hover:underline flex items-center space-x-1"
                                  >
                                    <span>Inspect Rx</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
