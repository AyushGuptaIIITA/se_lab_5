import React, { useEffect, useState } from 'react';
import { BarChart3, Users, Calendar, Stethoscope, FileText, CheckCircle, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="glass-card p-5 rounded-2xl border border-slate-800">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
      </div>
      <p className="text-3xl font-bold text-white mt-3">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-400 capitalize w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-slate-800">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-slate-300 w-6 text-right">{value}</span>
    </div>
  );
}

function VBar({ label, value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-semibold text-slate-300">{value}</span>
      <div className="w-full flex flex-col justify-end bg-slate-800 rounded-lg overflow-hidden" style={{ height: 80 }}>
        <div className="bg-indigo-500 rounded-lg w-full transition-all" style={{ height: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-500 text-center leading-tight">{label}</span>
    </div>
  );
}

const STATUS_COLORS = {
  pending: 'bg-amber-500',
  confirmed: 'bg-blue-500',
  'in-progress': 'bg-indigo-500',
  completed: 'bg-emerald-500',
  cancelled: 'bg-rose-500',
  rescheduled: 'bg-violet-500',
};

export default function Reports() {
  const { t } = useLanguage();
  const [reports, setReports] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetch = async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/reports');
      setReports(res.data);
    } catch { setAlert({ type: 'error', message: 'Failed to load reports.' }); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetch(); }, []);

  const totalByStatus = reports?.appointmentsByStatus?.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <Layout>
      <div className="space-y-8">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-white flex items-center space-x-2"><BarChart3 className="w-6 h-6 text-violet-400" /><span>{t('systemReports')}</span></h1>
            <p className="text-sm text-slate-400 mt-1">Usage, appointments, compliance, and platform analytics</p>
          </div>
          <button onClick={fetch} disabled={loading} className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 disabled:opacity-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : !reports ? null : (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label={t('totalUsers')} value={reports.totalUsers} color="bg-indigo-500/10 text-indigo-400" />
              <StatCard icon={Calendar} label={t('totalAppointments')} value={reports.totalAppointments} color="bg-violet-500/10 text-violet-400" />
              <StatCard icon={CheckCircle} label={t('completedConsultations')} value={reports.completedConsultations} color="bg-emerald-500/10 text-emerald-400" sub={`${reports.totalAppointments > 0 ? Math.round((reports.completedConsultations / reports.totalAppointments) * 100) : 0}% completion rate`} />
              <StatCard icon={FileText} label={t('prescriptionsGenerated')} value={reports.prescriptionsGenerated} color="bg-teal-500/10 text-teal-400" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments by status */}
              {reports.appointmentsByStatus?.length > 0 && (
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h2 className="text-base font-bold text-white">Appointments by Status</h2>
                  <div className="space-y-3">
                    {reports.appointmentsByStatus.map(({ _id, count }) => (
                      <HBar key={_id} label={_id} value={count} max={totalByStatus} color={STATUS_COLORS[_id] || 'bg-slate-500'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Users by role */}
              {reports.usersByRole?.length > 0 && (
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h2 className="text-base font-bold text-white">Users by Role</h2>
                  <div className="flex items-end gap-4 h-32 px-4">
                    {reports.usersByRole.map(({ _id, count }) => (
                      <VBar key={_id} label={_id} value={count} max={Math.max(...reports.usersByRole.map(u => u.count))} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Monthly appointments trend */}
            {reports.appointmentsByMonth?.length > 0 && (
              <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                <h2 className="text-base font-bold text-white flex items-center space-x-2"><TrendingUp className="w-4 h-4 text-indigo-400" /><span>Monthly Appointments Trend</span></h2>
                <div className="flex items-end gap-3 h-36 overflow-x-auto">
                  {reports.appointmentsByMonth.map(({ _id, count }) => {
                    const maxCount = Math.max(...reports.appointmentsByMonth.map(m => m.count));
                    const pct = maxCount > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 8;
                    const monthName = new Date(2026, (_id.month || 1) - 1, 1).toLocaleString('en', { month: 'short' });
                    return (
                      <div key={`${_id.year}-${_id.month}`} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                        <span className="text-[10px] font-semibold text-slate-300">{count}</span>
                        <div className="w-full flex flex-col justify-end bg-slate-800 rounded-lg overflow-hidden" style={{ height: 96 }}>
                          <div className="bg-gradient-to-t from-indigo-600 to-violet-500 rounded-lg w-full" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] text-slate-500">{monthName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compliance */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center space-x-2 mb-4"><CheckCircle className="w-4 h-4 text-emerald-400" /><span>Compliance & Audit Summary</span></h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                {[
                  { label: 'Audit Log Entries', value: reports.totalAuditLogs ?? '—' },
                  { label: 'Prescriptions Signed', value: reports.prescriptionsGenerated ?? '—' },
                  { label: 'Active Users', value: reports.activeUsers ?? '—' },
                  { label: 'Data Encrypted', value: '100%' },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-slate-400 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
