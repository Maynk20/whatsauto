import { supabase } from '../lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function request(endpoint, options = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;

  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    const errorMsg = responseData?.error?.message || responseData?.message || response.statusText;
    const error = new Error(errorMsg);
    error.status = response.status;
    error.data = responseData;
    throw error;
  }

  return responseData;
}

export const api = {
  // System Health
  getHealth: () => request('/health'),
  getReady: () => request('/ready'),

  // Dashboard Stats
  getDashboardStats: () => request('/api/dashboard/stats'),

  // Devices
  getDevices: () => request('/api/devices'),
  connectDevice: (data) => request('/api/devices/connect', { method: 'POST', body: JSON.stringify(data) }),
  disconnectDevice: (id) => request('/api/devices/' + id, { method: 'DELETE' }),

  // Stories
  getStories: (params = '') => request(`/api/stories${params}`),
  scheduleStory: (data) => request('/api/stories', { method: 'POST', body: JSON.stringify(data) }),
  cancelStory: (id) => request(`/api/stories/${id}/cancel`, { method: 'POST' }),

  // Campaigns & Messages
  createCampaign: (data) => request('/api/campaigns', { method: 'POST', body: JSON.stringify(data) }),

  // Queue
  getQueue: (params = '') => request(`/api/queue${params}`),
  cancelQueueJob: (id) => request(`/api/queue/${id}/cancel`, { method: 'POST' }),
  clearCompletedQueue: () => request('/api/queue/clear-completed', { method: 'POST' }),

  // Logs
  getLogs: (params = '') => request(`/api/logs${params}`)
};
