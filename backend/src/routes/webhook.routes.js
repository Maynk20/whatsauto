import express from 'express';
import { getWhatsAppProvider } from '../adapters/index.js';
import { queueRepository } from '../repositories/queue.repository.js';
import { logsRepository } from '../repositories/logs.repository.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * Meta Webhook Handshake Verification
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const provider = getWhatsAppProvider();
  const verifiedChallenge = provider.verifyWebhook({ mode, token, challenge });

  if (verifiedChallenge) {
    logger.info('[Webhook] Meta Webhook handshake verified successfully');
    return res.status(200).send(verifiedChallenge);
  }

  logger.warn('[Webhook] Handshake verification failed: token mismatch');
  return res.sendStatus(403);
});

/**
 * Ingest WhatsApp delivery status receipts and incoming events
 */
router.post('/whatsapp', async (req, res) => {
  // Acknowledge receipt immediately to satisfy Meta's 20-second timeout
  res.status(200).json({ status: 'received' });

  try {
    const provider = getWhatsAppProvider();
    const events = provider.parseWebhookEvent(req.body);

    for (const event of events) {
      const { providerMessageId, status, timestamp, error } = event;
      if (!providerMessageId) continue;

      logger.info('[Webhook] Processing delivery event', { providerMessageId, status });

      // Look up existing queue job with this provider_message_id
      const { data: job } = await supabaseAdmin
        .from('message_queue')
        .select('id, user_id, status')
        .eq('provider_message_id', providerMessageId)
        .maybeSingle();

      if (job) {
        // Update job status if confirmed sent or failed
        let newStatus = job.status;
        if (status === 'delivered' || status === 'read') {
          newStatus = 'sent';
        } else if (status === 'failed') {
          newStatus = 'failed';
        }

        await queueRepository.updateJobStatus(job.id, newStatus, {
          errorLog: error || null
        });

        // Record audit event
        await logsRepository.recordLog({
          userId: job.user_id,
          jobId: job.id,
          jobType: 'message',
          eventType: status === 'failed' ? 'failed' : 'delivered',
          status,
          sanitizedDetails: {
            providerMessageId,
            receiptTimestamp: timestamp,
            error: error || null
          }
        });
      }
    }
  } catch (err) {
    logger.error('[Webhook] Failed to process incoming webhook event', { error: err.message });
  }
});

export default router;
