import { QueueWorker } from './queue.worker.js';
import { StorySchedulerWorker } from './scheduler.worker.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

let isShuttingDown = false;

export async function recoverStaleJobs() {
  try {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Reset messages stuck in 'processing' status
    const { data: recoveredMessages, error: msgError } = await supabaseAdmin
      .from('message_queue')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo)
      .select('id');

    if (recoveredMessages?.length > 0) {
      logger.warn(`[StaleRecovery] Recovered ${recoveredMessages.length} stale message jobs`);
    }

    // Reset stories stuck in 'processing' status
    const { data: recoveredStories } = await supabaseAdmin
      .from('status_updates')
      .update({ status: 'pending', updated_at: new Date().toISOString() })
      .eq('status', 'processing')
      .lt('updated_at', tenMinutesAgo)
      .select('id');

    if (recoveredStories?.length > 0) {
      logger.warn(`[StaleRecovery] Recovered ${recoveredStories.length} stale status update jobs`);
    }
  } catch (err) {
    logger.error('[StaleRecovery] Error running stale job recovery', { error: err.message });
  }
}

export function startWorkers() {
  const queueWorker = new QueueWorker();
  const storyWorker = new StorySchedulerWorker();
  let loopTimeout = null;
  let recoveryInterval = null;

  logger.info('[Workers] Initializing background workers loop', {
    pollIntervalMs: config.worker.pollIntervalMs,
    batchSize: config.worker.batchSize
  });

  // Run initial stale recovery and schedule every 5 minutes
  recoverStaleJobs();
  recoveryInterval = setInterval(recoverStaleJobs, 5 * 60 * 1000);

  async function workerCycle() {
    if (isShuttingDown) return;

    try {
      await queueWorker.processBatch();
      await storyWorker.processBatch();
    } catch (err) {
      logger.error('[Workers] Unhandled error during worker cycle', { error: err.message });
    } finally {
      if (!isShuttingDown) {
        loopTimeout = setTimeout(workerCycle, config.worker.pollIntervalMs);
      }
    }
  }

  // Kick off first cycle
  workerCycle();

  function shutdown() {
    logger.info('[Workers] Graceful shutdown initiated. Completing active tasks...');
    isShuttingDown = true;
    if (loopTimeout) clearTimeout(loopTimeout);
    if (recoveryInterval) clearInterval(recoveryInterval);
  }

  return { shutdown };
}

// Standalone execution if invoked directly via `node src/workers/index.js`
if (process.argv[1]?.endsWith('workers/index.js')) {
  const { shutdown } = startWorkers();
  process.on('SIGINT', () => { shutdown(); process.exit(0); });
  process.on('SIGTERM', () => { shutdown(); process.exit(0); });
}
