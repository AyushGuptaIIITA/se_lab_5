import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Stethoscope, LayoutDashboard, Calendar, Search, FileText, Users, BarChart3, Shield, LogOut, User, Globe, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';

function NavLink({ to, icon: Icon, label, onClick }) {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(to + '/');
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-semibold transition-all ${
        isActive
          ? 'bg-[#fff4f2] text-[#ff6f61] border-b-2 border-[#ff6f61]'
          : 'text-gray-700 hover:text-[#ff6f61] hover:bg-gray-50'
      }`}
    >
      <Icon className="w-4 h-4" />
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
    patient: 'bg-teal-50 text-[#10847e] border-teal-200',
    doctor: 'bg-orange-50 text-[#ff6f61] border-orange-200',
    admin: 'bg-purple-50 text-purple-700 border-purple-200',
  }[user.role] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-xs">
      {/* Tata 1mg Top Orange Accent Stripe */}
      <div className="h-1 bg-gradient-to-r from-[#ff6f61] via-[#fe8d00] to-[#10847e]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Brand */}
          <Link to="/" className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#ff6f61] to-[#fe8d00] flex items-center justify-center shadow-sm">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-[#ff6f61] leading-none">
                TATA <span className="text-[#10847e]">1mg</span>
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400 mt-0.5">
                Telehealth Clinic
              </span>
            </div>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center space-x-1">
            {links.map((link) => (
              <NavLink key={link.to} {...link} />
            ))}
          </nav>

          {/* Right section: Lang + Profile + Logout */}
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Toggle */}
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-[#10847e] transition-all"
              title="Change Language"
            >
              <Globe className="w-3.5 h-3.5 text-[#10847e]" />
              <span>{lang === 'en' ? 'हिन्दी' : 'English'}</span>
            </button>

            {/* User Chip */}
            <Link
              to="/profile"
              className="flex items-center space-x-2 pl-2 pr-3 py-1 rounded-full border border-gray-200 hover:border-[#ff6f61] transition-all bg-gray-50/70"
            >
              <div className="w-7 h-7 rounded-full bg-[#10847e] text-white flex items-center justify-center font-bold text-xs">
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-semibold text-gray-800 leading-none truncate max-w-[110px]">
                  {user.name}
                </span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1 rounded border inline-block mt-0.5 ${roleBadgeStyle}`}>
                  {user.role}
                </span>
              </div>
            </Link>

            {/* Logout Button */}
            <button
              onClick={logout}
              className="p-2 text-gray-500 hover:text-[#ff6f61] hover:bg-orange-50 rounded-lg transition-all"
              title={t('logout')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          {/* Mobile hamburger */}
          <div className="flex md:hidden items-center space-x-2">
            <button
              onClick={() => setLang(lang === 'en' ? 'hi' : 'en')}
              className="px-2 py-1 rounded text-xs font-semibold border border-gray-200 text-[#10847e]"
            >
              {lang === 'en' ? 'हि' : 'EN'}
            </button>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 text-gray-700 hover:text-[#ff6f61]"
            >
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {links.map((link) => (
            <NavLink
              key={link.to}
              {...link}
              onClick={() => setMobileOpen(false)}
            />
          ))}
          <div className="pt-3 border-t border-gray-200 flex items-center justify-between">
            <Link
              to="/profile"
              onClick={() => setMobileOpen(false)}
              className="flex items-center space-x-2 text-sm font-semibold text-gray-800"
            >
              <User className="w-4 h-4 text-[#ff6f61]" />
              <span>{user.name}</span>
            </Link>
            <button
              onClick={logout}
              className="flex items-center space-x-1 text-sm font-semibold text-[#ff6f61] hover:text-[#e2584a]"
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