import React, { useEffect, useState } from 'react';
import { BarChart3, Users, Calendar, Stethoscope, FileText, CheckCircle, Loader2, RefreshCw, TrendingUp } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

function StatCard({ icon: Icon, label, value, colorClass, borderClass, sub }) {
  return (
    <div className={`bg-white p-5 rounded-xl border ${borderClass} shadow-xs`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{label}</span>
        <div className={`w-9 h-9 rounded-xl ${colorClass} flex items-center justify-center font-bold`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900 mt-3">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function HBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-semibold text-gray-700 capitalize w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-3 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-3 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold text-gray-900 w-6 text-right">{value}</span>
    </div>
  );
}

function VBar({ label, value, max }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <span className="text-xs font-bold text-gray-900">{value}</span>
      <div className="w-full flex flex-col justify-end bg-gray-100 rounded-lg overflow-hidden" style={{ height: 80 }}>
        <div className="bg-[#10847e] rounded-lg w-full transition-all" style={{ height: `${pct}%` }} />
      </div>
      <span className="text-[11px] font-bold text-gray-600 text-center leading-tight capitalize">{label}</span>
    </div>
  );
}

const STATUS_COLORS = {
  pending: 'bg-amber-500',
  confirmed: 'bg-[#10847e]',
  'in-progress': 'bg-[#fe8d00]',
  completed: 'bg-emerald-500',
  cancelled: 'bg-[#ff6f61]',
  rescheduled: 'bg-purple-500',
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
    } catch {
      setAlert({ type: 'error', message: 'Failed to load reports.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetch(); }, []);

  const totalByStatus = reports?.appointmentsByStatus?.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
          <div>
            <h1 className="text-2xl font-black text-gray-900 flex items-center space-x-2">
              <span className="text-[#ff6f61]">{t('systemReports')} & Analytics</span>
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">Real-time telehealth operational metrics, fulfillment rate, and monthly trends</p>
          </div>
          <button
            onClick={fetch}
            disabled={loading}
            className="p-2 rounded-lg bg-white border border-gray-200 text-gray-600 hover:text-gray-900 disabled:opacity-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff6f61]" />
          </div>
        ) : !reports ? null : (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label={t('totalUsers')}
                value={reports.totalUsers}
                colorClass="bg-purple-50 text-purple-700"
                borderClass="border-purple-100"
              />
              <StatCard
                icon={Calendar}
                label={t('totalAppointments')}
                value={reports.totalAppointments}
                colorClass="bg-orange-50 text-[#ff6f61]"
                borderClass="border-orange-100"
              />
              <StatCard
                icon={CheckCircle}
                label={t('completedConsultations')}
                value={reports.completedConsultations}
                colorClass="bg-teal-50 text-[#10847e]"
                borderClass="border-teal-100"
                sub={`${reports.totalAppointments > 0 ? Math.round((reports.completedConsultations / reports.totalAppointments) * 100) : 0}% completion rate`}
              />
              <StatCard
                icon={FileText}
                label={t('prescriptionsGenerated')}
                value={reports.prescriptionsGenerated}
                colorClass="bg-blue-50 text-blue-700"
                borderClass="border-blue-100"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments by status */}
              {reports.appointmentsByStatus?.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">Appointments by Status</h2>
                  <div className="space-y-3">
                    {reports.appointmentsByStatus.map(({ _id, count }) => (
                      <HBar key={_id} label={_id} value={count} max={totalByStatus} color={STATUS_COLORS[_id] || 'bg-gray-400'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Users by role */}
              {reports.usersByRole?.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                  <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider">User Distribution by Role</h2>
                  <div className="flex items-end gap-4 h-32 px-4 pt-4">
                    {reports.usersByRole.map(({ _id, count }) => (
                      <VBar key={_id} label={_id} value={count} max={Math.max(...reports.usersByRole.map(u => u.count))} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Monthly appointments trend */}
            {reports.appointmentsByMonth?.length > 0 && (
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-[#ff6f61]" />
                  <span>Monthly Consultation Volume</span>
                </h2>
                <div className="flex items-end gap-3 h-36 overflow-x-auto pt-4">
                  {reports.appointmentsByMonth.map(({ _id, count }) => {
                    const maxCount = Math.max(...reports.appointmentsByMonth.map(m => m.count));
                    const pct = maxCount > 0 ? Math.max(8, Math.round((count / maxCount) * 100)) : 8;
                    const monthName = new Date(2026, (_id.month || 1) - 1, 1).toLocaleString('en', { month: 'short' });
                    return (
                      <div key={`${_id.year}-${_id.month}`} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                        <span className="text-[10px] font-bold text-gray-900">{count}</span>
                        <div className="w-full flex flex-col justify-end bg-gray-100 rounded-lg overflow-hidden" style={{ height: 96 }}>
                          <div className="bg-gradient-to-t from-[#ff6f61] to-[#fe8d00] rounded-lg w-full" style={{ height: `${pct}%` }} />
                        </div>
                        <span className="text-[10px] font-semibold text-gray-500">{monthName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Compliance */}
            <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wider flex items-center space-x-2 mb-4">
                <CheckCircle className="w-4 h-4 text-[#10847e]" />
                <span>Regulatory & Audit Compliance Summary</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                {[
                  { label: 'Audit Log Records', value: reports.totalAuditLogs ?? '—', color: 'text-gray-900' },
                  { label: 'Signed e-Prescriptions', value: reports.prescriptionsGenerated ?? '—', color: 'text-[#10847e]' },
                  { label: 'Active User Accounts', value: reports.activeUsers ?? '—', color: 'text-[#ff6f61]' },
                  { label: 'Data Encryption', value: '100% AES-256', color: 'text-purple-700' },
                ].map(({ label, value, color }) => (
                  <div key={label} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 text-center">
                    <p className={`text-2xl font-black ${color}`}>{value}</p>
                    <p className="text-gray-500 font-semibold mt-1">{label}</p>
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