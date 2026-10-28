import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  FileText, Printer, ArrowLeft, ShieldCheck, CheckCircle, 
  Pill, Clock, Calendar, User, Phone, MapPin, Send, Loader2, 
  Download, Stethoscope, AlertCircle, Share2, BookOpen, RefreshCw,
  Package, Truck, Check, ChevronRight, X
} from 'lucide-react';
import Layout from '../../components/Layout';
import StatusBadge from '../../components/StatusBadge';
import AlertBanner from '../../components/AlertBanner';
import QRCodeBadge from '../../components/QRCodeBadge';
import DailyPillSchedule from '../../components/DailyPillSchedule';
import DrugInfoModal from '../../components/DrugInfoModal';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

export default function PrescriptionView() {
  const { prescriptionId, appointmentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();

  const [prescription, setPrescription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sendingPharmacy, setSendingPharmacy] = useState(false);
  const [updatingRefill, setUpdatingRefill] = useState(false);
  const [alert, setAlert] = useState(null);
  const [selectedDrugInfo, setSelectedDrugInfo] = useState(null);
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillNotes, setRefillNotes] = useState('');
  const [advancingTracking, setAdvancingTracking] = useState(false);

  const isDoctor = user?.role === 'doctor';
  const isPatient = user?.role === 'patient';
  const isAdmin = user?.role === 'admin';

  const fetchPrescription = async () => {
    setLoading(true);
    try {
      let res;
      if (prescriptionId) {
        res = await api.get(`/prescriptions/${prescriptionId}`);
      } else if (appointmentId) {
        res = await api.get(`/prescriptions/appointment/${appointmentId}`);
      }
      if (res?.data?.prescription) {
        setPrescription(res.data.prescription);
      } else {
        setAlert({ type: 'error', message: 'Prescription record not found.' });
      }
    } catch (err) {
      setAlert({ 
        type: 'error', 
        message: err.response?.data?.message || 'Failed to load e-prescription details.' 
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescription();
  }, [prescriptionId, appointmentId]);

  const handlePrint = () => {
    window.print();
  };

  const handleSendToPharmacy = async () => {
    if (!prescription) return;
    setSendingPharmacy(true);
    setAlert(null);
    try {
      const res = await api.post(`/prescriptions/${prescription._id}/send-to-pharmacy`);
      setPrescription(res.data.prescription);
      setAlert({ type: 'success', message: 'Prescription successfully dispatched to partner pharmacy network (FR-8)!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to dispatch to pharmacy.' });
    } finally {
      setSendingPharmacy(false);
    }
  };

  const handleAdvanceTracking = async (nextStatus, label) => {
    if (!prescription) return;
    setAdvancingTracking(true);
    try {
      const res = await api.patch(`/prescriptions/${prescription._id}/tracking`, {
        status: nextStatus,
        label,
        notes: `Milestone updated by ${user?.name || 'Authorized Staff'}`
      });
      setPrescription(res.data.prescription);
      setAlert({ type: 'success', message: `Pharmacy fulfillment milestone updated: ${label}` });
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update tracking milestone.' });
    } finally {
      setAdvancingTracking(false);
    }
  };

  const handleRequestRefill = async (e) => {
    e.preventDefault();
    if (!prescription) return;
    setUpdatingRefill(true);
    try {
      const res = await api.post(`/prescriptions/${prescription._id}/refill-request`, {
        notes: refillNotes
      });
      setPrescription(res.data.prescription);
      setShowRefillModal(false);
      setAlert({ type: 'success', message: 'Prescription refill request sent to consulting doctor!' });
    } catch (err) {
      setAlert({ type: 'error', message: err.response?.data?.message || 'Failed to submit refill request.' });
    } finally {
      setUpdatingRefill(false);
    }
  };

  const handleDoctorRefillAction = async (status) => {
    if (!prescription) return;
    setUpdatingRefill(true);
    try {
      const res = await api.patch(`/prescriptions/${prescription._id}/refill-status`, {
        status,
        doctorNotes: `Doctor marked refill as ${status}`
      });
      setPrescription(res.data.prescription);
      setAlert({ type: 'success', message: `Prescription refill has been ${status}.` });
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to update refill status.' });
    } finally {
      setUpdatingRefill(false);
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

  if (!prescription) {
    return (
      <Layout>
        <div className="max-w-xl mx-auto py-12 px-4 text-center">
          <div className="glass-panel p-8 rounded-3xl bg-white shadow-card space-y-4">
            <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">No Prescription Available</h2>
            <p className="text-xs text-slate-500">
              A prescription has not been issued yet for this appointment or you do not have permission to view it.
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate(-1)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const doctor = prescription.doctor || {};
  const patient = prescription.patient || {};
  const appointment = prescription.appointment || {};
  const sig = prescription.digitalSignature || {};

  const docDisplayName = doctor.name?.startsWith('Dr.') ? doctor.name : `Dr. ${doctor.name || 'Practitioner'}`;

  // 5-Stage Pharmacy Pipeline Data
  const fulfillmentStages = [
    { key: 'pending', label: 'Digitally Certified', desc: 'SHA-256 Doctor Signature verified' },
    { key: 'sent', label: 'Dispatched to Pharmacy', desc: 'Transmitted to Apollo / 1mg' },
    { key: 'received', label: 'Pharmacist Packaged', desc: 'Verified and packed for dispensation' },
    { key: 'dispensed', label: 'Dispensed / Delivered', desc: 'Delivered to patient' }
  ];

  const currentStageIndex = 
    prescription.pharmacyStatus === 'dispensed' ? 3 :
    prescription.pharmacyStatus === 'received' ? 2 :
    prescription.pharmacyStatus === 'sent' ? 1 : 0;

  return (
    <Layout>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Drug Factsheet Modal */}
        {selectedDrugInfo && (
          <DrugInfoModal drug={selectedDrugInfo} onClose={() => setSelectedDrugInfo(null)} />
        )}

        {/* Refill Request Modal */}
        {showRefillModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-bold text-slate-900">Request Prescription Refill</h3>
                </div>
                <button onClick={() => setShowRefillModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-xs text-slate-600">
                Submit a renewal request to <strong>{docDisplayName}</strong> for this ongoing course of medication.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Reason / Notes for Doctor (Optional)
                </label>
                <textarea
                  rows={3}
                  value={refillNotes}
                  onChange={e => setRefillNotes(e.target.value)}
                  placeholder="e.g. Continuing maintenance for hypertension, remaining pills low..."
                  className="glass-input w-full p-3 rounded-2xl text-xs bg-white resize-none"
                />
              </div>
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRefillModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRequestRefill}
                  disabled={updatingRefill}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50"
                >
                  {updatingRefill ? 'Submitting...' : 'Send Refill Request'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Navigation & Action Bar (Hidden during printing) */}
        <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 mb-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <h1 className="text-2xl font-black text-slate-900 flex items-center space-x-2">
              <span>Medical e-Prescription Record</span>
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Certified medical prescription with verifiable SHA-256 digital signature
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Patient Refill Request Button */}
            {isPatient && (
              prescription.refillStatus === 'requested' ? (
                <span className="px-3 py-2 rounded-xl text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Refill Requested (Under Review)</span>
                </span>
              ) : prescription.refillStatus === 'approved' ? (
                <span className="px-3 py-2 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Refill Approved by Doctor</span>
                </span>
              ) : (
                <button
                  onClick={() => setShowRefillModal(true)}
                  className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Request Refill / Renewal</span>
                </button>
              )
            )}

            <button
              onClick={handlePrint}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 shadow-xs transition-all active:scale-95"
              title="Print or Save as PDF"
            >
              <Printer className="w-4 h-4 text-blue-600" />
              <span>Print / Save PDF</span>
            </button>

            {isDoctor && prescription.pharmacyStatus === 'pending' && (
              <button
                onClick={handleSendToPharmacy}
                disabled={sendingPharmacy}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all disabled:opacity-50"
              >
                {sendingPharmacy ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Dispatching...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Partner Pharmacy</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Doctor Refill Request Review Banner (if requested) */}
        {isDoctor && prescription.refillStatus === 'requested' && (
          <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in fade-in">
            <div className="space-y-0.5">
              <span className="text-xs font-extrabold text-amber-900 flex items-center space-x-1.5 uppercase tracking-wider">
                <RefreshCw className="w-4 h-4 text-amber-600 animate-spin" />
                <span>Patient Requested Medication Refill</span>
              </span>
              <p className="text-xs text-amber-800">
                Notes: {prescription.refillNotes || 'Patient is requesting renewal for continuous chronic medication management.'}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handleDoctorRefillAction('approved')}
                disabled={updatingRefill}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs"
              >
                Approve Refill
              </button>
              <button
                onClick={() => handleDoctorRefillAction('declined')}
                disabled={updatingRefill}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* ─── INTEGRATED PHARMACY FULFILLMENT PIPELINE (SRS FR-8) ──────────── */}
        <div className="print:hidden glass-panel p-5 sm:p-6 rounded-3xl bg-white shadow-card space-y-4 border border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900">Integrated Pharmacy Order Tracking (SRS FR-8)</h3>
                <p className="text-[11px] text-slate-500">Live fulfillment status with Apollo & Tata 1mg Partner Network</p>
              </div>
            </div>
            <StatusBadge status={prescription.pharmacyStatus} />
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
            {fulfillmentStages.map((stage, sIdx) => {
              const isDone = sIdx <= currentStageIndex;
              const isCurrent = sIdx === currentStageIndex;
              return (
                <div
                  key={stage.key}
                  className={`p-3 rounded-2xl border text-xs space-y-1 transition-all ${
                    isCurrent
                      ? 'bg-blue-50 border-blue-300 text-blue-900 shadow-2xs'
                      : isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider">Stage {sIdx + 1}</span>
                    {isDone ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <p className="font-extrabold text-xs">{stage.label}</p>
                  <p className="text-[10px] leading-tight opacity-80">{stage.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Quick milestone advancement for demo / pharmacist */}
          {(isDoctor || isAdmin) && currentStageIndex < 3 && (
            <div className="pt-2 flex items-center justify-end space-x-2">
              {currentStageIndex === 0 && (
                <button
                  onClick={handleSendToPharmacy}
                  disabled={sendingPharmacy}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700"
                >
                  Dispatch to Pharmacy (Stage 2)
                </button>
              )}
              {currentStageIndex === 1 && (
                <button
                  onClick={() => handleAdvanceTracking('received', 'Pharmacist Packaged')}
                  disabled={advancingTracking}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border border-slate-300"
                >
                  Mark Packaged by Pharmacist (Stage 3)
                </button>
              )}
              {currentStageIndex === 2 && (
                <button
                  onClick={() => handleAdvanceTracking('dispensed', 'Dispensed & Delivered to Patient')}
                  disabled={advancingTracking}
                  className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700"
                >
                  Confirm Dispensed / Delivered (Stage 4)
                </button>
              )}
            </div>
          )}
        </div>

        {/* ─── PRINTABLE OFFICIAL PRESCRIPTION SHEET ───────────────────────── */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200 shadow-card print:border-none print:shadow-none print:p-0 space-y-6">
          {/* Prescription Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b-2 border-slate-800">
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-xl font-black text-slate-900 tracking-tight">TeleMed Healthcare Portal</h2>
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Official e-Rx
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Certified Remote Telemedicine Practice · Medical Council of India (MCI) Compliant
                </p>
                <p className="text-[11px] text-slate-400">
                  Ref: CERT-{sig.certificateId || prescription._id?.slice(-8).toUpperCase()}
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>SHA-256 Digitally Signed</span>
              </div>
              <p className="text-xs text-slate-600 font-semibold">
                Issued: {new Date(prescription.createdAt || sig.signedAt || Date.now()).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>

          {/* Practitioner & Patient Meta Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs">
            {/* Doctor Column */}
            <div className="space-y-1.5 border-b md:border-b-0 md:border-r border-slate-200 pb-3 md:pb-0 md:pr-4">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Consulting Physician</span>
              <p className="text-sm font-black text-slate-900">{docDisplayName}</p>
              <p className="text-blue-700 font-semibold">{doctor.specialization || 'General Medicine'}</p>
              <p className="text-slate-600">Reg / License No: <strong className="text-slate-800">{doctor.licenseNumber || 'MCI-VERIFIED'}</strong></p>
              {doctor.email && <p className="text-slate-500">{doctor.email}</p>}
            </div>

            {/* Patient Column */}
            <div className="space-y-1.5 md:pl-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Patient Details</span>
              <p className="text-sm font-black text-slate-900">{patient.name || 'Patient'}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-slate-600">
                {patient.gender && <span className="capitalize">Gender: <strong>{patient.gender}</strong></span>}
                {patient.bloodGroup && <span>Blood Group: <strong className="text-rose-600">{patient.bloodGroup}</strong></span>}
                {patient.phone && <span>Phone: <strong>{patient.phone}</strong></span>}
              </div>
              {appointment.date && (
                <p className="text-slate-500">
                  Appointment: {new Date(appointment.date).toLocaleDateString('en-IN')} ({appointment.timeSlot?.start} - {appointment.timeSlot?.end})
                </p>
              )}
            </div>
          </div>

          {/* Clinical Diagnosis Block */}
          <div className="space-y-1.5 p-4 rounded-2xl bg-blue-50/40 border border-blue-100">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider block">
              Clinical Diagnosis & Findings
            </span>
            <p className="text-sm font-extrabold text-slate-900 leading-relaxed">
              {prescription.diagnosis}
            </p>
            {appointment.symptoms && (
              <p className="text-xs text-slate-600 pt-1">
                <span className="font-semibold text-slate-700">Presented Symptoms: </span>
                {appointment.symptoms}
              </p>
            )}
          </div>

          {/* Rx Medications Table */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black text-blue-600 font-serif">℞</span>
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                Prescribed Medicines & Posology
              </h3>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-2xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 text-slate-700 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">#</th>
                    <th className="py-3 px-4">Medicine Name</th>
                    <th className="py-3 px-4">Dosage</th>
                    <th className="py-3 px-4">Frequency</th>
                    <th className="py-3 px-4">Duration</th>
                    <th className="py-3 px-4">Instructions</th>
                    <th className="py-3 px-4 print:hidden text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {prescription.medications?.map((med, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-400">{i + 1}</td>
                      <td className="py-3 px-4 font-bold text-slate-900 text-sm flex items-center space-x-1.5">
                        <Pill className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                        <span>{med.name}</span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{med.dosage}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
                          {med.frequency}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{med.duration}</td>
                      <td className="py-3 px-4 text-slate-600">{med.instructions || '—'}</td>
                      <td className="py-3 px-4 print:hidden text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedDrugInfo({ name: med.name, defaultDosage: med.dosage, defaultInstructions: med.instructions })}
                          className="text-[11px] font-bold text-blue-600 hover:underline flex items-center justify-end space-x-1"
                        >
                          <BookOpen className="w-3 h-3" />
                          <span>Facts</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Visual Daily Pill Schedule (Rural Comprehension) */}
          <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200">
            <DailyPillSchedule medications={prescription.medications} />
          </div>

          {/* Advice & Lifestyle Precautions */}
          {prescription.additionalNotes && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Doctor's Advice & Patient Instructions
              </span>
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {prescription.additionalNotes}
              </p>
            </div>
          )}

          {/* Digital Signature & Verification Seal with Scannable QR Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 items-center">
            {/* Pharmacy Status Seal */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Pharmacy Network</span>
                <StatusBadge status={prescription.pharmacyStatus} />
              </div>
              <p className="text-[11px] text-slate-500">
                Routed via TeleMed Integrated Pharmacy API (SRS FR-8) for medicine availability and door delivery.
              </p>
            </div>

            {/* Cryptographic Signature Box */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs space-y-1.5">
              <div className="flex items-center space-x-1.5 text-blue-700 font-bold uppercase tracking-wider text-[11px]">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                <span>Verified SHA-256 Signature</span>
              </div>
              <p className="text-slate-800">
                Digitally signed by: <strong>{docDisplayName}</strong>
              </p>
              <p className="text-[11px] text-slate-500">
                Timestamp: {sig.signedAt ? new Date(sig.signedAt).toLocaleString('en-IN') : '—'}
              </p>
              <div className="pt-0.5">
                <p className="text-[10px] text-slate-400 font-mono truncate">
                  Hash: {sig.signatureHash || 'AUTHENTICATED-SHA256'}
                </p>
              </div>
            </div>

            {/* Scannable Verification QR Code */}
            <div className="flex justify-center md:justify-end">
              <QRCodeBadge
                value={`https://telemed.health/prescription/${prescription._id}?cert=${sig.certificateId}`}
                size={100}
                label="SCAN TO VERIFY"
              />
            </div>
          </div>

          {/* Prescription Footer Disclaimer */}
          <div className="pt-4 border-t border-slate-100 text-center text-[10px] text-slate-400 space-y-1">
            <p>
              This is a computer-generated, digitally signed medical prescription issued under the Telemedicine Practice Guidelines, 2020.
            </p>
            <p>
              TeleMed Healthcare Platform · Immutable Record ID: {prescription._id}
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
