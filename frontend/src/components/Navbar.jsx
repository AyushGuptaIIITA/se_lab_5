import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, LayoutDashboard, Calendar, Search, FileText, Users, BarChart3, Shield, LogOut, User, Globe, Menu, X, Sparkles, Video } from 'lucide-react';
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
  const { user, logout } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (!user) return null;

  const roleNavLinks = {
    patient: [
      { to: '/patient/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/patient/search-doctors', icon: Search, label: t('searchDoctors') },
      { to: '/patient/appointments', icon: Video, label: 'My Appointments' },
      { to: '/patient/medical-records', icon: FileText, label: t('medicalRecords') },
    ],
    doctor: [
      { to: '/doctor/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/doctor/appointments', icon: Video, label: 'My Consultations' },
      { to: '/doctor/schedule', icon: Calendar, label: t('schedule') },
      { to: '/doctor/prescription', icon: FileText, label: 'e-Prescription' },
    ],
    admin: [
      { to: '/admin/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/admin/users', icon: Users, label: t('users') },
      { to: '/admin/reports', icon: BarChart3, label: t('reports') },
      { to: '/admin/audit-logs', icon: Shield, label: t('auditLogs') },
    ],
  };

  const links = roleNavLinks[user.role] || [];

  const roleBadgeStyle = {
    patient: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    doctor: 'bg-blue-50 text-blue-700 border-blue-200',
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
  }[user.role] || 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* TeleMed Logo */}
          <Link to="/" className="flex items-center space-x-2.5 group">
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

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1.5 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60">
            {links.map((link) => (
              <NavLink key={link.to} {...link} />
            ))}
          </nav>

          {/* Right section */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600" />
              <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

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
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border inline-block mt-0.5 ${roleBadgeStyle}`}>
                  {user.role}
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

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="px-2.5 py-1 rounded-lg text-xs font-bold border border-slate-200 text-blue-600"
            >
              {lang === 'en' ? 'हि' : 'EN'}
            </button>
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