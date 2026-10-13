import { queueRepository } from '../repositories/queue.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import { getWhatsAppProvider } from '../adapters/index.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/env.js';

export class QueueWorker {
  constructor() {
    this.isRunning = false;
    this.batchSize = config.worker.batchSize;
    this.rateLimitDelayMs = config.worker.rateLimitDelayMs;
  }

  async processBatch() {
    // 1. Atomically claim pending jobs
    const jobs = await queueRepository.claimJobs(this.batchSize);
    if (!jobs || jobs.length === 0) {
      return 0;
    }

    logger.info(`[QueueWorker] Claimed ${jobs.length} jobs for processing`);
    const provider = getWhatsAppProvider();

    for (const job of jobs) {
      try {
        // Enforce rate limiting delay between message dispatches
        if (this.rateLimitDelayMs > 0) {
          await new Promise(r => setTimeout(r, this.rateLimitDelayMs));
        }

        logger.info(`[QueueWorker] Dispatching message job ${job.id}`, { phone: job.phone_number });

        const result = await provider.sendMessage({
          phoneNumber: job.phone_number,
          message: job.final_message,
          recipientName: job.recipient_name
        });

        if (result.success) {
          // Success: Mark as sent
          await queueRepository.updateJobStatus(job.id, 'sent', {
            providerMessageId: result.providerMessageId,
            sentAt: new Date().toISOString()
          });

          await logsRepository.recordLog({
            userId: job.user_id,
            jobId: job.id,
            jobType: 'message',
            eventType: 'delivered',
            status: 'sent',
            sanitizedDetails: {
              providerMessageId: result.providerMessageId,
              phoneNumber: job.phone_number
            }
          });
        } else {
          // Failure handling
          const isRetryable = result.isRetryable && job.attempt_count < job.max_attempts;

          if (isRetryable) {
            // Exponential backoff: 10s * (2 ^ attempt_count)
            const backoffSeconds = Math.min(10 * Math.pow(2, job.attempt_count), 300);
            const nextAttempt = new Date(Date.now() + backoffSeconds * 1000).toISOString();

            logger.warn(`[QueueWorker] Job ${job.id} failed with retryable error. Rescheduling in ${backoffSeconds}s`, {
              error: result.error,
              attempt: job.attempt_count
            });

            await queueRepository.updateJobStatus(job.id, 'pending', {
              errorLog: result.error,
              nextAttemptAt: nextAttempt
            });

            await logsRepository.recordLog({
              userId: job.user_id,
              jobId: job.id,
              jobType: 'message',
              eventType: 'attempted',
              status: 'pending',
              sanitizedDetails: {
                error: result.error,
                nextAttemptAt: nextAttempt,
                attemptCount: job.attempt_count
              }
            });
          } else {
            // Terminal failure
            logger.error(`[QueueWorker] Job ${job.id} failed permanently`, { error: result.error });

            await queueRepository.updateJobStatus(job.id, 'failed', {
              errorLog: result.error
            });

            await logsRepository.recordLog({
              userId: job.user_id,
              jobId: job.id,
              jobType: 'message',
              eventType: 'failed',
              status: 'failed',
              sanitizedDetails: {
                error: result.error,
                attemptCount: job.attempt_count
              }
            });
          }
        }
      } catch (jobErr) {
        logger.error(`[QueueWorker] Unexpected exception processing job ${job.id}`, { error: jobErr.message });
        await queueRepository.updateJobStatus(job.id, 'failed', {
          errorLog: `Worker execution exception: ${jobErr.message}`
        });
      }
    }

    return jobs.length;
  }
}
