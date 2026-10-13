import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Settings,
  Database,
  Radio,
  ShieldCheck,
  Server,
  Key,
  FolderLock
} from 'lucide-react';

export function SettingsPage() {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getReady()
      .then(res => setHealthData(res))
      .catch(err => setHealthData({ status: 'error', message: err.message }))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">System Settings & Configuration</h2>
        <p className="text-sm text-slate-400 mt-1">Infrastructure parameters, backend probes, and database credentials</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Managed Supabase Connection */}
        <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 text-white">
            <div className="p-2.5 rounded-xl bg-accent/10 text-accent">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Supabase PostgreSQL Infrastructure</h3>
              <p className="text-xs text-slate-400">Database, Auth & Storage Layer</p>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 block mb-1">Supabase Project URL</span>
              <div className="font-mono text-slate-200 bg-secondary px-3 py-2 rounded-lg border border-slate-700">
                https://qqionludknbtileytmck.supabase.co
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Project Ref</span>
              <div className="font-mono text-slate-200 bg-secondary px-3 py-2 rounded-lg border border-slate-700">
                qqionludknbtileytmck
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Storage Bucket</span>
              <div className="font-mono text-slate-200 bg-secondary px-3 py-2 rounded-lg border border-slate-700 flex items-center justify-between">
                <span>status-media (Private, RLS Protected)</span>
                <FolderLock className="w-4 h-4 text-accent" />
              </div>
            </div>
          </div>
        </div>

        {/* Application Backend Server */}
        <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 text-white">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Node.js Application Server</h3>
              <p className="text-xs text-slate-400">REST API & Background Workers</p>
            </div>
          </div>

          <div className="space-y-3 text-xs pt-2 border-t border-slate-800/80">
            <div>
              <span className="text-slate-400 block mb-1">Backend Liveness Probe</span>
              <div className="font-mono text-slate-200 bg-secondary px-3 py-2 rounded-lg border border-slate-700 flex items-center justify-between">
                <span>{loading ? 'Checking...' : `Status: ${healthData?.status || 'Active'}`}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${healthData?.status === 'ready' ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Active Messaging Provider</span>
              <div className="font-mono text-slate-200 bg-secondary px-3 py-2 rounded-lg border border-slate-700 uppercase font-bold text-accent">
                {loading ? '...' : (healthData?.activeProvider || 'Mock Adapter / Cloud API')}
              </div>
            </div>

            <div>
              <span className="text-slate-400 block mb-1">Worker Claim RPC</span>
              <div className="font-mono text-slate-200 bg-secondary px-3 py-2 rounded-lg border border-slate-700">
                claim_queue_jobs() (Atomic FOR UPDATE SKIP LOCKED)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Security Architecture Summary */}
      <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center space-x-3 text-white">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Security & Isolation Guarantees</h3>
            <p className="text-xs text-slate-400">Verified policies enforced in production</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-2">
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-slate-200">Zero Client-Trust</h4>
            <p className="text-slate-400">
              `user_id` is never accepted from query or body payloads; derived strictly from cryptographically verified Supabase JWTs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-slate-200">Strict Database RLS</h4>
            <p className="text-slate-400">
              PostgreSQL Row Level Security policies active across campaigns, message_queue, status_updates, and delivery_logs.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1.5">
            <h4 className="font-semibold text-slate-200">Private Media Storage</h4>
            <p className="text-slate-400">
              The `status-media` bucket is non-public with path-isolated authenticated upload and download policies.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
