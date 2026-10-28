import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, LayoutDashboard, Calendar, Search, FileText, Users, BarChart3, BookOpen, Shield, LogOut, User, Globe, Menu, X, ClipboardList } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function NavLink({ to, icon: Icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
        isActive
          ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      }`}
    >
      <Icon className="w-4 h-4" />
      <span className="hidden lg:inline">{label}</span>
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
      { to: '/patient/medical-records', icon: FileText, label: t('medicalRecords') },
    ],
    doctor: [
      { to: '/doctor/dashboard', icon: LayoutDashboard, label: t('dashboard') },
      { to: '/doctor/schedule', icon: Calendar, label: t('schedule') },
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
    patient: 'bg-blue-950 text-blue-300 border-blue-800/50',
    doctor: 'bg-emerald-950 text-emerald-300 border-emerald-800/50',
    admin: 'bg-purple-950 text-purple-300 border-purple-800/50',
  }[user.role] || 'bg-slate-800 text-slate-300 border-slate-700';

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group flex-shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="hidden sm:block">
              <span className="text-base font-bold text-white">{t('appName')}</span>
              <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium text-slate-400 bg-slate-800 rounded border border-slate-700">Lab 5</span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            {links.map(l => (
              <NavLink key={l.to} {...l} />
            ))}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center space-x-2">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition-all"
              title="Toggle Language"
            >
              <Globe className="w-4 h-4" />
            </button>
            <span className="hidden sm:block text-[10px] font-bold text-slate-400">{lang.toUpperCase()}</span>

            {/* Profile Link */}
            <Link to="/profile" className="flex items-center space-x-2 px-2 py-1.5 rounded-xl hover:bg-slate-800/60 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center text-xs font-bold text-white border border-indigo-500/30">
                {user.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-200 max-w-[100px] truncate">{user.name}</p>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${roleBadgeStyle}`}>
                  {t(user.role)}
                </span>
              </div>
            </Link>

            {/* Logout */}
            <button
              onClick={logout}
              className="flex items-center space-x-1.5 text-xs font-medium text-rose-400 hover:text-white px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-600 transition-all"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('logout')}</span>
            </button>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-xl bg-slate-800/60 text-slate-400 hover:text-white border border-slate-700"
            >
              {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 space-y-1 border-t border-slate-800 pt-3">
            {links.map(l => (
              <NavLink key={l.to} {...l} onClick={() => setMobileOpen(false)} />
            ))}
          </div>
        )}
      </div>
    </header>
  );
}
