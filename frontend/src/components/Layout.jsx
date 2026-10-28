import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        {children}
      </main>
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-blue-600 text-sm tracking-tight">Tele<span className="text-slate-800">Med</span></span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600">Telemedicine Appointment & e-Prescription Platform</span>
          </div>
          <div>Compliant with SRS Requirements FR-1 through FR-13 · Secure & Confidential</div>
        </div>
      </footer>
    </div>
  );
}