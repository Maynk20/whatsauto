import { supabaseAdmin } from '../config/supabase.js';

export const deviceRepository = {
  async listByUser(userId) {
    return await supabaseAdmin
      .from('device_sessions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  },

  async upsertSession({ userId, deviceName, provider, phoneNumber, connectionStatus, metadata = {} }) {
    // Check if device with this user & provider already exists
    const { data: existing } = await supabaseAdmin
      .from('device_sessions')
      .select('id')
      .eq('user_id', userId)
      .eq('provider', provider)
      .maybeSingle();

    if (existing) {
      return await supabaseAdmin
        .from('device_sessions')
        .update({
          device_name: deviceName || 'Primary Device',
          phone_number: phoneNumber,
          connection_status: connectionStatus,
          last_heartbeat: new Date().toISOString(),
          metadata,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
    }

    return await supabaseAdmin
      .from('device_sessions')
      .insert({
        user_id: userId,
        device_name: deviceName || 'Primary Device',
        provider,
        phone_number: phoneNumber,
        connection_status: connectionStatus,
        last_heartbeat: new Date().toISOString(),
        metadata
      })
      .select()
      .single();
  },

  async removeSession(userId, id) {
    return await supabaseAdmin
      .from('device_sessions')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
  }
};
