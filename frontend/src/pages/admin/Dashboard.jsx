import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, Stethoscope, Calendar, BarChart3, Shield, Activity, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
import Layout from '../../components/Layout';
import AlertBanner from '../../components/AlertBanner';
import api from '../../services/api';
import { useLanguage } from '../../contexts/LanguageContext';

function StatCard({ icon: Icon, label, value, colorClass, borderClass, sub }) {
  return (
    <div className={`glass-card p-5 rounded-2xl border ${borderClass} bg-white shadow-card hover:shadow-card-hover transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        <div className={`w-10 h-10 rounded-xl ${colorClass} flex items-center justify-center font-bold shadow-xs`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-2xl font-black text-slate-900 mt-3">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-semibold text-slate-700 capitalize">{label}</span>
        <span className="text-xs font-bold text-slate-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-2 rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
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
    confirmed: 'bg-blue-600',
    'in-progress': 'bg-indigo-600',
    completed: 'bg-emerald-500',
    cancelled: 'bg-rose-500'
  };
  const totalByStatus = reports?.appointmentsByStatus?.reduce((a, b) => a + b.count, 0) || 0;

  return (
    <Layout>
      <div className="space-y-6">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Admin Header */}
        <div className="relative overflow-hidden rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white shadow-xl">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-blue-600 text-white shadow-sm">
                TeleMed Platform Administration
              </span>
              <h1 className="text-2xl sm:text-3xl font-black mt-2">Executive Control Panel</h1>
              <p className="text-sm text-slate-300 mt-1">
                Real-time monitoring of doctors, patients, appointment dispatch, and compliance audits
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
          <div className="flex items-center justify-center h-48 glass-panel">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
                colorClass="bg-blue-50 text-blue-600"
                borderClass="border-blue-100"
                sub="Verified practitioners"
              />
              <StatCard
                icon={UserCheck}
                label={t('totalPatients')}
                value={reports?.totalPatients}
                colorClass="bg-emerald-50 text-emerald-600"
                borderClass="border-emerald-100"
                sub="Active patients"
              />
              <StatCard
                icon={Calendar}
                label={t('totalAppointments')}
                value={reports?.totalAppointments}
                colorClass="bg-indigo-50 text-indigo-600"
                borderClass="border-indigo-100"
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
                colorClass="bg-blue-50 text-blue-700"
                borderClass="border-blue-100"
              />
              <div className="glass-card p-5 rounded-2xl bg-white border border-slate-200 shadow-card flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <Activity className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">API Services</p>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-bold text-slate-900">100% Operational</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments by status */}
              {reports?.appointmentsByStatus?.length > 0 && (
                <div className="glass-panel p-5 rounded-2xl bg-white shadow-card space-y-4">
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <BarChart3 className="w-4 h-4 text-blue-600" />
                    <span>Appointment Status Breakdown</span>
                  </h2>
                  <div className="space-y-3">
                    {reports.appointmentsByStatus.map(({ _id, count }) => (
                      <MiniBar key={_id} label={_id} value={count} max={totalByStatus} color={statusColors[_id] || 'bg-slate-400'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent audit activity */}
              <div className="glass-panel rounded-2xl overflow-hidden bg-white shadow-card">
                <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span>{t('recentActivity')}</span>
                  </h2>
                  <Link to="/admin/audit-logs" className="text-xs font-bold text-blue-600 hover:underline">
                    {t('viewAll')} →
                  </Link>
                </div>
                <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">No recent audit logs</div>
                  ) : auditLogs.map(log => (
                    <div key={log._id} className="p-3.5 hover:bg-slate-50 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 uppercase tracking-wider">
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                          <p className="text-xs font-semibold text-slate-800 mt-1">{log.actorName} ({log.actorRole})</p>
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono flex-shrink-0">
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
                { to: '/admin/users', icon: Users, label: t('userManagement'), color: 'text-blue-600 bg-blue-50' },
                { to: '/admin/reports', icon: BarChart3, label: t('systemReports'), color: 'text-emerald-600 bg-emerald-50' },
                { to: '/admin/audit-logs', icon: Shield, label: t('auditLogs'), color: 'text-purple-600 bg-purple-50' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link
                  key={to}
                  to={to}
                  className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 shadow-card hover:shadow-card-hover transition-all group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center font-bold`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}