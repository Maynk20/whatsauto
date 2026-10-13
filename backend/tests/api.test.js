import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('API - GET /health returns 200 and healthy status', async () => {
  const app = createApp();
  const res = await request(app).get('/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'healthy');
  assert.ok(typeof res.body.uptimeSeconds === 'number');
});

test('API - Protected route /api/dashboard/stats rejects unauthenticated requests', async () => {
  const app = createApp();
  const res = await request(app).get('/api/dashboard/stats');

  assert.equal(res.status, 401);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'UNAUTHORIZED');
});

test('API - 404 handler for unknown routes', async () => {
  const app = createApp();
  const res = await request(app).get('/api/some-invalid-route');

  assert.equal(res.status, 404);
  assert.equal(res.body.success, false);
  assert.equal(res.body.error.code, 'NOT_FOUND');
});
