import { statusRepository } from '../repositories/status.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import { logger } from '../utils/logger.js';

const ALLOWED_CONTENT_TYPES = ['text', 'image', 'video'];
const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;

export const storyService = {
  async scheduleStory(userId, { contentType, mediaPath, caption, bgColor, scheduledAt }) {
    if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
      throw { status: 400, message: `Invalid content type. Must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}` };
    }

    if ((contentType === 'image' || contentType === 'video') && !mediaPath) {
      throw { status: 400, message: 'Media path is required for image and video stories' };
    }

    const validatedColor = bgColor && HEX_COLOR_REGEX.test(bgColor) ? bgColor : '#128C7E';

    if (!scheduledAt) {
      throw { status: 400, message: 'scheduledAt timestamp is required' };
    }

    const scheduleDate = new Date(scheduledAt);
    if (isNaN(scheduleDate.getTime())) {
      throw { status: 400, message: 'Invalid scheduledAt timestamp format' };
    }

    const { data: story, error } = await statusRepository.create({
      user_id: userId,
      content_type: contentType,
      media_path: mediaPath || null,
      caption: caption ? caption.trim() : null,
      bg_color: validatedColor,
      scheduled_at: scheduleDate.toISOString(),
      status: 'pending'
    });

    if (error) {
      logger.error('Failed to schedule story', { error: error.message, userId });
      throw { status: 500, message: 'Failed to record scheduled story' };
    }

    // Record audit log
    await logsRepository.recordLog({
      userId,
      jobId: story.id,
      jobType: 'status_update',
      eventType: 'queued',
      status: 'pending',
      sanitizedDetails: {
        contentType,
        scheduledAt: scheduleDate.toISOString()
      }
    });

    return story;
  },

  async listStories(userId, options) {
    const { data, error } = await statusRepository.listByUser(userId, options);
    if (error) throw { status: 500, message: error.message };
    return data;
  },

  async cancelStory(userId, id) {
    const { data, error } = await statusRepository.cancel(userId, id);
    if (error) throw { status: 500, message: error.message };
    return { success: true, message: 'Story cancelled successfully' };
  }
};
