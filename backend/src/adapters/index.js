import { config } from '../config/env.js';
import { MockWhatsAppAdapter } from './mock.adapter.js';
import { WhatsAppCloudAdapter } from './cloudApi.adapter.js';
import { logger } from '../utils/logger.js';

let activeProviderInstance = null;

export function getWhatsAppProvider() {
  if (activeProviderInstance) {
    return activeProviderInstance;
  }

  const providerType = config.whatsapp.provider;
  logger.info(`Initializing WhatsApp Provider adapter: ${providerType}`);

  switch (providerType) {
    case 'cloud_api':
      activeProviderInstance = new WhatsAppCloudAdapter({
        phoneNumberId: config.whatsapp.phoneNumberId,
        wabaId: config.whatsapp.wabaId,
        accessToken: config.whatsapp.accessToken,
        webhookVerifyToken: config.whatsapp.webhookVerifyToken
      });
      break;

    case 'mock':
    default:
      activeProviderInstance = new MockWhatsAppAdapter();
      break;
  }

  return activeProviderInstance;
}

// For unit testing overrides
export function setWhatsAppProvider(adapter) {
  activeProviderInstance = adapter;
}
