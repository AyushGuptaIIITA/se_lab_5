import React from 'react';

const statusStyles = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmed: 'bg-teal-50 text-[#10847e] border-teal-200',
  'in-progress': 'bg-orange-50 text-[#ff6f61] border-orange-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-rose-50 text-rose-600 border-rose-200',
  rescheduled: 'bg-purple-50 text-purple-700 border-purple-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  suspended: 'bg-rose-50 text-rose-700 border-rose-200',
  sent: 'bg-teal-50 text-[#10847e] border-teal-200',
  received: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  dispensed: 'bg-teal-50 text-teal-800 border-teal-200',
  failed: 'bg-rose-50 text-rose-700 border-rose-200',
};

const statusLabels = {
  'in-progress': 'In Progress',
};

export default function StatusBadge({ status }) {
  const style = statusStyles[status] || statusStyles.pending;
  const label = statusLabels[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '—');
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider border ${style}`}>
      {label}
    </span>
  );
}
