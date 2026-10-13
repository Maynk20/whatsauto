import test from 'node:test';
import assert from 'node:assert/strict';
import { MockWhatsAppAdapter } from '../src/adapters/mock.adapter.js';
import { WhatsAppCloudAdapter } from '../src/adapters/cloudApi.adapter.js';

test('MockWhatsAppAdapter - successful message sending', async () => {
  const adapter = new MockWhatsAppAdapter();
  const res = await adapter.sendMessage({
    phoneNumber: '919876543210',
    message: 'Hello World'
  });

  assert.equal(res.success, true);
  assert.ok(res.providerMessageId.startsWith('mock_wamid_'));
  assert.equal(adapter.sentMessages.length, 1);
});

test('MockWhatsAppAdapter - retryable and permanent error simulations', async () => {
  const adapter = new MockWhatsAppAdapter();

  // Retryable test (ends with 999)
  const retryRes = await adapter.sendMessage({
    phoneNumber: '919876543999',
    message: 'Retry test'
  });
  assert.equal(retryRes.success, false);
  assert.equal(retryRes.isRetryable, true);

  // Permanent failure test (ends with 000)
  const permRes = await adapter.sendMessage({
    phoneNumber: '919876543000',
    message: 'Permanent failure test'
  });
  assert.equal(permRes.success, false);
  assert.equal(permRes.isRetryable, false);
});

test('WhatsAppCloudAdapter - story publishing explicit unsupported error', async () => {
  const cloudAdapter = new WhatsAppCloudAdapter();
  const res = await cloudAdapter.publishStatus({
    contentType: 'image',
    mediaUrl: 'test.jpg'
  });

  assert.equal(res.success, false);
  assert.equal(res.isRetryable, false);
  assert.match(res.error, /Official WhatsApp Business Cloud API does not support/i);
});

test('MockWhatsAppAdapter - webhook verification handshake', () => {
  const adapter = new MockWhatsAppAdapter();
  const challenge = adapter.verifyWebhook({
    mode: 'subscribe',
    token: 'whatsauto_webhook_verify_secret_2026',
    challenge: 'challenge_code_123'
  });

  assert.equal(challenge, 'challenge_code_123');

  const invalidChallenge = adapter.verifyWebhook({
    mode: 'subscribe',
    token: 'wrong_secret',
    challenge: 'challenge_code_123'
  });
  assert.equal(invalidChallenge, null);
});
