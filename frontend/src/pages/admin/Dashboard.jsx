import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, Stethoscope, Calendar, BarChart3, Shield, Activity, RefreshCw, Loader2, ArrowRight, ShieldAlert } from 'lucide-react';
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
      <p className="text-2xl font-black text-gray-900 mt-3">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-gray-700 capitalize">{label}</span>
        <span className="text-xs font-bold text-gray-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const { t } = useLanguage();
  const [reports, setReports] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [repRes, logRes] = await Promise.all([
        api.get('/admin/reports'),
        api.get('/admin/audit-logs?limit=10')
      ]);
      setReports(repRes.data);
      setAuditLogs(logRes.data.logs || []);
    } catch (err) {
      setAlert({ type: 'error', message: 'Failed to load reports.' });
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const statusColors = {
    pending: 'bg-amber-500',
    confirmed: 'bg-[#10847e]',
    'in-progress': 'bg-[#fe8d00]',
    completed: 'bg-emerald-500',
    cancelled: 'bg-[#ff6f61]'
  };
  const totalByStatus = reports?.appointmentsByStatus?.reduce((a, b) => a + b.count, 0) || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Admin Header */}
        <div className="rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-gray-900 via-slate-800 to-gray-900 text-white shadow-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-[#ff6f61] text-white">
                Tata 1mg Platform Administration
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2">Executive Control Panel</h1>
              <p className="text-sm text-gray-300 mt-1">
                Real-time monitoring of doctors, patients, pharmacy dispatch, and compliance audits
              </p>
            </div>
            <button
              onClick={fetchAll}
              disabled={loading}
              className="self-start flex items-center space-x-2 p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48 bg-white rounded-xl border border-gray-200">
            <Loader2 className="w-8 h-8 animate-spin text-[#ff6f61]" />
          </div>
        ) : (
          <>
            {/* High-level metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard
                icon={Users}
                label={t('totalUsers')}
                value={reports?.totalUsers}
                colorClass="bg-purple-50 text-purple-700"
                borderClass="border-purple-100"
                sub="All registered accounts"
              />
              <StatCard
                icon={Stethoscope}
                label={t('totalDoctors')}
                value={reports?.totalDoctors}
                colorClass="bg-orange-50 text-[#ff6f61]"
                borderClass="border-orange-100"
                sub="Verified practitioners"
              />
              <StatCard
                icon={UserCheck}
                label={t('totalPatients')}
                value={reports?.totalPatients}
                colorClass="bg-teal-50 text-[#10847e]"
                borderClass="border-teal-100"
                sub="Active patients"
              />
              <StatCard
                icon={Calendar}
                label={t('totalAppointments')}
                value={reports?.totalAppointments}
                colorClass="bg-blue-50 text-blue-700"
                borderClass="border-blue-100"
                sub="Total consultations booked"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard
                icon={Activity}
                label={t('completedConsultations')}
                value={reports?.completedConsultations}
                colorClass="bg-emerald-50 text-emerald-700"
                borderClass="border-emerald-100"
              />
              <StatCard
                icon={Shield}
                label={t('prescriptionsGenerated')}
                value={reports?.prescriptionsGenerated}
                colorClass="bg-orange-50 text-[#ff6f61]"
                borderClass="border-orange-100"
              />
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs flex items-center space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 text-[#10847e] flex items-center justify-center font-bold">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-bold">API Services</p>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-gray-900">100% Operational</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments by status */}
              {reports?.appointmentsByStatus?.length > 0 && (
                <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-xs space-y-4">
                  <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-[#ff6f61]" />
                    <span>Appointment Status Breakdown</span>
                  </h2>
                  <div className="space-y-3">
                    {reports.appointmentsByStatus.map(({ _id, count }) => (
                      <MiniBar key={_id} label={_id} value={count} max={totalByStatus} color={statusColors[_id] || 'bg-gray-400'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent audit activity */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-base font-bold text-gray-900 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-[#10847e]" />
                    <span>{t('recentActivity')}</span>
                  </h2>
                  <Link to="/admin/audit-logs" className="text-xs font-bold text-[#ff6f61] hover:underline">
                    {t('viewAll')} →
                  </Link>
                </div>
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="py-8 text-center text-sm text-gray-500">No recent audit logs</div>
                  ) : auditLogs.map(log => (
                    <div key={log._id} className="p-3.5 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-[#10847e] border border-teal-200 uppercase tracking-wider">
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                          <p className="text-xs font-semibold text-gray-700 mt-1">{log.actorName} ({log.actorRole})</p>
                        </div>
                        <span className="text-[10px] text-gray-400 font-mono flex-shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { to: '/admin/users', icon: Users, label: t('userManagement'), color: 'text-[#ff6f61] bg-orange-50' },
                { to: '/admin/reports', icon: BarChart3, label: t('systemReports'), color: 'text-[#10847e] bg-teal-50' },
                { to: '/admin/audit-logs', icon: Shield, label: t('auditLogs'), color: 'text-purple-700 bg-purple-50' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between p-4 rounded-xl bg-white border border-gray-200 hover:border-[#ff6f61] shadow-xs transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center font-bold`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-sm font-bold text-gray-800 group-hover:text-[#ff6f61] transition-colors">{label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-[#ff6f61] transition-colors" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}