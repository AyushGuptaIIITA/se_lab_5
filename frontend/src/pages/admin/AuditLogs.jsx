import React, { useEffect, useState } from 'react';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const ACTION_COLORS = {
  USER_LOGIN: 'bg-blue-500/10 text-blue-300 border-blue-500/30',
  USER_REGISTERED: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30',
  PRESCRIPTION_CREATED: 'bg-teal-500/10 text-teal-300 border-teal-500/30',
  PRESCRIPTION_SENT_TO_PHARMACY: 'bg-violet-500/10 text-violet-300 border-violet-500/30',
  APPOINTMENT_BOOKED: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/30',
  APPOINTMENT_STATUS_UPDATED: 'bg-amber-500/10 text-amber-300 border-amber-500/30',
  CONSULTATION_STARTED: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30',
  CONSULTATION_ENDED: 'bg-slate-500/10 text-slate-300 border-slate-500/30',
  USER_SUSPENDED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
  USER_DELETED: 'bg-rose-500/10 text-rose-300 border-rose-500/30',
};

function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const style = ACTION_COLORS[log.action] || 'bg-slate-500/10 text-slate-300 border-slate-500/30';

  return (
    <>
      <tr className="hover:bg-slate-900/50 transition-colors cursor-pointer" onClick={() => setOpen(!open)}>
        <td className="py-3.5 px-4 text-[10px] text-slate-500 font-mono whitespace-nowrap">
          {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </td>
        <td className="py-3.5 px-4">
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style}`}>
            {log.action?.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="py-3.5 px-4">
          <p className="text-xs font-semibold text-slate-200">{log.actorName || '—'}</p>
          <span className="text-[10px] text-slate-500 capitalize">{log.actorRole}</span>
        </td>
        <td className="py-3.5 px-4 text-xs text-slate-400 capitalize">{log.targetType || '—'}</td>
        <td className="py-3.5 px-4 text-[10px] font-mono text-slate-500">{log.ipAddress || '—'}</td>
        <td className="py-3.5 px-4 text-right">
          {open ? <ChevronUp className="w-4 h-4 text-slate-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-slate-400 ml-auto" />}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 pb-4">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-700 text-[11px] font-mono text-slate-400 whitespace-pre-wrap">
              {log.details ? JSON.stringify(log.details, null, 2) : 'No additional details.'}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AuditLogs() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [alert, setAlert] = useState(null);
  const LIMIT = 20;

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search) params.actor = search;
      if (actionFilter) params.action = actionFilter;
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;
      const res = await api.get('/admin/audit-logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch { setAlert({ type: 'error', message: 'Failed to load audit logs.' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter, fromDate, toDate]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); fetchLogs(); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div>
          <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2"><Shield className="w-6 h-6 text-purple-400" /><span>{t('auditLogs')}</span></h1>
          <p className="text-sm text-slate-400 mt-1">Immutable audit trail for all sensitive actions. Total: <span className="text-slate-200 font-semibold">{total}</span> entries</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input type="text" placeholder="Search by actor name..." value={search} onChange={e => setSearch(e.target.value)}
              className="glass-input w-full pl-10 pr-4 py-2.5 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none" />
          </div>
          <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(1); }} className="glass-input px-3 py-2.5 rounded-xl text-sm text-slate-100 focus:outline-none min-w-[160px]">
            <option value="">All Actions</option>
            {Object.keys(ACTION_COLORS).map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
          </select>
          <div className="flex items-center space-x-2 text-xs">
            <input type="date" value={fromDate} onChange={e => { setFromDate(e.target.value); setPage(1); }} className="glass-input px-3 py-2.5 rounded-xl text-slate-100 focus:outline-none" />
            <span className="text-slate-500">–</span>
            <input type="date" value={toDate} onChange={e => { setToDate(e.target.value); setPage(1); }} className="glass-input px-3 py-2.5 rounded-xl text-slate-100 focus:outline-none" />
          </div>
        </div>

        {/* Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {loading ? (
                  <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin text-indigo-500 mx-auto" /></td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-slate-400">No audit log entries found.</td></tr>
                ) : (
                  logs.map(log => <LogRow key={log._id} log={log} />)
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>Page {page} of {totalPages} · {total} entries (newest first)</span>
              <div className="flex items-center space-x-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 hover:bg-slate-700 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
