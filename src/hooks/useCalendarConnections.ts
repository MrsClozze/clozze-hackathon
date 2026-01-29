import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CalendarConnection {
  id: string;
  provider: "google" | "outlook" | "apple";
  providerEmail: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
}

export function useCalendarConnections() {
  const [connections, setConnections] = useState<CalendarConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchConnections = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setConnections([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("calendar_connections")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const mapped: CalendarConnection[] = (data || []).map((conn: any) => ({
        id: conn.id,
        provider: conn.provider,
        providerEmail: conn.provider_email,
        syncEnabled: conn.sync_enabled,
        lastSyncedAt: conn.last_synced_at,
        createdAt: conn.created_at,
      }));

      setConnections(mapped);
    } catch (error: any) {
      console.error("Error fetching calendar connections:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const isConnected = (provider: "google" | "outlook" | "apple") => {
    return connections.some((c) => c.provider === provider);
  };

  const getConnection = (provider: "google" | "outlook" | "apple") => {
    return connections.find((c) => c.provider === provider);
  };

  const connectGoogle = async () => {
    setConnecting("google");
    try {
      const redirectUri = `${window.location.origin}/integrations`;
      
      const { data, error } = await supabase.functions.invoke("google-calendar-auth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });

      if (error) throw error;

      if (data.setup_required) {
        toast({
          title: "Setup Required",
          description: "Google Calendar integration requires configuration. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      if (data.auth_url) {
        // Store state to verify on return
        sessionStorage.setItem("calendar_oauth_provider", "google");
        sessionStorage.setItem("calendar_oauth_redirect", redirectUri);
        window.location.href = data.auth_url;
      }
    } catch (error: any) {
      console.error("Error initiating Google auth:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Calendar",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const connectOutlook = async () => {
    setConnecting("outlook");
    try {
      const redirectUri = `${window.location.origin}/integrations`;
      
      const { data, error } = await supabase.functions.invoke("outlook-calendar-auth", {
        body: { action: "get_auth_url", redirect_uri: redirectUri },
      });

      if (error) throw error;

      if (data.setup_required) {
        toast({
          title: "Setup Required",
          description: "Outlook Calendar integration requires configuration. Please contact support.",
          variant: "destructive",
        });
        return;
      }

      if (data.auth_url) {
        sessionStorage.setItem("calendar_oauth_provider", "outlook");
        sessionStorage.setItem("calendar_oauth_redirect", redirectUri);
        window.location.href = data.auth_url;
      }
    } catch (error: any) {
      console.error("Error initiating Outlook auth:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Outlook Calendar",
        variant: "destructive",
      });
    } finally {
      setConnecting(null);
    }
  };

  const connectApple = async (appleId: string, appSpecificPassword: string) => {
    setConnecting("apple");
    try {
      const { data, error } = await supabase.functions.invoke("apple-calendar-auth", {
        body: { 
          action: "connect", 
          apple_id: appleId,
          app_specific_password: appSpecificPassword,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connected",
          description: `Apple Calendar connected for ${data.email}`,
        });
        await fetchConnections();
        return true;
      } else {
        throw new Error(data.error || "Connection failed");
      }
    } catch (error: any) {
      console.error("Error connecting Apple Calendar:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Apple Calendar",
        variant: "destructive",
      });
      return false;
    } finally {
      setConnecting(null);
    }
  };

  const disconnect = async (provider: "google" | "outlook" | "apple") => {
    try {
      const functionName = `${provider === "outlook" ? "outlook" : provider}-calendar-auth`;
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { action: "disconnect" },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Disconnected",
          description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar disconnected`,
        });
        await fetchConnections();
      }
    } catch (error: any) {
      console.error(`Error disconnecting ${provider}:`, error);
      toast({
        title: "Error",
        description: `Failed to disconnect ${provider} Calendar`,
        variant: "destructive",
      });
    }
  };

  const handleOAuthCallback = async (code: string, provider: "google" | "outlook") => {
    setConnecting(provider);
    try {
      const redirectUri = sessionStorage.getItem("calendar_oauth_redirect") || 
        `${window.location.origin}/integrations`;
      
      const functionName = `${provider}-calendar-auth`;
      
      const { data, error } = await supabase.functions.invoke(functionName, {
        body: { 
          action: "exchange_code", 
          code,
          redirect_uri: redirectUri,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast({
          title: "Connected",
          description: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Calendar connected for ${data.email}`,
        });
        
        // Clean up session storage
        sessionStorage.removeItem("calendar_oauth_provider");
        sessionStorage.removeItem("calendar_oauth_redirect");
        
        await fetchConnections();
        return true;
      } else {
        throw new Error(data.error || "Connection failed");
      }
    } catch (error: any) {
      console.error(`Error completing ${provider} OAuth:`, error);
      toast({
        title: "Connection Failed",
        description: error.message || `Failed to connect to ${provider} Calendar`,
        variant: "destructive",
      });
      return false;
    } finally {
      setConnecting(null);
    }
  };

  return {
    connections,
    loading,
    connecting,
    isConnected,
    getConnection,
    connectGoogle,
    connectOutlook,
    connectApple,
    disconnect,
    handleOAuthCallback,
    refetch: fetchConnections,
  };
}
