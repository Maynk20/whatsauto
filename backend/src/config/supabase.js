import { createClient } from '@supabase/supabase-js';
import { config } from './env.js';
import { logger } from '../utils/logger.js';

if (!config.supabase.url || !config.supabase.anonKey) {
  logger.error('CRITICAL: Supabase URL or Anon Key is missing from environment.');
}

// Admin client used by background workers and secure server-side operations
export const supabaseAdmin = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  }
);

// Helper to create a client scoped with the user's JWT to leverage RLS policies
export function createUserClient(jwtToken) {
  return createClient(config.supabase.url, config.supabase.anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
