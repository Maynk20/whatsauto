import { deviceRepository } from '../repositories/device.repository.js';
import { getWhatsAppProvider } from '../adapters/index.js';

export const deviceService = {
  async getDevices(userId) {
    const { data, error } = await deviceRepository.listByUser(userId);
    if (error) throw { status: 500, message: error.message };
    return data;
  },

  async initiateConnection(userId, { deviceName, provider = 'cloud_api', phoneNumber }) {
    const providerInstance = getWhatsAppProvider();
    const health = await providerInstance.getHealth();

    // Generate pairing code or session state
    const pairingCode = Math.random().toString(36).substring(2, 6).toUpperCase() + '-' +
                        Math.random().toString(36).substring(2, 6).toUpperCase();

    const { data, error } = await deviceRepository.upsertSession({
      userId,
      deviceName: deviceName || 'WhatsApp Session',
      provider,
      phoneNumber: phoneNumber || null,
      connectionStatus: provider === 'mock' ? 'connected' : 'connecting',
      metadata: {
        pairingCode,
        initiatedAt: new Date().toISOString(),
        providerHealth: health
      }
    });

    if (error) throw { status: 500, message: error.message };

    return {
      session: data,
      pairingCode: provider !== 'cloud_api' ? pairingCode : null,
      message: provider === 'cloud_api'
        ? 'Official Cloud API active. Connect via Meta App Dashboard credentials.'
        : 'Session created. Enter pairing code or scan QR.'
    };
  },

  async disconnectDevice(userId, deviceId) {
    const { data, error } = await deviceRepository.removeSession(userId, deviceId);
    if (error) throw { status: 500, message: error.message };
    return { success: true };
  }
};
