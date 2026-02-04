import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CALENDAR_CLIENT_ID");
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CALENDAR_CLIENT_SECRET");

interface TaskToSync {
  id: string;
  title: string;
  notes?: string;
  dueDate: string;
  dueTime?: string;
  address?: string;
}

interface RequestBody {
  action: "sync_task" | "delete_event" | "sync_all";
  task?: TaskToSync;
  eventId?: string;
  taskIds?: string[];
}

interface CalendarConnection {
  id: string;
  access_token_encrypted: string | null;
  refresh_token_encrypted: string | null;
  token_expires_at: string;
}

// Refresh access token if expired
// deno-lint-ignore no-explicit-any
async function getValidAccessToken(
  adminClient: any,
  userId: string
): Promise<string | null> {
  try {
    // Get the calendar connection with tokens
    const { data: connection, error: connError } = await adminClient
      .from("calendar_connections")
      .select("id, access_token_encrypted, refresh_token_encrypted, token_expires_at")
      .eq("user_id", userId)
      .eq("provider", "google")
      .single();

    if (connError || !connection) {
      console.error("No Google Calendar connection found:", connError);
      return null;
    }

    const conn = connection as CalendarConnection;

    if (!conn.access_token_encrypted) {
      console.error("No access token found");
      return null;
    }

    const tokenExpiry = new Date(conn.token_expires_at);
    const now = new Date();

    // Check if token is still valid (with 5 minute buffer)
    if (tokenExpiry > new Date(now.getTime() + 5 * 60 * 1000)) {
      return conn.access_token_encrypted;
    }

    // Token expired, refresh it
    if (!conn.refresh_token_encrypted) {
      console.error("No refresh token available");
      return null;
    }

    console.log("Refreshing Google access token...");
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        refresh_token: conn.refresh_token_encrypted,
        grant_type: "refresh_token",
      }),
    });

    const refreshData = await refreshResponse.json();

    if (refreshData.error) {
      console.error("Token refresh failed:", refreshData);
      return null;
    }

    // Update tokens in calendar_connections
    const newExpiresAt = new Date(Date.now() + refreshData.expires_in * 1000);
    
    await adminClient
      .from("calendar_connections")
      .update({ 
        access_token_encrypted: refreshData.access_token,
        token_expires_at: newExpiresAt.toISOString() 
      })
      .eq("id", conn.id);

    return refreshData.access_token;
  } catch (error) {
    console.error("Error getting valid access token:", error);
    return null;
  }
}

// Create or update a Google Calendar event
async function syncTaskToGoogleCalendar(
  accessToken: string,
  task: TaskToSync
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // Parse the due date
    const dueDate = new Date(task.dueDate);
    
    // Build the event object
    const event: Record<string, unknown> = {
      summary: task.title,
      description: task.notes || "",
    };

    // Add location if address is provided
    if (task.address) {
      event.location = task.address;
    }

    // Set the start and end times
    if (task.dueTime) {
      // Has a specific time - create a timed event
      const [hours, minutes] = task.dueTime.split(":").map(Number);
      const startDate = new Date(dueDate);
      startDate.setHours(hours, minutes, 0, 0);
      
      const endDate = new Date(startDate);
      endDate.setHours(endDate.getHours() + 1); // Default 1 hour duration

      event.start = {
        dateTime: startDate.toISOString(),
        timeZone: "America/Los_Angeles", // TODO: Get user's timezone
      };
      event.end = {
        dateTime: endDate.toISOString(),
        timeZone: "America/Los_Angeles",
      };
    } else {
      // All-day event
      const dateStr = dueDate.toISOString().split("T")[0];
      event.start = { date: dateStr };
      event.end = { date: dateStr };
    }

    // Create the event in Google Calendar
    const response = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      }
    );

    const data = await response.json();

    if (data.error) {
      console.error("Google Calendar API error:", data.error);
      return { success: false, error: data.error.message };
    }

    console.log("Event created in Google Calendar:", data.id);
    return { success: true, eventId: data.id };
  } catch (error) {
    console.error("Error syncing to Google Calendar:", error);
    return { success: false, error: String(error) };
  }
}

// Delete an event from Google Calendar
async function deleteGoogleCalendarEvent(
  accessToken: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (response.status === 204 || response.status === 200) {
      return { success: true };
    }

    const data = await response.json();
    return { success: false, error: data.error?.message || "Unknown error" };
  } catch (error) {
    console.error("Error deleting Google Calendar event:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      return new Response(
        JSON.stringify({ error: "Google Calendar not configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { action, task, eventId, taskIds } = await req.json() as RequestBody;

    // Get valid access token
    const accessToken = await getValidAccessToken(adminClient, user.id);
    
    if (!accessToken) {
      return new Response(
        JSON.stringify({ 
          error: "No valid Google Calendar connection",
          reconnect_required: true 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync_task" && task) {
      const result = await syncTaskToGoogleCalendar(accessToken, task);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_event" && eventId) {
      const result = await deleteGoogleCalendarEvent(accessToken, eventId);
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync_all") {
      // Sync all tasks marked for external sync
      const { data: tasksData, error: tasksError } = await adminClient
        .from("tasks")
        .select("*")
        .eq("user_id", user.id)
        .eq("sync_to_external_calendar", true);

      if (tasksError) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch tasks" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results = [];
      for (const taskData of tasksData || []) {
        if (!taskData.due_date) continue;
        
        const result = await syncTaskToGoogleCalendar(accessToken, {
          id: taskData.id,
          title: taskData.title,
          notes: taskData.notes,
          dueDate: taskData.due_date,
          dueTime: taskData.due_time,
          address: taskData.address,
        });
        
        results.push({ taskId: taskData.id, ...result });
      }

      return new Response(
        JSON.stringify({ success: true, results }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in sync-google-calendar:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
