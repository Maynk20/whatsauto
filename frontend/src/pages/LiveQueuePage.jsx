import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import {
  ListOrdered,
  RefreshCw,
  Trash2,
  XCircle,
  Radio,
  Filter
} from 'lucide-react';

export function LiveQueuePage() {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const query = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await api.getQueue(query);
      if (res.success) {
        setJobs(res.data || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error('Failed to load queue:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();

    // Setup Supabase Realtime subscription
    if (!user?.id) return;

    const channel = supabase
      .channel('realtime_queue_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_queue',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          // Re-fetch queue on change
          fetchQueue();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, statusFilter]);

  const handleCancelJob = async (id) => {
    try {
      await api.cancelQueueJob(id);
      fetchQueue();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleClearCompleted = async () => {
    if (!confirm('Clear all sent and cancelled queue items?')) return;
    setActionLoading(true);
    try {
      await api.clearCompletedQueue();
      fetchQueue();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-2xl font-bold tracking-tight text-white">Live Dispatch Queue</h2>
            <span className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30 text-[11px] text-accent font-semibold">
              <Radio className="w-3 h-3 animate-pulse" />
              <span>Realtime Synced</span>
            </span>
          </div>
          <p className="text-sm text-slate-400 mt-1">Live background worker queue state and atomic execution tracking</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={fetchQueue}
            disabled={loading}
            className="p-2.5 rounded-xl bg-secondary hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-accent' : ''}`} />
          </button>

          <button
            onClick={handleClearCompleted}
            disabled={actionLoading}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 border border-slate-700 transition flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-400" />
            <span>Clear Completed</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-card border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-300">Filter Status:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {['all', 'pending', 'processing', 'sent', 'failed', 'cancelled'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === st
                  ? 'bg-accent text-slate-950 font-bold'
                  : 'bg-secondary text-slate-400 hover:text-white'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading queue items...</div>
        ) : jobs.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            No items in queue with status "{statusFilter}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/40 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4 rounded-l-lg">Recipient</th>
                  <th className="py-3 px-4">Message Excerpt</th>
                  <th className="py-3 px-4">Attempts</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Enqueued At</th>
                  <th className="py-3 px-4 rounded-r-lg text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-secondary/20 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-medium text-white">{job.recipient_name || 'Customer'}</div>
                      <div className="text-[11px] font-mono text-slate-400">{job.phone_number}</div>
                    </td>
                    <td className="py-3 px-4 truncate max-w-xs">{job.final_message}</td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-slate-400">
                      {job.attempt_count} / {job.max_attempts}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                        job.status === 'sent' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        job.status === 'processing' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        job.status === 'failed' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        job.status === 'cancelled' ? 'bg-slate-700 text-slate-400' :
                        'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                      {new Date(job.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {job.status === 'pending' && (
                        <button
                          onClick={() => handleCancelJob(job.id)}
                          className="text-xs text-rose-400 hover:text-rose-300 inline-flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
