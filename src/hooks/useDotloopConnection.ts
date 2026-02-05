import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface DotloopConnection {
  id: string;
  is_connected: boolean;
  connected_at: string | null;
  token_expires_at: string | null;
}

export function useDotloopConnection() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [connection, setConnection] = useState<DotloopConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);

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
        .eq('service_name', 'dotloop')
        .maybeSingle();

      if (error) throw error;
      setConnection(data);
    } catch (err) {
      console.error('Error fetching Dotloop connection:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const connect = useCallback(async () => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to connect Dotloop",
        variant: "destructive",
      });
      return;
    }

    try {
      setConnecting(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('dotloop-auth', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { authUrl } = response.data;
      if (!authUrl) {
        throw new Error('No auth URL returned');
      }

      // Open Dotloop authorization in a new tab to avoid iframe restrictions
      // After authorization, Dotloop redirects back to our callback which then
      // redirects to /integrations with a success/error query param
      // Using window.open with _blank works reliably in iframe environments
      const authWindow = window.open(authUrl, '_blank');
      
      if (!authWindow) {
        // Popup was blocked - fall back to same-window redirect
        // This may not work in all iframe environments, but is a fallback
        toast({
          title: "Opening Dotloop...",
          description: "If a new tab didn't open, please allow popups and try again.",
        });
        window.location.href = authUrl;
      } else {
        // New tab opened successfully - user will be redirected back after auth
        toast({
          title: "Complete authorization in new tab",
          description: "Please complete the Dotloop authorization in the new tab. You'll be redirected back automatically.",
        });
      }
      
      setConnecting(false);

    } catch (err) {
      console.error('Error connecting Dotloop:', err);
      toast({
        title: "Connection failed",
        description: err instanceof Error ? err.message : "Failed to connect Dotloop",
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
        .eq('service_name', 'dotloop');

      if (error) throw error;

      setConnection(null);
      toast({
        title: "Dotloop disconnected",
        description: "Your Dotloop account has been unlinked",
      });
    } catch (err) {
      console.error('Error disconnecting Dotloop:', err);
      toast({
        title: "Error",
        description: "Failed to disconnect Dotloop",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const syncData = useCallback(async () => {
    if (!user || !connection?.is_connected) {
      toast({
        title: "Not connected",
        description: "Please connect Dotloop first",
        variant: "destructive",
      });
      return null;
    }

    try {
      setSyncing(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      const response = await supabase.functions.invoke('sync-dotloop', {
        body: { action: 'sync_all' },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast({
        title: "Sync complete",
        description: `Synced ${response.data.summary?.loopCount || 0} loops and ${response.data.summary?.contactCount || 0} contacts`,
      });

      return response.data;
    } catch (err) {
      console.error('Error syncing Dotloop:', err);
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Failed to sync Dotloop data",
        variant: "destructive",
      });
      return null;
    } finally {
      setSyncing(false);
    }
  }, [user, connection, toast]);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Listen for URL params on page load (for non-popup flow)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const dotloopStatus = params.get('dotloop');
    
    if (dotloopStatus) {
      // Clean up URL
      const url = new URL(window.location.href);
      url.searchParams.delete('dotloop');
      url.searchParams.delete('message');
      window.history.replaceState({}, '', url.toString());

      if (dotloopStatus === 'success') {
        toast({
          title: "Dotloop connected!",
          description: "Your Dotloop account has been linked successfully",
        });
        fetchConnection();
      } else if (dotloopStatus === 'denied') {
        toast({
          title: "Connection cancelled",
          description: "You denied access to Dotloop",
        });
      } else if (dotloopStatus === 'error') {
        toast({
          title: "Connection failed",
          description: "Failed to connect Dotloop. Please try again.",
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
    syncing,
    connect,
    disconnect,
    syncData,
    refresh: fetchConnection,
  };
}
