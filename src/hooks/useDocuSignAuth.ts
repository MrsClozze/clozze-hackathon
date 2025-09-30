import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocuSignAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export const useDocuSignAuth = () => {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { toast } = useToast();

  const handleMessage = useCallback((event: MessageEvent, resolve: (value: DocuSignAuthResult | null) => void, reject: (error: Error) => void) => {
    if (event.data.type === 'docusign-success') {
      toast({
        title: "DocuSign Connected",
        description: "Successfully authenticated with DocuSign",
      });
      resolve({
        accessToken: event.data.accessToken,
        refreshToken: event.data.refreshToken,
        expiresIn: event.data.expiresIn,
      });
    } else if (event.data.type === 'docusign-error') {
      toast({
        title: "Authentication Failed",
        description: event.data.error || "Failed to authenticate with DocuSign",
        variant: "destructive",
      });
      reject(new Error(event.data.error || 'Authentication failed'));
    }
  }, [toast]);

  const authenticate = useCallback(async (): Promise<DocuSignAuthResult | null> => {
    setIsAuthenticating(true);

    try {
      // Get authorization URL from edge function
      const { data, error } = await supabase.functions.invoke('docusign-auth');

      if (error) throw error;
      if (!data?.authUrl) throw new Error('No authorization URL received');

      // Open popup window for OAuth
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

      // Wait for OAuth callback
      return new Promise<DocuSignAuthResult | null>((resolve, reject) => {
        const messageHandler = (event: MessageEvent) => {
          handleMessage(event, resolve, reject);
          window.removeEventListener('message', messageHandler);
          setIsAuthenticating(false);
        };

        window.addEventListener('message', messageHandler);

        // Check if popup was closed without completing auth
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            window.removeEventListener('message', messageHandler);
            setIsAuthenticating(false);
            resolve(null);
          }
        }, 1000);
      });
    } catch (error) {
      console.error('DocuSign authentication error:', error);
      toast({
        title: "Authentication Error",
        description: error instanceof Error ? error.message : "Failed to start authentication",
        variant: "destructive",
      });
      setIsAuthenticating(false);
      return null;
    }
  }, [handleMessage, toast]);

  return {
    authenticate,
    isAuthenticating,
  };
};
