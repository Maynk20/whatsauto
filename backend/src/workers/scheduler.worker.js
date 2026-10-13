import { statusRepository } from '../repositories/status.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import { getWhatsAppProvider } from '../adapters/index.js';
import { logger } from '../utils/logger.js';

export class StorySchedulerWorker {
  constructor() {
    this.batchSize = 5;
  }

  async processBatch() {
    // 1. Claim eligible pending stories that reached their scheduled_at time
    const stories = await statusRepository.claimStatusJobs(this.batchSize);
    if (!stories || stories.length === 0) {
      return 0;
    }

    logger.info(`[StorySchedulerWorker] Claimed ${stories.length} scheduled stories`);
    const provider = getWhatsAppProvider();

    for (const story of stories) {
      try {
        const result = await provider.publishStatus({
          contentType: story.content_type,
          mediaUrl: story.media_path,
          caption: story.caption,
          bgColor: story.bg_color
        });

        if (result.success) {
          logger.info(`[StorySchedulerWorker] Story ${story.id} published successfully`);
          await statusRepository.updateStatusJob(story.id, 'published');

          await logsRepository.recordLog({
            userId: story.user_id,
            jobId: story.id,
            jobType: 'status_update',
            eventType: 'delivered',
            status: 'published',
            sanitizedDetails: {
              contentType: story.content_type,
              providerStatusId: result.providerStatusId
            }
          });
        } else {
          logger.warn(`[StorySchedulerWorker] Story ${story.id} failed: ${result.error}`);
          await statusRepository.updateStatusJob(story.id, 'failed', result.error);

          await logsRepository.recordLog({
            userId: story.user_id,
            jobId: story.id,
            jobType: 'status_update',
            eventType: 'failed',
            status: 'failed',
            sanitizedDetails: {
              error: result.error
            }
          });
        }
      } catch (err) {
        logger.error(`[StorySchedulerWorker] Exception processing story ${story.id}`, { error: err.message });
        await statusRepository.updateStatusJob(story.id, 'failed', err.message);
      }
    }

    return stories.length;
  }
}
