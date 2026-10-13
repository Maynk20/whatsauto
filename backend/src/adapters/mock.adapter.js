import { WhatsAppProviderInterface } from './provider.interface.js';
import { logger } from '../utils/logger.js';

/**
 * Mock Adapter for local development, automated testing, and CI.
 * Does not contact external Meta APIs.
 */
export class MockWhatsAppAdapter extends WhatsAppProviderInterface {
  constructor() {
    super('mock');
    this.sentMessages = [];
    this.publishedStatuses = [];
  }

  async sendMessage({ phoneNumber, message, recipientName }) {
    logger.info('[MockAdapter] Simulating sendMessage', { phoneNumber, length: message.length });

    // Deterministic failure triggers for automated tests:
    // Numbers ending in 999 simulate retryable rate-limit failure
    if (phoneNumber.endsWith('999')) {
      return {
        success: false,
        error: 'Simulated temporary provider 429 rate limit exceeded',
        isRetryable: true
      };
    }

    // Numbers ending in 000 simulate permanent unrecoverable failure
    if (phoneNumber.endsWith('000')) {
      return {
        success: false,
        error: 'Simulated permanent invalid recipient phone number',
        isRetryable: false
      };
    }

    const providerMessageId = `mock_wamid_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.sentMessages.push({
      providerMessageId,
      phoneNumber,
      message,
      sentAt: new Date().toISOString()
    });

    return {
      success: true,
      providerMessageId,
      status: 'sent'
    };
  }

  async publishStatus({ contentType, mediaUrl, caption, bgColor }) {
    logger.info('[MockAdapter] Simulating publishStatus', { contentType, bgColor });

    const providerStatusId = `mock_status_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.publishedStatuses.push({
      providerStatusId,
      contentType,
      mediaUrl,
      caption,
      bgColor,
      publishedAt: new Date().toISOString()
    });

    return {
      success: true,
      providerStatusId,
      status: 'published'
    };
  }

  verifyWebhook({ mode, token, challenge }) {
    if (mode === 'subscribe' && token === 'whatsauto_webhook_verify_secret_2026') {
      return challenge;
    }
    return null;
  }

  parseWebhookEvent(payload) {
    if (!payload?.entry) return [];
    const events = [];

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        for (const status of change.value?.statuses || []) {
          events.push({
            providerMessageId: status.id,
            status: status.status, // sent, delivered, read, failed
            timestamp: new Date(parseInt(status.timestamp, 10) * 1000).toISOString(),
            error: status.errors?.[0]?.message
          });
        }
      }
    }

    return events;
  }

  async getHealth() {
    return {
      isConnected: true,
      details: {
        provider: 'mock',
        status: 'ready',
        messagesSent: this.sentMessages.length,
        statusesPublished: this.publishedStatuses.length
      }
    };
  }
}
