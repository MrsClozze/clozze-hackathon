import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface CalendarConnection {
  id: string;
  provider: "google" | "apple";
  providerEmail: string | null;
  syncEnabled: boolean;
  lastSyncedAt: string | null;
  createdAt: string;
  userId: string;
  isOwned: boolean; // true if the current user owns this connection
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
        userId: conn.user_id,
        isOwned: conn.user_id === user.id,
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

  const isConnected = (provider: "google" | "apple") => {
    return connections.some((c) => c.provider === provider);
  };

  const getConnection = (provider: "google" | "apple") => {
    return connections.find((c) => c.provider === provider);
  };

  // Google OAuth Client ID - fetched from edge function to allow dynamic updates
  const [googleClientId, setGoogleClientId] = useState<string | null>(null);
  
  // Fetch Google Client ID on mount
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

  const connectGoogle = async () => {
    setConnecting("google");
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Authentication required",
          description: "Please sign in to connect Google Calendar",
          variant: "destructive",
        });
        setConnecting(null);
        return;
      }

      // Wait for client ID if not yet loaded
      if (!googleClientId) {
        toast({
          title: "Please wait",
          description: "Loading Google Calendar configuration...",
        });
        setConnecting(null);
        return;
      }

      // Build OAuth URL directly on client for instant redirect
      const redirectUri = `${window.location.origin}/integrations`;
      
      const scopes = [
        "https://www.googleapis.com/auth/calendar.events",
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
      sessionStorage.setItem("calendar_oauth_provider", "google");
      sessionStorage.setItem("calendar_oauth_redirect", redirectUri);
      
      // Instant redirect - no edge function call needed
      window.location.href = authUrl;
    } catch (error: any) {
      console.error("Error initiating Google auth:", error);
      toast({
        title: "Connection Failed",
        description: error.message || "Failed to connect to Google Calendar",
        variant: "destructive",
      });
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

  const disconnect = async (provider: "google" | "apple") => {
    try {
      const functionName = `${provider}-calendar-auth`;
      
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

  const handleOAuthCallback = async (code: string, provider: "google") => {
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
    connectApple,
    disconnect,
    handleOAuthCallback,
    refetch: fetchConnections,
  };
}
