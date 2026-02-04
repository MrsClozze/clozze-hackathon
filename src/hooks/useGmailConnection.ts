import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface GmailConnection {
  id: string;
  providerEmail: string | null;
  isConnected: boolean;
  connectedAt: string | null;
}

export function useGmailConnection() {
  const [connection, setConnection] = useState<GmailConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConnection = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConnection(null);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("service_integrations")
        .select("*")
        .eq("service_name", "gmail")
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setConnection({
          id: data.id,
          providerEmail: null, // Gmail doesn't store email in current schema
          isConnected: data.is_connected,
          connectedAt: data.connected_at,
        });
      } else {
        setConnection(null);
      }
    } catch (error: any) {
      console.error("Error fetching Gmail connection:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnection();
  }, [fetchConnection]);

  // Fetch Google Client ID on mount (reuse calendar auth endpoint)
  useEffect(() => {
    const fetchGoogleClientId = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
          body: { action: "get_client_id" },
        });
        if (!error && data?.client_id) {
          setGoogleClientId(data.client_id);
        }
      } catch (err) {
        console.error("Failed to fetch Google Client ID:", err);
      }
    };
    fetchGoogleClientId();
  }, []);

  const connectGmail = async () => {
    setIsConnecting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to connect Gmail",
          variant: "destructive",
        });
        setIsConnecting(false);
        return;
      }

      if (!googleClientId) {
        toast({
          title: "Please wait",
          description: "Loading Gmail configuration...",
        });
        setIsConnecting(false);
        return;
      }

      // Build OAuth URL for Gmail
      const redirectUri = `${window.location.origin}/integrations`;
      
      const scopes = [
        "https://www.googleapis.com/auth/gmail.readonly",
        "https://www.googleapis.com/auth/gmail.send",
        "https://www.googleapis.com/auth/userinfo.email",
      ];

      const params = new URLSearchParams({
        client_id: googleClientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: scopes.join(" "),
        access_type: "offline",
        prompt: "consent",
        state: user.id,
      });

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

      // Store state to verify on return
      sessionStorage.setItem("gmail_oauth_provider", "gmail");
      sessionStorage.setItem("gmail_oauth_redirect", redirectUri);
      
      // Redirect to Google OAuth
      window.location.href = authUrl;
    } catch (error: any) {
      console.error("Error initiating Gmail auth:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Gmail",
        variant: "destructive",
      });
      setIsConnecting(false);
    }
  };

  const disconnectGmail = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from("service_integrations")
        .delete()
        .eq("user_id", user.id)
        .eq("service_name", "gmail");

      if (error) throw error;

      setConnection(null);
      toast({
        title: "Disconnected",
        description: "Gmail has been disconnected",
      });
    } catch (error: any) {
      console.error("Error disconnecting Gmail:", error);
      toast({
        title: "Error",
        description: "Failed to disconnect Gmail",
        variant: "destructive",
      });
    }
  };

  const handleOAuthCallback = async (code: string) => {
    setIsConnecting(true);
    try {
      // Ensure we have a valid session before calling the edge function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Please sign in to connect Gmail");
      }

      const redirectUri = sessionStorage.getItem("gmail_oauth_redirect") || 
        `${window.location.origin}/integrations`;
      
      const { data, error } = await supabase.functions.invoke("gmail-auth", {
        body: { 
          action: "exchange_code", 
          code,
          redirect_uri: redirectUri,
          user_id: user.id, // Pass user_id as backup
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connected",
          description: `Gmail connected for ${data.email}`,
        });
        
        // Clean up session storage
        sessionStorage.removeItem("gmail_oauth_provider");
        sessionStorage.removeItem("gmail_oauth_redirect");
        
        await fetchConnection();
        
        // Trigger initial sync after connecting
        try {
          await supabase.functions.invoke("sync-gmail-emails", {
            body: { action: "sync", maxResults: 20 },
          });
        } catch (syncError) {
          console.log("Initial sync will happen in Communication Hub");
        }
        
        return true;
      } else {
        throw new Error(data.error || "Connection failed");
      }
    } catch (error: any) {
      console.error("Error completing Gmail OAuth:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Gmail",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  const syncEmails = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-gmail-emails", {
        body: { action: "sync", maxResults: 20 },
      });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error syncing emails:", error);
      return null;
    }
  };

  return {
    connection,
    loading,
    isConnecting,
    isConnected: connection?.isConnected ?? false,
    connectGmail,
    disconnectGmail,
    handleOAuthCallback,
    syncEmails,
    refetch: fetchConnection,
  };
}
