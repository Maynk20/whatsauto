import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export const statusRepository = {
  /**
   * Atomic claim of pending due status updates using RPC
   */
  async claimStatusJobs(batchSize = 5) {
    try {
      const { data, error } = await supabaseAdmin.rpc('claim_status_jobs', {
        p_batch_size: batchSize
      });

      if (error) {
        // If RPC function is not yet deployed to remote Supabase, fallback to direct query
        if (error.code === 'PGRST202' || error.message?.includes('schema cache') || error.message?.includes('Could not find')) {
          const { data: fallbackData } = await supabaseAdmin
            .from('status_updates')
            .select('*')
            .eq('status', 'pending')
            .limit(batchSize);
          return fallbackData || [];
        }

        logger.error('Error claiming status jobs via RPC', { error: error.message });
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Unexpected error in claimStatusJobs', { error: err.message });
      return [];
    }
  },

  async updateStatusJob(id, status, errorMessage = null) {
    return await supabaseAdmin
      .from('status_updates')
      .update({
        status,
        error_message: errorMessage,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);
  },

  async create(storyData) {
    return await supabaseAdmin
      .from('status_updates')
      .insert(storyData)
      .select()
      .single();
  },

  async listByUser(userId, { limit = 50, offset = 0 } = {}) {
    return await supabaseAdmin
      .from('status_updates')
      .select('*')
      .eq('user_id', userId)
      .order('scheduled_at', { ascending: false })
      .range(offset, offset + limit - 1);
  },

  async cancel(userId, id) {
    return await supabaseAdmin
      .from('status_updates')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .eq('status', 'pending');
  }
};
