import { WhatsAppProviderInterface } from './provider.interface.js';
import { logger } from '../utils/logger.js';
import crypto from 'crypto';

/**
 * Production Adapter for official Meta WhatsApp Business Cloud API (Graph API v20.0).
 */
export class WhatsAppCloudAdapter extends WhatsAppProviderInterface {
  constructor(config = {}) {
    super('cloud_api');
    this.phoneNumberId = config.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.wabaId = config.wabaId || process.env.WHATSAPP_WABA_ID;
    this.accessToken = config.accessToken || process.env.WHATSAPP_ACCESS_TOKEN;
    this.webhookVerifyToken = config.webhookVerifyToken || process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    this.graphApiVersion = 'v20.0';
    this.baseUrl = `https://graph.facebook.com/${this.graphApiVersion}`;
  }

  async sendMessage({ phoneNumber, message, recipientName, templateName }) {
    if (!this.phoneNumberId || !this.accessToken) {
      return {
        success: false,
        error: 'WhatsApp Cloud API credentials not configured (WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_ACCESS_TOKEN missing)',
        isRetryable: false
      };
    }

    try {
      const url = `${this.baseUrl}/${this.phoneNumberId}/messages`;
      
      // WhatsApp Cloud API payload
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: phoneNumber,
        type: 'text',
        text: {
          preview_url: false,
          body: message
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const responseData = await response.json();

      if (!response.ok) {
        const errorCode = responseData.error?.code;
        const errorSubcode = responseData.error?.error_subcode;
        const errorMessage = responseData.error?.message || response.statusText;

        // Classify retryable vs permanent errors
        // Meta rate limits: 130429, 80007; temporary server issues: 500, 503
        const isRetryable = response.status === 429 ||
          response.status >= 500 ||
          errorCode === 130429 ||
          errorCode === 80007;

        logger.warn('[CloudAPI] Send message failed', {
          status: response.status,
          errorCode,
          errorSubcode,
          errorMessage
        });

        return {
          success: false,
          error: `Meta Cloud API error (${errorCode || response.status}): ${errorMessage}`,
          isRetryable
        };
      }

      const providerMessageId = responseData.messages?.[0]?.id;
      return {
        success: true,
        providerMessageId,
        status: 'sent'
      };
    } catch (err) {
      logger.error('[CloudAPI] Network error while sending message', { error: err.message });
      return {
        success: false,
        error: `Network error: ${err.message}`,
        isRetryable: true
      };
    }
  }

  async publishStatus({ contentType, mediaUrl, caption, bgColor }) {
    // Official WhatsApp Business Platform does NOT support story/status publishing
    logger.warn('[CloudAPI] Attempted status publishing on official Cloud API');
    return {
      success: false,
      error: 'Official WhatsApp Business Cloud API does not support status/story publishing. Please configure the experimental web session adapter or use manual reminder workflow.',
      isRetryable: false
    };
  }

  verifyWebhook({ mode, token, challenge }) {
    if (mode === 'subscribe' && token === this.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  verifyPayloadSignature(rawPayload, signatureHeader, appSecret) {
    if (!signatureHeader || !appSecret) return false;
    const [algorithm, signature] = signatureHeader.split('=');
    if (algorithm !== 'sha256') return false;

    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(rawPayload)
      .digest('hex');

    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
  }

  parseWebhookEvent(payload) {
    if (!payload?.entry) return [];
    const events = [];

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          for (const status of change.value?.statuses || []) {
            events.push({
              providerMessageId: status.id,
              recipientId: status.recipient_id,
              status: status.status, // sent, delivered, read, failed
              timestamp: new Date(parseInt(status.timestamp, 10) * 1000).toISOString(),
              error: status.errors?.[0]?.message
            });
          }
        }
      }
    }

    return events;
  }

  async getHealth() {
    const isConfigured = Boolean(this.phoneNumberId && this.accessToken);
    return {
      isConnected: isConfigured,
      details: {
        provider: 'cloud_api',
        phoneNumberIdConfigured: Boolean(this.phoneNumberId),
        accessTokenConfigured: Boolean(this.accessToken)
      }
    };
  }
}
