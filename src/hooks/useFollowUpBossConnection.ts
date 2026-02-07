import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface FubConnection {
  id: string;
  is_connected: boolean;
  connected_at: string | null;
  token_expires_at: string | null;
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
        .select('id, is_connected, connected_at, token_expires_at')
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

  const connect = useCallback(async () => {
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
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (response.error) throw new Error(response.error.message);

      const { authUrl } = response.data;
      if (!authUrl) throw new Error('No auth URL returned');

      const authWindow = window.open(authUrl, '_blank');

      if (!authWindow) {
        toast({
          title: "Opening Follow Up Boss...",
          description: "If a new tab didn't open, please allow popups and try again.",
        });
        window.location.href = authUrl;
      } else {
        toast({
          title: "Complete authorization in new tab",
          description: "Please complete the Follow Up Boss authorization in the new tab.",
        });
      }

      setConnecting(false);
    } catch (err) {
      console.error('Error connecting FUB:', err);
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect Follow Up Boss",
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

  // Listen for URL params (OAuth callback redirect)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fubStatus = params.get('fub');

    if (fubStatus) {
      const url = new URL(window.location.href);
      url.searchParams.delete('fub');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());

      if (fubStatus === 'success') {
        toast({
          title: "Follow Up Boss connected!",
          description: "Your Follow Up Boss account has been linked successfully",
        });
        fetchConnection();
      } else if (fubStatus === 'denied') {
        toast({
          title: "Connection cancelled",
          description: "You denied access to Follow Up Boss",
        });
      } else if (fubStatus === 'error') {
        toast({
          title: "Connection failed",
          description: "Failed to connect Follow Up Boss. Please try again.",
          variant: "destructive",
        });
      }
    }
  }, [toast, fetchConnection]);

  return {
    connection,
    isConnected: !!connection?.is_connected,
    loading,
    connecting,
    connect,
    disconnect,
    refresh: fetchConnection,
  };
}
