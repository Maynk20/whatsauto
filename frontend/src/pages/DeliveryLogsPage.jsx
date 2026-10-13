import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  FileText,
  RefreshCw,
  Search,
  Filter,
  Eye,
  X
} from 'lucide-react';

export function DeliveryLogsPage() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState('all');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = eventTypeFilter !== 'all' ? `?eventType=${eventTypeFilter}` : '';
      const res = await api.getLogs(query);
      if (res.success) {
        setLogs(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load delivery logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventTypeFilter]);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Delivery & Audit Logs</h2>
          <p className="text-sm text-slate-400 mt-1">Immutable ledger of message dispatches, webhook receipts, and worker actions</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl bg-secondary hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-accent' : ''}`} />
          <span>Refresh Audit Logs</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filter Events:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['all', 'queued', 'attempted', 'delivered', 'failed'].map((ev) => (
            <button
              key={ev}
              onClick={() => setEventTypeFilter(ev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                eventTypeFilter === ev
                  ? 'bg-accent text-slate-950 font-bold'
                  : 'bg-secondary text-slate-400 hover:text-white'
              }`}
            >
              {ev}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading audit records...</div>
        ) : logs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No audit records matching filter "{eventTypeFilter}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Timestamp</th>
                  <th className="py-3 px-4">Job Type</th>
                  <th className="py-3 px-4">Event Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Sanitized Summary</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-secondary/20 transition">
                    <td className="py-3 px-4 whitespace-nowrap text-slate-400">
                      {new Date(log.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'medium' })}
                    </td>
                    <td className="py-3 px-4 uppercase font-semibold text-[11px] text-slate-300">
                      {log.job_type.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 capitalize font-medium">{log.event_type}</td>
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
                    <td className="py-3 px-4 truncate max-w-xs text-slate-400 font-mono text-[11px]">
                      {JSON.stringify(log.sanitized_details)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="text-xs text-accent hover:underline inline-flex items-center space-x-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Log Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-card border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white">Log Event Inspection</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-3 py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Log ID:</span>
                <span className="col-span-2 font-mono text-slate-300">{selectedLog.id}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Job Reference:</span>
                <span className="col-span-2 font-mono text-slate-300">{selectedLog.job_id || 'N/A'}</span>
              </div>
              <div className="grid grid-cols-3 py-1 border-b border-slate-800/60">
                <span className="text-slate-500">Timestamp:</span>
                <span className="col-span-2 text-slate-300">{new Date(selectedLog.created_at).toISOString()}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-slate-400 mb-1.5">Sanitized Event Details:</p>
              <pre className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto max-h-48">
                {JSON.stringify(selectedLog.sanitized_details, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
