import { queueRepository } from '../repositories/queue.repository.js';
import { supabaseAdmin } from '../config/supabase.js';

export const queueService = {
  async getQueue(userId, options) {
    const { data, count, error } = await queueRepository.listJobs(userId, options);
    if (error) throw { status: 500, message: error.message };
    return { jobs: data, total: count };
  },

  async cancelQueueJob(userId, jobId) {
    const { data, error } = await queueRepository.cancelJob(userId, jobId);
    if (error) throw { status: 500, message: error.message };
    return { success: true };
  },

  async clearCompleted(userId) {
    const { data, error } = await supabaseAdmin
      .from('message_queue')
      .delete()
      .eq('user_id', userId)
      .in('status', ['sent', 'cancelled']);

    if (error) throw { status: 500, message: error.message };
    return { success: true };
  }
};
