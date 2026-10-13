import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from backend directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',

  supabase: {
    url: process.env.SUPABASE_URL || 'https://qqionludknbtileytmck.supabase.co',
    anonKey: process.env.SUPABASE_ANON_KEY || 'sb_publishable_3qsXJP31bVN8kCmba7N2Yw_FRKZ6Iex',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
  },

  whatsapp: {
    provider: process.env.WHATSAPP_PROVIDER || 'mock',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    wabaId: process.env.WHATSAPP_WABA_ID || '',
    accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
    webhookVerifyToken: process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'whatsauto_webhook_verify_secret_2026'
  },

  worker: {
    pollIntervalMs: parseInt(process.env.WORKER_POLL_INTERVAL_MS || '3000', 10),
    batchSize: parseInt(process.env.WORKER_BATCH_SIZE || '10', 10),
    rateLimitDelayMs: parseInt(process.env.WORKER_RATE_LIMIT_DELAY_MS || '300', 10)
  }
};
