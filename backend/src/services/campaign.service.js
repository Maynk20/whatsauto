import { supabaseAdmin } from '../config/supabase.js';
import { normalizePhoneNumber, substituteTemplate } from '../utils/phoneValidator.js';
import { queueRepository } from '../repositories/queue.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import { logger } from '../utils/logger.js';

export const campaignService = {
  async createCampaign(userId, { name, description, template, recipients = [], scheduledAt = null }) {
    if (!name || typeof name !== 'string') {
      throw { status: 400, message: 'Campaign name is required' };
    }

    if (!template || typeof template !== 'string') {
      throw { status: 400, message: 'Message template is required' };
    }

    if (!Array.isArray(recipients) || recipients.length === 0) {
      throw { status: 400, message: 'At least one recipient is required' };
    }

    // 1. Process and validate recipients
    const validJobs = [];
    const validationErrors = [];
    const seenNumbers = new Set();

    for (let i = 0; i < recipients.length; i++) {
      const item = recipients[i];
      const rawNumber = item.phoneNumber || item.phone || item.number || '';
      const recipientName = item.recipientName || item.name || '';

      const { isValid, normalized, error } = normalizePhoneNumber(rawNumber);
      if (!isValid) {
        validationErrors.push({ row: i + 1, rawNumber, error });
        continue;
      }

      if (seenNumbers.has(normalized)) {
        validationErrors.push({ row: i + 1, rawNumber, error: 'Duplicate number in batch' });
        continue;
      }
      seenNumbers.add(normalized);

      // Template variable substitution
      const finalMessage = substituteTemplate(template, {
        name: recipientName || 'Customer',
        phone: normalized,
        ...item
      });

      // Idempotency key per campaign + number
      const idempotencyKey = `camp_${Date.now()}_${normalized}`;

      validJobs.push({
        user_id: userId,
        phone_number: normalized,
        recipient_name: recipientName || null,
        final_message: finalMessage,
        status: 'pending',
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null,
        idempotency_key: idempotencyKey,
        attempt_count: 0,
        max_attempts: 3
      });
    }

    if (validJobs.length === 0) {
      throw {
        status: 400,
        message: 'No valid recipients could be processed',
        details: validationErrors
      };
    }

    // 2. Create Campaign header record
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .insert({
        user_id: userId,
        name,
        description: description || null,
        status: scheduledAt ? 'scheduled' : 'processing',
        total_recipients: validJobs.length
      })
      .select()
      .single();

    if (campaignError) {
      logger.error('Failed to create campaign record', { error: campaignError.message });
      throw { status: 500, message: 'Could not create campaign' };
    }

    // Attach campaign_id to jobs
    validJobs.forEach(job => {
      job.campaign_id = campaign.id;
    });

    // 3. Batch insert into message_queue
    const { data: insertedJobs, error: queueError } = await queueRepository.createBatch(validJobs);

    if (queueError) {
      logger.error('Failed to batch insert into message_queue', { error: queueError.message });
      throw { status: 500, message: 'Failed to enqueue message jobs' };
    }

    // 4. Record audit log
    await logsRepository.recordLog({
      userId,
      jobId: campaign.id,
      jobType: 'message',
      eventType: 'queued',
      status: 'pending',
      sanitizedDetails: {
        campaignName: name,
        queuedCount: validJobs.length,
        skippedErrorsCount: validationErrors.length
      }
    });

    return {
      campaign,
      totalQueued: validJobs.length,
      skippedErrors: validationErrors
    };
  }
};
