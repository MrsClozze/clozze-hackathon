import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

// Get allowed origins for postMessage validation
const getAllowedOrigins = (): string[] => {
  const origins = [window.location.origin];
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl) {
    try {
      origins.push(new URL(supabaseUrl).origin);
    } catch {
      // Ignore invalid URL
    }
  }
  return origins;
};

export const useDocuSignAuth = () => {
  const { user } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const checkConnection = useCallback(async () => {
    if (!user) {
      setIsConnected(false);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_integrations')
        .select('is_connected')
        .eq('user_id', user.id)
        .eq('service_name', 'docusign')
        .maybeSingle();

      if (error) throw error;
      setIsConnected(data?.is_connected ?? false);
    } catch (err) {
      console.error('Error checking DocuSign connection:', err);
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const authenticate = useCallback(async (): Promise<boolean> => {
    setIsAuthenticating(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const { data, error } = await supabase.functions.invoke('docusign-auth', {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error) throw error;
      if (!data?.authUrl) throw new Error('No authorization URL received');

      // Open popup
      const width = 600;
      const height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;

      const popup = window.open(
        data.authUrl,
        'DocuSign OAuth',
        `width=${width},height=${height},left=${left},top=${top},popup=1`
      );

      if (!popup) {
        throw new Error('Popup blocked. Please allow popups for this site.');
      }

      return new Promise<boolean>((resolve) => {
        let resolved = false;
        const cleanup = () => {
          if (resolved) return;
          resolved = true;
          clearInterval(checkClosed);
          clearTimeout(timeout);
          window.removeEventListener('message', messageHandler);
        };

        const messageHandler = (event: MessageEvent) => {
          // Accept messages from any origin since the callback page runs on the Supabase domain
          if (event.data.type === 'docusign-success') {
            cleanup();
            setIsAuthenticating(false);
            setIsConnected(true);
            toast({
              title: "DocuSign Connected",
              description: "Successfully authenticated with DocuSign",
            });
            resolve(true);
          } else if (event.data.type === 'docusign-error') {
            cleanup();
            setIsAuthenticating(false);
            toast({
              title: "Authentication Failed",
              description: event.data.error || "Failed to authenticate with DocuSign",
              variant: "destructive",
            });
            resolve(false);
          }
        };

        window.addEventListener('message', messageHandler);

        const checkClosed = setInterval(() => {
          if (popup.closed) {
            cleanup();
            setIsAuthenticating(false);
            resolve(false);
          }
        }, 1000);

        // Timeout after 3 minutes to prevent being stuck forever
        const timeout = setTimeout(() => {
          if (!resolved) {
            cleanup();
            setIsAuthenticating(false);
            try { popup.close(); } catch {}
            toast({
              title: "Connection timed out",
              description: "The DocuSign connection timed out. Please try again.",
              variant: "destructive",
            });
            resolve(false);
          }
        }, 180000);
      });
    } catch (error) {
      console.error('DocuSign authentication error:', error);
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to start authentication",
        variant: "destructive",
      });
      setIsAuthenticating(false);
      return false;
    }
  }, [toast]);

  const disconnect = useCallback(async () => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('service_integrations')
        .delete()
        .eq('user_id', user.id)
        .eq('service_name', 'docusign');

      if (error) throw error;
      setIsConnected(false);
      toast({ title: "DocuSign disconnected" });
    } catch (err) {
      console.error('Error disconnecting DocuSign:', err);
      toast({ title: "Error", description: "Failed to disconnect", variant: "destructive" });
    }
  }, [user, toast]);

  return {
    authenticate,
    isAuthenticating,
    isConnected,
    loading,
    disconnect,
    refresh: checkConnection,
  };
};
