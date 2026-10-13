import express from 'express';
import { supabaseAdmin } from '../config/supabase.js';
import { getWhatsAppProvider } from '../adapters/index.js';

const router = express.Router();
const startTime = Date.now();

router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString()
  });
});

router.get('/ready', async (req, res) => {
  let dbStatus = 'healthy';
  try {
    const { error } = await supabaseAdmin.from('campaigns').select('id').limit(1);
    if (error && error.code !== 'PGRST116') {
      dbStatus = 'degraded';
    }
  } catch {
    dbStatus = 'unreachable';
  }

  const provider = getWhatsAppProvider();
  const providerHealth = await provider.getHealth();

  res.json({
    status: dbStatus === 'healthy' ? 'ready' : 'degraded',
    database: dbStatus,
    activeProvider: provider.name,
    providerHealth: providerHealth.details,
    timestamp: new Date().toISOString()
  });
});

export default router;
