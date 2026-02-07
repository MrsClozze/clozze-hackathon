import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FubConnection {
  id: string;
  is_connected: boolean;
  connected_at: string | null;
  refresh_token_encrypted: string | null;
}

export function useFollowUpBossConnection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connection, setConnection] = useState<FubConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const fetchConnection = useCallback(async () => {
    if (!user) {
      setConnection(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('service_integrations')
        .select('id, is_connected, connected_at, refresh_token_encrypted')
        .eq('user_id', user.id)
        .eq('service_name', 'follow_up_boss')
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (err) {
      console.error('Error fetching FUB connection:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Connect via API key (Basic Auth)
  const connectWithApiKey = useCallback(async (apiKey: string) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect Follow Up Boss",
        variant: "destructive",
      });
      return false;
    }

    if (!apiKey?.trim()) {
      toast({
        title: "API key required",
        description: "Please enter your Follow Up Boss API key",
        variant: "destructive",
      });
      return false;
    }

    try {
      setConnecting(true);

      const { error: upsertError } = await supabase
        .from('service_integrations')
        .upsert({
          user_id: user.id,
          service_name: 'follow_up_boss',
          access_token_encrypted: apiKey.trim(),
          refresh_token_encrypted: null,
          is_connected: true,
          connected_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,service_name',
        });

      if (upsertError) throw upsertError;

      toast({
        title: "Follow Up Boss connected!",
        description: "Your API key has been saved successfully",
      });

      await fetchConnection();
      return true;
    } catch (err) {
      console.error('Error connecting FUB:', err);
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect Follow Up Boss",
        variant: "destructive",
      });
      return false;
    } finally {
      setConnecting(false);
    }
  }, [user, toast, fetchConnection]);

  // Connect via OAuth (redirect to FUB authorize page)
  const connectWithOAuth = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect Follow Up Boss",
        variant: "destructive",
      });
      return;
    }

    try {
      setConnecting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No active session');

      const response = await supabase.functions.invoke('fub-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { origin: window.location.origin },
      });

      if (response.error) throw new Error(response.error.message || 'Failed to start OAuth');

      const { authUrl } = response.data;
      if (!authUrl) throw new Error('No auth URL returned');

      // Redirect to FUB OAuth page
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error starting FUB OAuth:', err);
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to start Follow Up Boss OAuth",
        variant: "destructive",
      });
      setConnecting(false);
    }
  }, [user, toast]);

  const disconnect = useCallback(async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('service_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('service_name', 'follow_up_boss');

      if (error) throw error;

      setConnection(null);
      toast({
        title: "Follow Up Boss disconnected",
        description: "Your Follow Up Boss account has been unlinked",
      });
    } catch (err) {
      console.error('Error disconnecting FUB:', err);
      toast({
        title: "Error",
        description: "Failed to disconnect Follow Up Boss",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  return {
    connection,
    isConnected: !!connection?.is_connected,
    isOAuth: !!connection?.refresh_token_encrypted,
    loading,
    connecting,
    connectWithApiKey,
    connectWithOAuth,
    disconnect,
    refresh: fetchConnection,
  };
}
