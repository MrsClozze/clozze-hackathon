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
  ai_requires_action: boolean;
  ai_ignored: boolean;
  buyer_id: string | null;
  listing_id: string | null;
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
        .limit(100);

      if (error) throw error;

      // Map the response to include new fields with defaults
      const mappedEmails = (data || []).map((email: any) => ({
        ...email,
        ai_requires_action: email.ai_requires_action ?? false,
        ai_ignored: email.ai_ignored ?? false,
      })) as SyncedEmail[];

      setEmails(mappedEmails);
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
      if (!error.message?.includes("Unauthorized") && !error.message?.includes("not connected")) {
        toast({
          title: "Sync Failed",
          description: error.message || "Failed to sync emails from Gmail",
          variant: "destructive",
        });
      }
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
      await new Promise(resolve => setTimeout(resolve, 500));
      await analyzeEmails();
    }
  }, [syncEmails, analyzeEmails]);

  const ignoreEmail = useCallback(async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("synced_emails")
        .update({ ai_ignored: true })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(prev => prev.map(e => 
        e.id === emailId ? { ...e, ai_ignored: true } : e
      ));

      toast({
        title: "Email Ignored",
        description: "This email has been removed from your attention queue.",
      });
    } catch (error) {
      console.error("Error ignoring email:", error);
      toast({
        title: "Error",
        description: "Failed to ignore email",
        variant: "destructive",
      });
    }
  }, [toast]);

  const restoreEmail = useCallback(async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("synced_emails")
        .update({ ai_ignored: false })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(prev => prev.map(e => 
        e.id === emailId ? { ...e, ai_ignored: false } : e
      ));

      toast({
        title: "Email Restored",
        description: "This email is back in your attention queue.",
      });
    } catch (error) {
      console.error("Error restoring email:", error);
      toast({
        title: "Error",
        description: "Failed to restore email",
        variant: "destructive",
      });
    }
  }, [toast]);

  const attachEmail = useCallback(async (emailId: string, target: { buyerId?: string; listingId?: string }) => {
    try {
      const { error } = await supabase
        .from("synced_emails")
        .update({
          buyer_id: target.buyerId || null,
          listing_id: target.listingId || null,
        })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(prev => prev.map(e =>
        e.id === emailId
          ? { ...e, buyer_id: target.buyerId || null, listing_id: target.listingId || null }
          : e
      ));

      toast({
        title: "Email Attached",
        description: `Email linked to ${target.buyerId ? "buyer" : "listing"} profile.`,
      });
    } catch (error) {
      console.error("Error attaching email:", error);
      toast({
        title: "Error",
        description: "Failed to attach email",
        variant: "destructive",
      });
    }
  }, [toast]);

  const detachEmail = useCallback(async (emailId: string) => {
    try {
      const { error } = await supabase
        .from("synced_emails")
        .update({ buyer_id: null, listing_id: null })
        .eq("id", emailId);

      if (error) throw error;

      setEmails(prev => prev.map(e =>
        e.id === emailId ? { ...e, buyer_id: null, listing_id: null } : e
      ));

      toast({
        title: "Email Detached",
        description: "Email removed from profile.",
      });
    } catch (error) {
      console.error("Error detaching email:", error);
      toast({
        title: "Error",
        description: "Failed to detach email",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Get emails that require attention (analyzed with priority/action item, not ignored)
  // Use priority OR ai_requires_action OR has action item as signals for needing attention
  const actionRequiredEmails = emails.filter(
    e => e.ai_analyzed && 
         !e.ai_ignored && 
         (e.ai_requires_action || e.ai_priority || e.ai_action_item)
  );

  // Get all analyzed emails that are NOT ignored (for the "All Emails" tab)
  const allAnalyzedEmails = emails.filter(e => e.ai_analyzed && !e.ai_ignored);

  // Get ignored emails (for potential "Ignored" view)
  const ignoredEmails = emails.filter(e => e.ai_ignored);

  // Legacy: Get only analyzed emails with action items for backwards compatibility
  const analyzedEmails = emails.filter(e => e.ai_analyzed && e.ai_action_item && !e.ai_ignored);

  return {
    emails,
    analyzedEmails,
    actionRequiredEmails,
    allAnalyzedEmails,
    ignoredEmails,
    loading,
    syncing,
    analyzing,
    syncEmails,
    analyzeEmails,
    syncAndAnalyze,
    ignoreEmail,
    restoreEmail,
    refetch: fetchEmails,
  };
}
