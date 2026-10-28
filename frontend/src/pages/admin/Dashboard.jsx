import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, Stethoscope, Calendar, BarChart3, Shield, Activity, RefreshCw, Loader2, ArrowRight } from 'lucide-react';
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
      <p className="text-2xl font-bold text-white mt-3">{value ?? '—'}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}

function MiniBar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-400 capitalize">{label}</span>
        <span className="text-xs font-semibold text-slate-300">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-800">
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

  const statusColors = { pending: 'bg-amber-500', confirmed: 'bg-blue-500', 'in-progress': 'bg-indigo-500', completed: 'bg-emerald-500', cancelled: 'bg-rose-500' };
  const totalByStatus = reports?.appointmentsByStatus?.reduce((a, b) => a + b.count, 0) || 0;

  return (
    <Layout>
      <div className="space-y-8">
        {alert && <AlertBanner type={alert.type} message={alert.message} onDismiss={() => setAlert(null)} />}

        {/* Hero */}
        <div className="relative overflow-hidden rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-purple-900/40 via-indigo-900/30 to-slate-900 border border-purple-500/20 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">Admin Control Panel</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mt-2">System Overview</h1>
              <p className="text-sm text-slate-300 mt-1">Monitor users, appointments, prescriptions and compliance.</p>
            </div>
            <button onClick={fetchAll} disabled={loading} className="self-start flex items-center space-x-2 p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>
        ) : (
          <>
            {/* Stats grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard icon={Users} label={t('totalUsers')} value={reports?.totalUsers} color="bg-indigo-500/10 text-indigo-400" sub="All registered accounts" />
              <StatCard icon={Stethoscope} label={t('totalDoctors')} value={reports?.totalDoctors} color="bg-emerald-500/10 text-emerald-400" sub="Medical professionals" />
              <StatCard icon={UserCheck} label={t('totalPatients')} value={reports?.totalPatients} color="bg-blue-500/10 text-blue-400" sub="Registered patients" />
              <StatCard icon={Calendar} label={t('totalAppointments')} value={reports?.totalAppointments} color="bg-violet-500/10 text-violet-400" sub="All time" />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
              <StatCard icon={Activity} label={t('completedConsultations')} value={reports?.completedConsultations} color="bg-teal-500/10 text-teal-400" />
              <StatCard icon={Shield} label={t('prescriptionsGenerated')} value={reports?.prescriptionsGenerated} color="bg-amber-500/10 text-amber-400" />
              <div className="glass-card p-5 rounded-2xl border border-slate-800 flex items-center space-x-4">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center"><Activity className="w-4 h-4" /></div>
                <div>
                  <p className="text-xs text-slate-400 uppercase font-semibold">System</p>
                  <div className="flex items-center space-x-1.5 mt-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" /><span className="text-sm font-bold text-emerald-300">Operational</span></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Appointments by status */}
              {reports?.appointmentsByStatus?.length > 0 && (
                <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
                  <h2 className="text-base font-bold text-white flex items-center space-x-2"><BarChart3 className="w-4 h-4 text-indigo-400" /><span>Appointments by Status</span></h2>
                  <div className="space-y-3">
                    {reports.appointmentsByStatus.map(({ _id, count }) => (
                      <MiniBar key={_id} label={_id} value={count} max={totalByStatus} color={statusColors[_id] || 'bg-slate-500'} />
                    ))}
                  </div>
                </div>
              )}

              {/* Recent audit activity */}
              <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <h2 className="text-base font-bold text-white flex items-center space-x-2"><Shield className="w-4 h-4 text-purple-400" /><span>{t('recentActivity')}</span></h2>
                  <Link to="/admin/audit-logs" className="text-xs text-indigo-400 hover:text-indigo-300">{t('viewAll')} →</Link>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-64 overflow-y-auto">
                  {auditLogs.length === 0 ? (
                    <div className="py-8 text-center text-sm text-slate-400">No recent activity</div>
                  ) : auditLogs.map(log => (
                    <div key={log._id} className="p-4 hover:bg-slate-900/40 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/30 uppercase tracking-wider">
                            {log.action?.replace(/_/g, ' ')}
                          </span>
                          <p className="text-xs text-slate-400 mt-1">{log.actorName} ({log.actorRole})</p>
                        </div>
                        <span className="text-[10px] text-slate-500 flex-shrink-0">{new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[
                { to: '/admin/users', icon: Users, label: t('userManagement'), color: 'text-indigo-400 bg-indigo-500/10' },
                { to: '/admin/reports', icon: BarChart3, label: t('systemReports'), color: 'text-violet-400 bg-violet-500/10' },
                { to: '/admin/audit-logs', icon: Shield, label: t('auditLogs'), color: 'text-purple-400 bg-purple-500/10' },
              ].map(({ to, icon: Icon, label, color }) => (
                <Link key={to} to={to} className="flex items-center justify-between p-4 rounded-2xl glass-card border border-slate-800 hover:border-slate-700 transition-all group">
                  <div className="flex items-center space-x-3">
                    <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center`}><Icon className="w-4 h-4" /></div>
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white">{label}</span>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                </Link>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
