import React from 'react';

const statusStyles = {
  pending: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  confirmed: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  'in-progress': 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  completed: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  cancelled: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  rescheduled: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  suspended: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  sent: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  received: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  dispensed: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  failed: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

const statusLabels = {
  'in-progress': 'In Progress',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.pending;
  const label = statusLabels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '—');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${style}`}>
      {label}
    </span>
  );
}
