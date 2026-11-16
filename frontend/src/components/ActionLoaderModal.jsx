import React from 'react';
import { Loader2, Activity, ShieldCheck, Sparkles, FileText } from 'lucide-react';

export default function ActionLoaderModal({
  isOpen,
  title = 'Processing...',
  subtitle = 'Please wait while we complete this action.',
  stage,
  icon: CustomIcon
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 transition-all duration-300 animate-fade-in">
      <div className="relative bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl overflow-hidden animate-slide-up">
        {/* Ambient background glow */}
        <div className="absolute -top-12 -left-12 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

        {/* Central Animated Graphic */}
        <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
          {/* Outer glowing pulsing ring */}
          <div className="absolute inset-0 rounded-full bg-blue-500/10 dark:bg-blue-400/10 animate-ping opacity-60" />
          
          {/* Spinning gradient ring */}
          <div className="absolute inset-0 rounded-full border-3 border-transparent border-t-blue-600 border-r-indigo-500 animate-spin" />
          <div className="absolute inset-1 rounded-full border-2 border-slate-100 dark:border-slate-800" />
          
          {/* Inner pulsing icon */}
          <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
            {CustomIcon ? (
              <CustomIcon className="w-6 h-6 animate-pulse" />
            ) : (
              <Activity className="w-6 h-6 animate-pulse" />
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
          {title}
        </h3>

        {/* Subtitle / Description */}
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
          {subtitle}
        </p>

        {/* Dynamic stage pill if present */}
        {stage && (
          <div className="mt-3.5 inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800/60 text-blue-700 dark:text-blue-300 text-[11px] font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            <span>{stage}</span>
          </div>
        )}

        {/* Shimmering Progress Bar */}
        <div className="mt-6 w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 rounded-full w-2/3 animate-[pulse_1.5s_ease-in-out_infinite]" />
        </div>

        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2.5 font-medium">
          TeleMed Secure Clinical Sync · Please do not close this window
        </p>
      </div>
    </div>
  );
}
