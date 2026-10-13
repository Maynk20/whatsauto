/**
 * Interface definition for WhatsApp Provider Adapters.
 * Adapters abstract the actual delivery mechanism (Meta Cloud API, Mock, or Experimental).
 */

export class WhatsAppProviderInterface {
  constructor(name) {
    this.name = name;
  }

  /**
   * Send a direct message to a recipient
   * @param {Object} options - { phoneNumber, message, recipientName, templateName, variables }
   * @returns {Promise<{ success: boolean, providerMessageId?: string, error?: string, isRetryable?: boolean }>}
   */
  async sendMessage(options) {
    throw new Error('sendMessage() must be implemented by adapter');
  }

  /**
   * Publish a status story (if supported by provider)
   * @param {Object} options - { contentType, mediaUrl, caption, bgColor }
   * @returns {Promise<{ success: boolean, providerStatusId?: string, error?: string, isRetryable?: boolean }>}
   */
  async publishStatus(options) {
    throw new Error('publishStatus() must be implemented by adapter');
  }

  /**
   * Verify an incoming webhook signature or handshake token
   * @param {Object} params - { mode, token, challenge, signature, payload }
   * @returns {boolean|string} - challenge string for GET handshake or boolean for POST payload verification
   */
  verifyWebhook(params) {
    throw new Error('verifyWebhook() must be implemented by adapter');
  }

  /**
   * Parse delivery event from webhook
   * @param {Object} payload - Webhook payload
   * @returns {Array<{ providerMessageId: string, status: string, timestamp: string, error?: string }>}
   */
  parseWebhookEvent(payload) {
    throw new Error('parseWebhookEvent() must be implemented by adapter');
  }

  /**
   * Check connection / health state of the provider
   * @returns {Promise<{ isConnected: boolean, details: Object }>}
   */
  async getHealth() {
    throw new Error('getHealth() must be implemented by adapter');
  }
}
