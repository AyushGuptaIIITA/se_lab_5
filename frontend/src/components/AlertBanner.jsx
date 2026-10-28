import React from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

const icons = {
  success: <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />,
  error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />,
  info: <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />,
};

const styles = {
  success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
  error: 'bg-rose-50 border-rose-200 text-rose-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

export default function AlertBanner({ type = 'info', message, onDismiss }) {
  if (!message) return null;
  return (
    <div className={`p-4 rounded-xl flex items-start justify-between space-x-3 text-sm border font-medium shadow-xs ${styles[type]}`}>
      <div className="flex items-start space-x-3">
        {icons[type]}
        <span className="flex-1">{message}</span>
      </div>
      {onDismiss && (
        <button onClick={onDismiss} className="opacity-60 hover:opacity-100 transition-opacity flex-shrink-0 text-slate-500">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}