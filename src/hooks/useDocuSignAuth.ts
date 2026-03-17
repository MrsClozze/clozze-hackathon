import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'react-router-dom';

export const useDocuSignAuth = () => {
  const { user } = useAuth();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

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

  // Handle redirect callback from DocuSign OAuth
  useEffect(() => {
    const docusignResult = searchParams.get('docusign');
    if (!docusignResult) return;

    // Clean up URL params
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('docusign');
    newParams.delete('message');
    setSearchParams(newParams, { replace: true });

    if (docusignResult === 'success') {
      setIsConnected(true);
      setIsAuthenticating(false);
      toast({
        title: "DocuSign Connected",
        description: "Successfully authenticated with DocuSign",
      });
    } else if (docusignResult === 'error') {
      const message = searchParams.get('message') || 'Failed to authenticate with DocuSign';
      setIsAuthenticating(false);
      toast({
        title: "Authentication Failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [searchParams, setSearchParams, toast]);

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

      // The callback will redirect back to /integrations?docusign=success
      // which will be handled by the useEffect above.
      // We just need to watch for the popup closing.
      return new Promise<boolean>((resolve) => {
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            // Give a moment for the redirect to land and state to update
            setTimeout(() => {
              // If we're still authenticating after redirect should have happened,
              // check DB as final fallback
              if (!isConnected) {
                checkConnection().then(() => {
                  setIsAuthenticating(false);
                  resolve(false);
                });
              } else {
                resolve(true);
              }
            }, 2000);
          }
        }, 1000);

        // Timeout after 3 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          setIsAuthenticating(false);
          try { popup.close(); } catch {}
          toast({
            title: "Connection timed out",
            description: "The DocuSign connection timed out. Please try again.",
            variant: "destructive",
          });
          resolve(false);
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
  }, [toast, checkConnection, isConnected]);

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
