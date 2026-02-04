import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface TaskToSync {
  id: string;
  title: string;
  notes?: string;
  dueDate: string;
  dueTime?: string;
  endTime?: string;
  address?: string;
}

// Helper to get browser timezone
const getBrowserTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

interface SyncResult {
  google?: { success: boolean; error?: string };
  apple?: { success: boolean; error?: string };
}

export function useCalendarSync() {
  // Check which calendar providers are connected
  const getConnectedProviders = useCallback(async (): Promise<("google" | "apple")[]> => {
    try {
      const { data, error } = await supabase
        .from("calendar_connections")
        .select("provider")
        .eq("sync_enabled", true);

      if (error) throw error;

      return (data || []).map((c) => c.provider as "google" | "apple");
    } catch (error) {
      console.error("Error fetching connected providers:", error);
      return [];
    }
  }, []);

  // Sync a single task to all connected calendars
  const syncTask = useCallback(async (task: TaskToSync): Promise<SyncResult> => {
    const result: SyncResult = {};
    const timezone = getBrowserTimezone();

    const providers = await getConnectedProviders();

    const taskPayload = {
      id: task.id,
      title: task.title,
      notes: task.notes,
      dueDate: task.dueDate,
      dueTime: task.dueTime,
      endTime: task.endTime,
      address: task.address,
      timezone,
    };

    // Sync to all connected providers in parallel
    const syncPromises: Promise<void>[] = [];

    if (providers.includes("google")) {
      syncPromises.push(
        supabase.functions
          .invoke("sync-google-calendar", {
            body: { action: "sync_task", task: taskPayload },
          })
          .then(({ data, error }) => {
            if (error) {
              result.google = { success: false, error: error.message };
            } else if (data?.error) {
              result.google = { success: false, error: data.error };
            } else {
              result.google = { success: true };
            }
          })
          .catch((err) => {
            result.google = { success: false, error: String(err) };
          })
      );
    }

    if (providers.includes("apple")) {
      syncPromises.push(
        supabase.functions
          .invoke("sync-apple-calendar", {
            body: { action: "sync_task", task: taskPayload },
          })
          .then(({ data, error }) => {
            if (error) {
              result.apple = { success: false, error: error.message };
            } else if (data?.error) {
              result.apple = { success: false, error: data.error };
            } else {
              result.apple = { success: true };
            }
          })
          .catch((err) => {
            result.apple = { success: false, error: String(err) };
          })
      );
    }

    await Promise.all(syncPromises);

    return result;
  }, [getConnectedProviders]);

  // Delete a task's events from all connected calendars
  const deleteTaskEvents = useCallback(async (taskId: string): Promise<SyncResult> => {
    const result: SyncResult = {};
    const providers = await getConnectedProviders();

    const deletePromises: Promise<void>[] = [];

    if (providers.includes("google")) {
      deletePromises.push(
        supabase.functions
          .invoke("sync-google-calendar", {
            body: { action: "delete_event", taskId },
          })
          .then(({ data, error }) => {
            if (error) {
              result.google = { success: false, error: error.message };
            } else if (data?.error) {
              result.google = { success: false, error: data.error };
            } else {
              result.google = { success: true };
            }
          })
          .catch((err) => {
            result.google = { success: false, error: String(err) };
          })
      );
    }

    if (providers.includes("apple")) {
      deletePromises.push(
        supabase.functions
          .invoke("sync-apple-calendar", {
            body: { action: "delete_event", taskId },
          })
          .then(({ data, error }) => {
            if (error) {
              result.apple = { success: false, error: error.message };
            } else if (data?.error) {
              result.apple = { success: false, error: data.error };
            } else {
              result.apple = { success: true };
            }
          })
          .catch((err) => {
            result.apple = { success: false, error: String(err) };
          })
      );
    }

    await Promise.all(deletePromises);

    return result;
  }, [getConnectedProviders]);

  // Sync all tasks marked for external sync to all connected calendars
  const syncAllTasks = useCallback(async (taskIds: string[]): Promise<SyncResult> => {
    const result: SyncResult = {};
    const providers = await getConnectedProviders();

    const syncPromises: Promise<void>[] = [];

    if (providers.includes("google")) {
      syncPromises.push(
        supabase.functions
          .invoke("sync-google-calendar", {
            body: { action: "sync_all", taskIds },
          })
          .then(({ data, error }) => {
            if (error) {
              result.google = { success: false, error: error.message };
            } else {
              result.google = { success: true };
            }
          })
          .catch((err) => {
            result.google = { success: false, error: String(err) };
          })
      );
    }

    if (providers.includes("apple")) {
      syncPromises.push(
        supabase.functions
          .invoke("sync-apple-calendar", {
            body: { action: "sync_all", taskIds },
          })
          .then(({ data, error }) => {
            if (error) {
              result.apple = { success: false, error: error.message };
            } else {
              result.apple = { success: true };
            }
          })
          .catch((err) => {
            result.apple = { success: false, error: String(err) };
          })
      );
    }

    await Promise.all(syncPromises);

    return result;
  }, [getConnectedProviders]);

  // Pull events from Apple Calendar (for two-way sync)
  const pullAppleEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("sync-apple-calendar", {
        body: { action: "pull_events" },
      });

      if (error) throw error;

      return data;
    } catch (error) {
      console.error("Error pulling Apple Calendar events:", error);
      return { success: false, error: String(error) };
    }
  }, []);

  return {
    syncTask,
    deleteTaskEvents,
    syncAllTasks,
    pullAppleEvents,
    getConnectedProviders,
  };
}
