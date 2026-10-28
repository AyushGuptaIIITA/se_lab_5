import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';

// Auth pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';

// Patient pages
import PatientDashboard from './pages/patient/Dashboard';
import SearchDoctors from './pages/patient/SearchDoctors';
import MedicalRecords from './pages/patient/MedicalRecords';
import PatientAppointments from './pages/patient/PatientAppointments';

// Doctor pages
import DoctorDashboard from './pages/doctor/Dashboard';
import ManageSchedule from './pages/doctor/ManageSchedule';
import ConsultationRoom from './pages/doctor/ConsultationRoom';
import PrescriptionForm from './pages/doctor/PrescriptionForm';
import DoctorAppointments from './pages/doctor/DoctorAppointments';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import UserManagement from './pages/admin/UserManagement';
import Reports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';

// Shared
import Profile from './pages/Profile';
import PrescriptionView from './pages/shared/PrescriptionView';

// ─── Loading Spinner ────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-slate-400 text-sm">Loading…</p>
      </div>
    </div>
  );
}

// ─── Role-based dashboard redirect ──────────────────────────────────────────
function DashboardRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
  if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  return <Navigate to="/patient/dashboard" replace />;
}

// ─── Protected Route ─────────────────────────────────────────────────────────
function ProtectedRoute({ children, roles }) {
  const { user, token, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (!token || !user) return <Navigate to="/" replace />;
  if (roles && !roles.includes(user.role)) {
    // Wrong role — redirect to their own dashboard
    if (user.role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/patient/dashboard" replace />;
  }
  return children;
}

// ─── Public Route (redirect authenticated users) ────────────────────────────
function PublicRoute({ children }) {
  const { token, user, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (token && user) return <DashboardRedirect />;
  return children;
}

// ─── App Shell ───────────────────────────────────────────────────────────────
function AppRoutes() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Routes>
        {/* ── Public ── */}
        <Route path="/" element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />

        {/* ── Role dispatch ── */}
        <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />

        {/* ── Patient ── */}
        <Route path="/patient/dashboard" element={<ProtectedRoute roles={['patient']}><PatientDashboard /></ProtectedRoute>} />
        <Route path="/patient/search-doctors" element={<ProtectedRoute roles={['patient']}><SearchDoctors /></ProtectedRoute>} />
        <Route path="/patient/appointments" element={<ProtectedRoute roles={['patient']}><PatientAppointments /></ProtectedRoute>} />
        <Route path="/patient/medical-records" element={<ProtectedRoute roles={['patient']}><MedicalRecords /></ProtectedRoute>} />
        <Route path="/patient/consultation/:appointmentId" element={<ProtectedRoute roles={['patient']}><ConsultationRoom /></ProtectedRoute>} />

        {/* ── Doctor ── */}
        <Route path="/doctor/dashboard" element={<ProtectedRoute roles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />
        <Route path="/doctor/appointments" element={<ProtectedRoute roles={['doctor']}><DoctorAppointments /></ProtectedRoute>} />
        <Route path="/doctor/schedule" element={<ProtectedRoute roles={['doctor']}><ManageSchedule /></ProtectedRoute>} />
        <Route path="/doctor/consultation/:appointmentId" element={<ProtectedRoute roles={['doctor']}><ConsultationRoom /></ProtectedRoute>} />
        <Route path="/doctor/prescription" element={<ProtectedRoute roles={['doctor']}><PrescriptionForm /></ProtectedRoute>} />
        <Route path="/doctor/prescription/:appointmentId" element={<ProtectedRoute roles={['doctor']}><PrescriptionForm /></ProtectedRoute>} />

        {/* ── Admin ── */}
        <Route path="/admin/dashboard" element={<ProtectedRoute roles={['admin']}><AdminDashboard /></ProtectedRoute>} />
        <Route path="/admin/users" element={<ProtectedRoute roles={['admin']}><UserManagement /></ProtectedRoute>} />
        <Route path="/admin/reports" element={<ProtectedRoute roles={['admin']}><Reports /></ProtectedRoute>} />
        <Route path="/admin/audit-logs" element={<ProtectedRoute roles={['admin']}><AuditLogs /></ProtectedRoute>} />

        {/* ── Shared ── */}
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/prescription/:prescriptionId" element={<ProtectedRoute roles={['patient', 'doctor', 'admin']}><PrescriptionView /></ProtectedRoute>} />
        <Route path="/prescription/appointment/:appointmentId" element={<ProtectedRoute roles={['patient', 'doctor', 'admin']}><PrescriptionView /></ProtectedRoute>} />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <AppRoutes />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  );
}
