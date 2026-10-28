import React from 'react';
import { X, Pill, ShieldAlert, CheckCircle2, Info, BookOpen } from 'lucide-react';

export default function DrugInfoModal({ drug, onClose }) {
  if (!drug) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{drug.name}</h3>
              <p className="text-xs text-blue-600 font-semibold">{drug.genericName || drug.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Category & Form Badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
            Category: {drug.category || 'Therapeutic Agent'}
          </span>
          <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-semibold">
            Form: {drug.form || 'Oral Tablet'}
          </span>
          {drug.defaultDosage && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
              Standard: {drug.defaultDosage}
            </span>
          )}
        </div>

        {/* Clinical Indications */}
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1">
          <p className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
            <BookOpen className="w-3.5 h-3.5 text-blue-600" />
            <span>Clinical Indications & Uses</span>
          </p>
          <p className="text-slate-800 leading-relaxed font-medium">
            {drug.indications || 'Prescribed under physician guidance for symptom relief or therapeutic control.'}
          </p>
        </div>

        {/* Warnings & Safety Precautions */}
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs space-y-1">
          <p className="font-bold text-amber-900 uppercase tracking-wider text-[11px] flex items-center space-x-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
            <span>Safety Warnings & Side Effects</span>
          </p>
          <p className="text-amber-950 leading-relaxed font-medium">
            {drug.warnings || 'Take strictly according to prescribed schedule. If unusual allergic symptoms, dizziness, or rash develop, consult your doctor.'}
          </p>
        </div>

        {/* Instructions & Timing */}
        {drug.defaultInstructions && (
          <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100 text-xs">
            <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">Recommended Timing</span>
            <p className="text-slate-800 font-semibold mt-0.5">{drug.defaultInstructions}</p>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm"
          >
            Close Factsheet
          </button>
        </div>
      </div>
    </div>
  );
}
