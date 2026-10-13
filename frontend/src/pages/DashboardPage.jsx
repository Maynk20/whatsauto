import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Smartphone,
  ListOrdered,
  CheckCircle,
  AlertOctagon,
  Clock,
  RefreshCw,
  Send,
  UploadCloud,
  ArrowUpRight
} from 'lucide-react';

export function DashboardPage({ onNavigate }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getDashboardStats();
      if (res.success) {
        setStats(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">System Overview</h2>
          <p className="text-sm text-slate-400 mt-1">Real-time telemetry and dispatch metrics</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-secondary hover:bg-slate-700 text-xs font-medium text-slate-200 border border-slate-700 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />
          <span>Refresh Metrics</span>
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchStats} className="underline text-xs hover:text-white">Retry</button>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Connected Devices */}
        <div className="bg-card border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Devices</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Smartphone className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '-' : stats?.connectedDevices ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Active WhatsApp sessions</p>
        </div>

        {/* Pending Queue */}
        <div className="bg-card border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Pending Queue</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <ListOrdered className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '-' : stats?.pendingQueue ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Awaiting worker dispatch</p>
        </div>

        {/* Sent Messages */}
        <div className="bg-card border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Delivered</span>
            <div className="p-2 rounded-lg bg-accent/10 text-accent">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '-' : stats?.totalSent ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Confirmed provider deliveries</p>
        </div>

        {/* Failed Messages */}
        <div className="bg-card border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Failed</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
              <AlertOctagon className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '-' : stats?.totalFailed ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Terminal delivery errors</p>
        </div>

        {/* Upcoming Stories */}
        <div className="bg-card border border-slate-800 rounded-2xl p-5 relative overflow-hidden shadow-sm">
          <div className="flex items-center justify-between text-slate-400 mb-3">
            <span className="text-xs font-medium uppercase tracking-wider">Stories</span>
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-extrabold text-white">
            {loading ? '-' : stats?.upcomingStories ?? 0}
          </div>
          <p className="text-xs text-slate-400 mt-1">Scheduled story updates</p>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => onNavigate('sender')}
          className="bg-card hover:bg-slate-850 border border-slate-800 hover:border-accent/40 rounded-2xl p-5 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent group-hover:scale-105 transition">
              <Send className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-accent transition" />
          </div>
          <h3 className="text-base font-semibold text-white">Send Direct Messages</h3>
          <p className="text-xs text-slate-400 mt-1">Compose personalized broadcast messages with variable tags.</p>
        </div>

        <div
          onClick={() => onNavigate('sender')}
          className="bg-card hover:bg-slate-850 border border-slate-800 hover:border-accent/40 rounded-2xl p-5 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-105 transition">
              <UploadCloud className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 transition" />
          </div>
          <h3 className="text-base font-semibold text-white">Bulk CSV Importer</h3>
          <p className="text-xs text-slate-400 mt-1">Upload recipient contact lists with automatic duplicate suppression.</p>
        </div>

        <div
          onClick={() => onNavigate('stories')}
          className="bg-card hover:bg-slate-850 border border-slate-800 hover:border-accent/40 rounded-2xl p-5 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
            <ArrowUpRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 transition" />
          </div>
          <h3 className="text-base font-semibold text-white">Schedule Story Broadcast</h3>
          <p className="text-xs text-slate-400 mt-1">Design stories with 9:16 interactive mobile preview and time presets.</p>
        </div>
      </div>

      {/* Recent Activity Audit Table */}
      <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-semibold text-white">Live Event Log</h3>
            <p className="text-xs text-slate-400 mt-0.5">Direct query stream from delivery_logs table</p>
          </div>
          <button
            onClick={() => onNavigate('logs')}
            className="text-xs text-accent hover:underline flex items-center space-x-1"
          >
            <span>View All Logs</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {stats?.recentActivity && stats.recentActivity.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Timestamp</th>
                  <th className="py-3 px-4">Job Type</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 rounded-r-lg">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {stats.recentActivity.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition">
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 capitalize font-medium">{log.job_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4 capitalize">{log.event_type}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        log.status === 'sent' || log.status === 'published' || log.status === 'delivered'
                          ? 'bg-emerald-500/10 text-emerald-400'
                          : log.status === 'failed'
                          ? 'bg-rose-500/10 text-rose-400'
                          : 'bg-amber-500/10 text-amber-400'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 truncate max-w-xs">
                      {JSON.stringify(log.sanitized_details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            No events recorded yet. Scheduled stories or queued messages will appear here in real-time.
          </div>
        )}
      </div>
    </div>
  );
}
