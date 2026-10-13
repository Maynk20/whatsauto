import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

export const queueRepository = {
  /**
   * Atomic claim using PostgreSQL FOR UPDATE SKIP LOCKED function
   */
  async claimJobs(batchSize = 10) {
    try {
      const { data, error } = await supabaseAdmin.rpc('claim_queue_jobs', {
        p_batch_size: batchSize
      });

      if (error) {
        // If RPC function is not yet deployed to remote Supabase, fallback to direct query
        if (error.code === 'PGRST202' || error.message?.includes('schema cache') || error.message?.includes('Could not find')) {
          const { data: fallbackData } = await supabaseAdmin
            .from('message_queue')
            .select('*')
            .eq('status', 'pending')
            .limit(batchSize);
          return fallbackData || [];
        }

        logger.error('Error claiming queue jobs via RPC', { error: error.message });
        return [];
      }

      return data || [];
    } catch (err) {
      logger.error('Unexpected error in claimJobs', { error: err.message });
      return [];
    }
  },

  async updateJobStatus(jobId, status, { providerMessageId, errorLog, nextAttemptAt, sentAt } = {}) {
    const updatePayload = {
      status,
      updated_at: new Date().toISOString()
    };

    if (providerMessageId !== undefined) updatePayload.provider_message_id = providerMessageId;
    if (errorLog !== undefined) updatePayload.error_log = errorLog;
    if (nextAttemptAt !== undefined) updatePayload.next_attempt_at = nextAttemptAt;
    if (sentAt !== undefined) updatePayload.sent_at = sentAt;

    const { data, error } = await supabaseAdmin
      .from('message_queue')
      .update(updatePayload)
      .eq('id', jobId)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update job status in message_queue', { jobId, error: error.message });
    }

    return { data, error };
  },

  async updateByProviderMessageId(providerMessageId, status) {
    const { data, error } = await supabaseAdmin
      .from('message_queue')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('provider_message_id', providerMessageId);

    return { data, error };
  },

  async listJobs(userId, { status, limit = 50, offset = 0 } = {}) {
    let query = supabaseAdmin
      .from('message_queue')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    return await query;
  },

  async cancelJob(userId, jobId) {
    return await supabaseAdmin
      .from('message_queue')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', jobId)
      .eq('user_id', userId)
      .eq('status', 'pending');
  },

  async createBatch(jobs) {
    return await supabaseAdmin
      .from('message_queue')
      .insert(jobs)
      .select();
  }
};
