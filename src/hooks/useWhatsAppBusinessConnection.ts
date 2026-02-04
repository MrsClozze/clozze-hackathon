import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface WhatsAppBusinessConnection {
  id: string;
  phone_number_id: string;
  business_phone_number: string | null;
  is_connected: boolean;
  connected_at: string | null;
}

export function useWhatsAppBusinessConnection() {
  const { user } = useAuth();
  const [connection, setConnection] = useState<WhatsAppBusinessConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('whatsapp_business_connections')
        .select('id, phone_number_id, business_phone_number, is_connected, connected_at')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .maybeSingle();

      if (fetchError) throw fetchError;
      setConnection(data);
    } catch (err) {
      console.error('Error fetching WhatsApp Business connection:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch connection'));
    } finally {
      setLoading(false);
    }
  }, [user]);

  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      const { error: deleteError } = await supabase
        .from('whatsapp_business_connections')
        .delete()
        .eq('user_id', user.id);

      if (deleteError) throw deleteError;
      setConnection(null);
    } catch (err) {
      console.error('Error disconnecting WhatsApp Business:', err);
      throw err;
    }
  }, [user]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    isConnected: !!connection?.is_connected,
    businessPhone: connection?.business_phone_number || connection?.phone_number_id || null,
    loading,
    error,
    refresh: fetchConnection,
    disconnect,
  };
}
