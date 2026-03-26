import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Hook to manage user timezone detection and storage.
 * Auto-detects browser timezone and saves it to the user's profile.
 */
export function useTimezone() {
  const { user } = useAuth();
  const [timezone, setTimezone] = useState<string>(
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [isLoading, setIsLoading] = useState(false);

  // Get the browser's detected timezone
  const getBrowserTimezone = useCallback(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  // Fetch user's saved timezone from profile
  const fetchUserTimezone = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("timezone")
        .eq("id", user.id)
        .single();

      if (error) {
        console.error("[useTimezone] Error fetching timezone:", error);
        return;
      }

      if (data?.timezone) {
        setTimezone(data.timezone);
      } else {
        // No timezone saved, save the browser's timezone
        const browserTz = getBrowserTimezone();
        await saveTimezone(browserTz);
      }
    } catch (err) {
      console.error("[useTimezone] Exception:", err);
    }
  }, [user, getBrowserTimezone]);

  // Save timezone to user profile
  const saveTimezone = useCallback(async (tz: string) => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ timezone: tz })
        .eq("id", user.id);

      if (error) {
        console.error("[useTimezone] Error saving timezone:", error);
        return;
      }

      setTimezone(tz);
      console.log("[useTimezone] Saved timezone:", tz);
    } catch (err) {
      console.error("[useTimezone] Exception saving:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Auto-detect and save timezone on mount when user is logged in
  useEffect(() => {
    if (user) {
      fetchUserTimezone();
    }
  }, [user, fetchUserTimezone]);

  return {
    timezone,
    isLoading,
    saveTimezone,
    getBrowserTimezone,
  };
}
