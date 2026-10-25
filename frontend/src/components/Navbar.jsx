import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, User, LogOut, LayoutDashboard, UserCheck } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role') || 'user';
  const storedUser = localStorage.getItem('user');
  const user = storedUser ? JSON.parse(storedUser) : null;

  const handleLogout = () => {
    localStorage.clear();
    navigate('/');
  };

  if (!token) return null;

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <Link to="/dashboard" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-indigo-300 bg-clip-text text-transparent">
                SE Portal
              </span>
              <span className="hidden sm:inline-block ml-2 px-2 py-0.5 text-xs font-medium text-slate-400 bg-slate-800 rounded-full border border-slate-700">
                Lab 5
              </span>
            </div>
          </Link>

          {/* User Status & Actions */}
          <div className="flex items-center space-x-3 sm:space-x-4">
            <Link
              to="/dashboard"
              className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4 text-indigo-400" />
              <span className="hidden md:inline">Dashboard</span>
            </Link>

            <Link
              to="/edit-profile"
              className="flex items-center space-x-2 text-sm text-slate-300 hover:text-white px-3 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors"
            >
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="hidden md:inline">Profile</span>
            </Link>

            {/* Role Badge */}
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 text-xs font-semibold">
                {user?.username ? user.username.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden lg:block text-left text-xs">
                <p className="font-semibold text-slate-200 truncate max-w-[120px]">
                  {user?.username || 'User'}
                </p>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded text-[10px] uppercase font-bold tracking-wider ${
                    role === 'admin'
                      ? 'bg-purple-950 text-purple-300 border border-purple-800/50'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800/50'
                  }`}
                >
                  {role}
                </span>
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={handleLogout}
              title="Sign out"
              className="flex items-center space-x-1.5 text-xs font-medium text-rose-400 hover:text-white px-3 py-2 rounded-lg bg-rose-500/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-600 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
