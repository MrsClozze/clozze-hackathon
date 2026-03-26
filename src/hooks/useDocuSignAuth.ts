import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

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

      // Open popup for DocuSign auth
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

      // The callback redirects back to /integrations?docusign=success|error
      // which loads in the popup. We poll the DB after popup closes to detect success.
      return new Promise<boolean>((resolve) => {
        let resolved = false;

        const checkClosed = setInterval(async () => {
          if (popup.closed && !resolved) {
            resolved = true;
            clearInterval(checkClosed);
            clearTimeout(timeout);

            // Wait for any in-flight DB writes to complete
            await new Promise(r => setTimeout(r, 2000));

            // Check DB for connection status
            try {
              const { data: dbData } = await supabase
                .from('service_integrations')
                .select('is_connected')
                .eq('user_id', user!.id)
                .eq('service_name', 'docusign')
                .maybeSingle();

              if (dbData?.is_connected) {
                setIsConnected(true);
                setIsAuthenticating(false);
                toast({
                  title: "DocuSign Connected",
                  description: "Successfully authenticated with DocuSign",
                });
                resolve(true);
                return;
              }
            } catch (err) {
              console.error('Error polling DocuSign status:', err);
            }

            setIsAuthenticating(false);
            resolve(false);
          }
        }, 1000);

        // Timeout after 3 minutes
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            clearInterval(checkClosed);
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
  }, [toast, user]);

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
