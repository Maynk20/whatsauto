import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export const dashboardService = {
  async getStats(userId) {
    try {
      // 1. Device count
      const { count: connectedDevices } = await supabaseAdmin
        .from('device_sessions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('connection_status', 'connected');

      // 2. Queue metrics
      const { count: pendingQueue } = await supabaseAdmin
        .from('message_queue')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      const { count: totalSent } = await supabaseAdmin
        .from('message_queue')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'sent');

      const { count: totalFailed } = await supabaseAdmin
        .from('message_queue')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'failed');

      // 3. Upcoming Stories
      const { count: upcomingStories } = await supabaseAdmin
        .from('status_updates')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('status', 'pending');

      // 4. Recent activity logs
      const { data: recentActivity } = await supabaseAdmin
        .from('delivery_logs')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      return {
        connectedDevices: connectedDevices || 0,
        pendingQueue: pendingQueue || 0,
        totalSent: totalSent || 0,
        totalFailed: totalFailed || 0,
        upcomingStories: upcomingStories || 0,
        recentActivity: recentActivity || []
      };
    } catch (err) {
      logger.error('Failed to aggregate dashboard stats', { error: err.message, userId });
      throw err;
    }
  }
};
