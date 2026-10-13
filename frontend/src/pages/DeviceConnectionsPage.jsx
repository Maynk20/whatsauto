import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import {
  Smartphone,
  ShieldCheck,
  Plus,
  Trash2,
  RefreshCw,
  QrCode,
  AlertTriangle,
  Info
} from 'lucide-react';

export function DeviceConnectionsPage() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [providerChoice, setProviderChoice] = useState('cloud_api');
  const [deviceName, setDeviceName] = useState('Primary Device');
  const [pairingResult, setPairingResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await api.getDevices();
      if (res.success) {
        setDevices(res.data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const handleConnect = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.connectDevice({
        deviceName,
        provider: providerChoice
      });
      if (res.success) {
        setPairingResult(res.data);
        fetchDevices();
      }
    } catch (err) {
      setError(err.message || 'Failed to initiate connection');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (id) => {
    if (!confirm('Are you sure you want to disconnect this device session?')) return;
    try {
      await api.disconnectDevice(id);
      fetchDevices();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-8">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">Device Connections</h2>
          <p className="text-sm text-slate-400 mt-1">Manage active WhatsApp endpoints and provider connectivity states</p>
        </div>
        <button
          onClick={() => { setPairingModalOpen(true); setPairingResult(null); }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover text-slate-950 font-semibold text-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Device</span>
        </button>
      </div>

      {/* Security Note */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-accent shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-slate-200">Credential Protection: </span>
          Session tokens and API secrets are strictly confined to backend encrypted server storage.
          No raw credentials or pairing session files are ever transferred to or stored within the frontend bundle.
        </div>
      </div>

      {/* Devices List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-xs text-slate-500">Loading devices...</div>
        ) : devices.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-card border border-slate-800 rounded-2xl p-8">
            <Smartphone className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-300">No devices connected yet</p>
            <p className="text-xs text-slate-500 mt-1">Click "Connect New Device" to pair an official Cloud API or experimental session.</p>
          </div>
        ) : (
          devices.map((device) => (
            <div key={device.id} className="bg-card border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-secondary text-accent">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-white">{device.device_name}</h4>
                    <p className="text-[11px] text-slate-400 uppercase tracking-wide">{device.provider.replace('_', ' ')}</p>
                  </div>
                </div>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                  device.connection_status === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                  device.connection_status === 'connecting' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                  'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                }`}>
                  {device.connection_status}
                </span>
              </div>

              <div className="text-xs text-slate-400 space-y-1 pt-2 border-t border-slate-800/80">
                <div className="flex justify-between">
                  <span>Phone Number:</span>
                  <span className="text-slate-200 font-mono">{device.phone_number || 'Default Sender ID'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Last Heartbeat:</span>
                  <span className="text-slate-200">
                    {device.last_heartbeat ? new Date(device.last_heartbeat).toLocaleTimeString() : 'N/A'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleDisconnect(device.id)}
                className="w-full py-2 px-3 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold flex items-center justify-center space-x-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Disconnect Device</span>
              </button>
            </div>
          ))
        )}
      </div>

      {/* Connect Modal */}
      {pairingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-card border border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-5">
            <h3 className="text-lg font-bold text-white">Connect WhatsApp Session</h3>

            {error && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                {error}
              </div>
            )}

            {!pairingResult ? (
              <form onSubmit={handleConnect} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Device Label</label>
                  <input
                    type="text"
                    required
                    value={deviceName}
                    onChange={(e) => setDeviceName(e.target.value)}
                    className="w-full px-3.5 py-2 bg-secondary border border-slate-700 rounded-lg text-sm text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Integration Provider</label>
                  <select
                    value={providerChoice}
                    onChange={(e) => setProviderChoice(e.target.value)}
                    className="w-full px-3.5 py-2 bg-secondary border border-slate-700 rounded-lg text-sm text-white"
                  >
                    <option value="cloud_api">Official Meta Cloud API (Production)</option>
                    <option value="baileys_experimental">Experimental Web Session</option>
                  </select>
                </div>

                <div className="flex items-center justify-end space-x-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setPairingModalOpen(false)}
                    className="px-4 py-2 rounded-lg bg-secondary text-slate-400 hover:text-white text-xs font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-slate-950 text-xs font-semibold"
                  >
                    {submitting ? 'Connecting...' : 'Initiate Session'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 text-center">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 space-y-2">
                  <p className="font-semibold text-white">{pairingResult.message}</p>
                  {pairingResult.pairingCode && (
                    <div className="my-3">
                      <p className="text-[11px] text-slate-400">One-Time Pairing Code:</p>
                      <div className="text-xl font-mono font-bold tracking-widest text-accent bg-secondary py-2 rounded-lg mt-1">
                        {pairingResult.pairingCode}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setPairingModalOpen(false)}
                  className="w-full py-2.5 rounded-xl bg-accent text-slate-950 font-semibold text-xs"
                >
                  Close & View Sessions
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
