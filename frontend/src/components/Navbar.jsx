import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Stethoscope, LayoutDashboard, Calendar, Search, FileText, Users, BarChart3, Shield, LogOut, User, Globe, Menu, X, Sparkles, Video, Pill } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function NavLink({ to, icon: Icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
        isActive
          ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
          : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50/70'
      }`}
    >
      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
      <span>{label}</span>
    </Link>
  );
}

export default function Navbar() {
  const { user, logout, isDelegatedAdminActive } = useAuth();
  const { t, lang, setLang, supportedLanguages = [] } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isDoctorDelegated = Boolean(user?.role === 'doctor' && isDelegatedAdminActive);
  const [delegatedTab, setDelegatedTab] = useState(location.pathname.startsWith('/admin') ? 'admin' : 'doctor');

  // Keep delegatedTab in sync with active path
  React.useEffect(() => {
    if (location.pathname.startsWith('/admin')) {
      setDelegatedTab('admin');
    } else if (location.pathname.startsWith('/doctor')) {
      setDelegatedTab('doctor');
    }
  }, [location.pathname]);

  const handlePortalSwitch = (target) => {
    setDelegatedTab(target);
    if (target === 'admin') {
      navigate('/admin/dashboard');
    } else {
      navigate('/doctor/dashboard');
    }
  };

  if (!user) return null;

  const roleNavLinks = {
    patient: [
      { to: '/patient/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/patient/search-doctors', icon: Search, label: t('searchDoctors') },
      { to: '/patient/appointments', icon: Video, label: t('My Appointments') },
      { to: '/patient/prescriptions', icon: Pill, label: t('My Prescriptions') },
      { to: '/patient/medical-records', icon: FileText, label: t('medicalRecords') },
    ],
    doctor: [
      { to: '/doctor/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/doctor/appointments', icon: Video, label: t('My Consultations') },
      { to: '/doctor/patients', icon: Users, label: t('Patient Directory') },
      { to: '/doctor/schedule', icon: Calendar, label: t('schedule') },
      { to: '/doctor/prescription', icon: FileText, label: t('e-Prescription') },
      { to: '/doctor/leaves', icon: Calendar, label: 'Leave Requests' },
    ],
    admin: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/admin/users', icon: Users, label: t('users') },
      { to: '/admin/reports', icon: BarChart3, label: t('reports') },
      { to: '/admin/audit-logs', icon: Shield, label: t('auditLogs') },
      { to: '/admin/leaves', icon: Calendar, label: 'Leave Approvals' },
      { to: '/admin/delegation', icon: Shield, label: 'Role Delegation' },
    ],
  };

  let links = roleNavLinks[user.role] || [];
  if (isDoctorDelegated) {
    links = delegatedTab === 'admin' ? roleNavLinks.admin : roleNavLinks.doctor;
  }

  const roleBadgeStyle = {
    patient: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    doctor: 'bg-blue-50 text-blue-700 border-blue-200',
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
  }[user.role] || 'bg-slate-100 text-slate-700 border-slate-200';

  const formatDueDate = (dateStr) => {
    if (!dateStr) return 'Active';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      {/* Delegated Admin Active Ribbon Banner */}
      {isDoctorDelegated && (
        <div className="bg-gradient-to-r from-purple-800 via-indigo-700 to-purple-800 text-white text-xs px-4 py-1.5 border-b border-purple-600/30">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Shield className="w-3.5 h-3.5 text-amber-300 animate-pulse flex-shrink-0" />
              <span className="font-bold">Administrative Responsibilities Delegated</span>
              <span className="text-purple-200 text-[11px] hidden sm:inline">
                — Full admin access unlocked (Users, Approvals, Reports, Leaves & Audit Logs)
              </span>
            </div>
            <div className="flex items-center space-x-2.5 text-[11px]">
              <span className="bg-purple-950/70 px-2 py-0.5 rounded-full border border-purple-400/30 font-medium">
                Valid Until: {formatDueDate(user.delegation?.endDate)}
              </span>
              <span className="text-purple-300 text-[10px] hidden md:inline">
                (Auto-closes on due date or upon admin cancellation)
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* TeleMed Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group flex-shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-200">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900 leading-none">
                Tele<span className="text-blue-600">Med</span>
              </span>
              <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase mt-0.5">
                Healthcare Portal
              </span>
            </div>
          </Link>

          {/* Desktop Nav with optional Portal Switcher for Delegated Doctor */}
          <div className="hidden md:flex items-center space-x-2">
            {isDoctorDelegated && (
              <div className="flex items-center space-x-1 p-1 bg-slate-100 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handlePortalSwitch('doctor')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    delegatedTab === 'doctor'
                      ? 'bg-white text-blue-700 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Clinical Portal
                </button>
                <button
                  type="button"
                  onClick={() => handlePortalSwitch('admin')}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    delegatedTab === 'admin'
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-purple-700 hover:text-purple-900 hover:bg-purple-50'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5" />
                  <span>Admin Portal</span>
                </button>
              </div>
            )}

            <nav className="flex items-center space-x-1.5 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60">
              {links.map((link) => (
                <NavLink key={link.to} {...link} />
              ))}
            </nav>
          </div>

          {/* Right section */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Multi-Language Dropdown */}
            <div className="relative">
              <button
                onClick={() => setLangDropdownOpen(!langDropdownOpen)}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                <span>{supportedLanguages.find(l => l.code === lang)?.name || 'हिन्दी'}</span>
              </button>

              {langDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-48 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in max-h-64 overflow-y-auto divide-y divide-slate-100">
                  {supportedLanguages.map(l => (
                    <button
                      key={l.code}
                      type="button"
                      onClick={() => {
                        setLang(l.code);
                        setLangDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors ${
                        lang === l.code ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <span>{l.name}</span>
                      <span className="text-[10px] text-slate-400 font-normal">{l.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* User chip */}
            <Link
              to="/profile"
              className="flex items-center space-x-2.5 pl-2 pr-3 py-1.5 rounded-full border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all"
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-800 leading-none truncate max-w-[120px]">{user.name}</p>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border inline-block mt-0.5 ${
                  isDoctorDelegated
                    ? 'bg-purple-50 text-purple-700 border-purple-300 font-extrabold'
                    : roleBadgeStyle
                }`}>
                  {isDoctorDelegated ? 'Doctor · Delegated Admin' : user.role}
                </span>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger & language */}
          <div className="flex md:hidden items-center space-x-2">
            <select
              value={lang}
              onChange={e => setLang(e.target.value)}
              className="px-2 py-1 rounded-lg text-xs font-bold border border-slate-200 text-blue-600 bg-white"
            >
              {supportedLanguages.map(l => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-slate-700 hover:text-blue-600"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-4 space-y-1.5 animate-slide-up">
          {isDoctorDelegated && (
            <div className="flex items-center justify-center space-x-2 p-1 bg-slate-100 rounded-xl mb-3">
              <button
                type="button"
                onClick={() => { handlePortalSwitch('doctor'); setMobileOpen(false); }}
                className={`px-3 py-1 rounded-lg text-xs font-bold ${delegatedTab === 'doctor' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600'}`}
              >
                Clinical Portal
              </button>
              <button
                type="button"
                onClick={() => { handlePortalSwitch('admin'); setMobileOpen(false); }}
                className={`flex items-center space-x-1 px-3 py-1 rounded-lg text-xs font-bold ${delegatedTab === 'admin' ? 'bg-purple-600 text-white shadow-2xs' : 'text-purple-700'}`}
              >
                <Shield className="w-3 h-3" /><span>Admin Portal</span>
              </button>
            </div>
          )}
          {links.map((link) => (
            <NavLink
              key={link.to}
              {...link}
              onClick={() => setMobileOpen(false)}
            />
          ))}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Link
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center space-x-2 text-xs font-bold text-slate-800"
            >
              <User className="w-4 h-4 text-blue-600" />
              <span>{user.name}</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center space-x-1 text-xs font-bold text-rose-600 hover:text-rose-700"
            >
              <LogOut className="w-4 h-4" />
              <span>{t('logout')}</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}