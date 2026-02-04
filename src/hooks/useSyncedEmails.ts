import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface SyncedEmail {
  id: string;
  external_email_id: string;
  sender_email: string;
  sender_name: string | null;
  subject: string | null;
  snippet: string | null;
  body_preview: string | null;
  received_at: string;
  is_read: boolean;
  labels: string[] | null;
  thread_id: string | null;
  ai_analyzed: boolean;
  ai_action_item: string | null;
  ai_priority: "low" | "medium" | "high" | "urgent" | null;
  ai_category: string | null;
  created_at: string;
  updated_at: string;
}

export function useSyncedEmails() {
  const [emails, setEmails] = useState<SyncedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const { toast } = useToast();

  const fetchEmails = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setEmails([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("synced_emails")
        .select("*")
        .order("received_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      setEmails((data as SyncedEmail[]) || []);
    } catch (error) {
      console.error("Error fetching synced emails:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const syncEmails = useCallback(async () => {
    setSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-gmail-emails", {
        body: { action: "sync", maxResults: 20 },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Emails Synced",
          description: `Synced ${data.synced} emails from Gmail`,
        });
        await fetchEmails();
        return data.synced;
      } else {
        throw new Error(data?.error || "Sync failed");
      }
    } catch (error: any) {
      console.error("Error syncing emails:", error);
      toast({
        title: "Sync Failed",
        description: error.message || "Failed to sync emails from Gmail",
        variant: "destructive",
      });
      return 0;
    } finally {
      setSyncing(false);
    }
  }, [fetchEmails, toast]);

  const analyzeEmails = useCallback(async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-email", {
        body: { action: "analyze_batch", limit: 10 },
      });

      if (error) throw error;

      if (data?.success) {
        if (data.analyzed > 0) {
          toast({
            title: "Analysis Complete",
            description: `Analyzed ${data.analyzed} emails with AI`,
          });
          await fetchEmails();
        }
        return data.analyzed;
      } else {
        throw new Error(data?.error || "Analysis failed");
      }
    } catch (error: any) {
      console.error("Error analyzing emails:", error);
      // Don't show toast for rate limits - handled in edge function
      if (!error.message?.includes("Rate limit")) {
        toast({
          title: "Analysis Failed",
          description: error.message || "Failed to analyze emails",
          variant: "destructive",
        });
      }
      return 0;
    } finally {
      setAnalyzing(false);
    }
  }, [fetchEmails, toast]);

  const syncAndAnalyze = useCallback(async () => {
    const synced = await syncEmails();
    if (synced > 0) {
      // Small delay before analyzing
      await new Promise(resolve => setTimeout(resolve, 500));
      await analyzeEmails();
    }
  }, [syncEmails, analyzeEmails]);

  // Get only analyzed emails for display
  const analyzedEmails = emails.filter(e => e.ai_analyzed && e.ai_action_item);

  return {
    emails,
    analyzedEmails,
    loading,
    syncing,
    analyzing,
    syncEmails,
    analyzeEmails,
    syncAndAnalyze,
    refetch: fetchEmails,
  };
}
