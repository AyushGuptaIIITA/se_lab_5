import React, { useEffect, useState } from 'react';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

const ACTION_COLORS = {
  USER_LOGIN: 'bg-teal-50 text-[#10847e] border-teal-200',
  USER_REGISTERED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PRESCRIPTION_CREATED: 'bg-orange-50 text-[#ff6f61] border-orange-200',
  PRESCRIPTION_SENT_TO_PHARMACY: 'bg-purple-50 text-purple-700 border-purple-200',
  APPOINTMENT_BOOKED: 'bg-blue-50 text-blue-700 border-blue-200',
  APPOINTMENT_STATUS_UPDATED: 'bg-amber-50 text-amber-700 border-amber-200',
  CONSULTATION_STARTED: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  CONSULTATION_ENDED: 'bg-gray-100 text-gray-700 border-gray-200',
  USER_SUSPENDED: 'bg-rose-50 text-rose-700 border-rose-200',
  USER_DELETED: 'bg-rose-50 text-rose-700 border-rose-200',
};

function LogRow({ log }) {
  const [open, setOpen] = useState(false);
  const style = ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700 border-gray-200';

  return (
    <>
      <tr className="hover:bg-gray-50/70 transition-colors cursor-pointer" onClick={() => setOpen(!open)}>
        <td className="py-3 px-4 text-[11px] text-gray-500 font-mono whitespace-nowrap">
          {new Date(log.timestamp).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </td>
        <td className="py-3 px-4">
          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${style}`}>
            {log.action?.replace(/_/g, ' ')}
          </span>
        </td>
        <td className="py-3 px-4">
          <p className="text-xs font-bold text-gray-900">{log.actorName || '—'}</p>
          <span className="text-[10px] text-gray-500 capitalize">{log.actorRole}</span>
        </td>
        <td className="py-3 px-4 text-xs text-gray-600 capitalize">{log.targetType || '—'}</td>
        <td className="py-3 px-4 text-[11px] font-mono text-gray-400">{log.ipAddress || '—'}</td>
        <td className="py-3 px-4 text-right">
          {open ? <ChevronUp className="w-4 h-4 text-gray-400 ml-auto" /> : <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 pb-3 bg-gray-50">
            <div className="p-3 rounded-lg bg-white border border-gray-200 text-[11px] font-mono text-gray-700 whitespace-pre-wrap shadow-xs">
              {log.details ? JSON.stringify(log.details, null, 2) : 'No additional metadata logged.'}
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
  const [actionFilter, setActionFilter] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [alert, setAlert] = useState(null);
  const LIMIT = 15;

  const ACTIONS = [
    'USER_LOGIN', 'USER_REGISTERED', 'PRESCRIPTION_CREATED',
    'PRESCRIPTION_SENT_TO_PHARMACY', 'APPOINTMENT_BOOKED',
    'APPOINTMENT_STATUS_UPDATED', 'CONSULTATION_STARTED',
    'CONSULTATION_ENDED', 'USER_SUSPENDED', 'USER_DELETED',
  ];

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (actionFilter) params.action = actionFilter;
      const res = await api.get('/admin/audit-logs', { params });
      setLogs(res.data.logs || []);
      setTotal(res.data.total || 0);
    } catch {
      setAlert({ type: 'error', message: 'Failed to load audit logs.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLogs(); }, [page, actionFilter]);

  const totalPages = Math.ceil(total / LIMIT) || 1;

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
              <span className="text-[#10847e]">{t('auditLogs')} & Compliance Trail</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Immutable audit trail of all sensitive medical and authentication actions (SRS FR-12)</p>
          </div>
          <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200 self-start">
            {total} Total Audit Records
          </span>
        </div>

        {/* Filter */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={actionFilter}
              onChange={e => { setActionFilter(e.target.value); setPage(1); }}
              className="glass-input px-3 py-1.5 rounded-lg text-xs bg-white"
            >
              <option value="">All Security Events</option>
              {ACTIONS.map(a => <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>)}
            </select>
          </div>
          <span className="text-xs text-gray-400">Click on any row to expand JSON payload</span>
        </div>

        {/* Logs Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70 text-gray-600 uppercase font-bold text-[11px] tracking-wider">
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Target</th>
                  <th className="py-3 px-4">IP Address</th>
                  <th className="py-3 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-[#ff6f61] mx-auto" />
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400">
                      No matching audit logs found.
                    </td>
                  </tr>
                ) : logs.map(log => <LogRow key={log._id} log={log} />)}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-3.5 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50/50">
              <span>Page {page} of {totalPages} · {total} logs</span>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1 rounded bg-white border border-gray-200 disabled:opacity-40 hover:bg-gray-100"
                >
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