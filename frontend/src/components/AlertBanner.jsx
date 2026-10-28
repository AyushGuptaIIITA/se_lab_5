import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />,
  error: <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5" />,
  info: <Info className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />,
};

const styles = {
  success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  error: 'bg-rose-500/10 border-rose-500/30 text-rose-300',
  info: 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300',
};

export default function AlertBanner({ type = 'info', message, onDismiss }) {
  if (!message) return null;
  return (
    <div className={`p-4 rounded-xl flex items-start justify-between space-x-3 text-sm border ${styles[type]}`}>
      <div className="flex items-start space-x-3">
        {icons[type]}
        <span className="flex-1">{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
