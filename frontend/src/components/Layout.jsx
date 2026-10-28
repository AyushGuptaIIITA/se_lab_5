import React from 'react';
import Navbar from './Navbar';

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[#f8f9fa] flex flex-col font-sans">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 mt-12 py-6 text-center text-xs text-gray-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-[#ff6f61] text-sm tracking-tight">TATA <span className="text-[#10847e]">1mg</span></span>
            <span>· Telemedicine Platform</span>
          </div>
          <div>All appointments, digital prescriptions & medical consultations are safe and confidential.</div>
        </div>
      </footer>
    </div>
  );
}
