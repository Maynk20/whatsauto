import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export const logsRepository = {
  async recordLog({ userId, jobId, jobType, eventType, status, sanitizedDetails = {} }) {
    try {
      const { data, error } = await supabaseAdmin
        .from('delivery_logs')
        .insert({
          user_id: userId,
          job_id: jobId,
          job_type: jobType,
          event_type: eventType,
          status,
          sanitized_details: sanitizedDetails
        });

      if (error) {
        logger.error('Failed to write delivery log', { error: error.message });
      }

      return { data, error };
    } catch (err) {
      logger.error('Unexpected error recording delivery log', { error: err.message });
      return { error: err };
    }
  },

  async listLogs(userId, { eventType, status, limit = 50, offset = 0 } = {}) {
    let query = supabaseAdmin
      .from('delivery_logs')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (eventType && eventType !== 'all') {
      query = query.eq('event_type', eventType);
    }

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    return await query;
  }
};
