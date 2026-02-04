import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CALDAV_BASE_URL = "https://caldav.icloud.com";

interface TaskToSync {
  id: string;
  title: string;
  notes?: string;
  dueDate: string;
  dueTime?: string;
  endTime?: string;
  address?: string;
  timezone?: string;
}

interface RequestBody {
  action: "sync_task" | "delete_event" | "sync_all" | "pull_events";
  task?: TaskToSync;
  eventId?: string;
  taskId?: string;
  taskIds?: string[];
}

interface AppleCalendarCredentials {
  appleId: string;
  appPassword: string;
  principalUrl?: string;
  calendarUrl?: string;
}

// deno-lint-ignore no-explicit-any
type SupabaseAdminClient = any;

// Get Apple Calendar credentials from vault
async function getAppleCredentials(
  adminClient: SupabaseAdminClient,
  userId: string
): Promise<AppleCalendarCredentials | null> {
  try {
    // Get the calendar connection with vault reference
    const { data: connection, error: connError } = await adminClient
      .from("calendar_connections")
      .select("id, provider_email, vault_secret_id")
      .eq("user_id", userId)
      .eq("provider", "apple")
      .single();

    if (connError || !connection) {
      console.error("No Apple Calendar connection found:", connError);
      return null;
    }

    if (!connection.vault_secret_id) {
      console.error("No vault secret ID found for Apple connection");
      return null;
    }

    // Retrieve the app-specific password from vault
    const { data: vaultData, error: vaultError } = await adminClient
      .from("vault.decrypted_secrets")
      .select("decrypted_secret")
      .eq("id", connection.vault_secret_id)
      .single();

    if (vaultError || !vaultData) {
      console.error("Failed to retrieve vault secret:", vaultError);
      return null;
    }

    // Parse the vault secret (stored as JSON object)
    // deno-lint-ignore no-explicit-any
    const secretData: any = typeof vaultData.decrypted_secret === "string"
      ? JSON.parse(vaultData.decrypted_secret)
      : vaultData.decrypted_secret;

    return {
      appleId: String(connection.provider_email || ""),
      appPassword: secretData.access_token, // App-specific password stored as access_token
    };
  } catch (error) {
    console.error("Error getting Apple credentials:", error);
    return null;
  }
}

// Discover the user's principal and calendar URLs
async function discoverCalendarUrl(
  credentials: AppleCalendarCredentials
): Promise<{ principalUrl: string; calendarUrl: string } | null> {
  try {
    const authHeader = `Basic ${btoa(`${credentials.appleId}:${credentials.appPassword}`)}`;

    // Step 1: Get current user principal
    const principalResponse = await fetch(`${CALDAV_BASE_URL}/`, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader,
        Depth: "0",
        "Content-Type": "application/xml",
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <D:propfind xmlns:D="DAV:">
          <D:prop>
            <D:current-user-principal/>
          </D:prop>
        </D:propfind>`,
    });

    if (!principalResponse.ok && principalResponse.status !== 207) {
      console.error("Failed to get principal:", principalResponse.status);
      return null;
    }

    const principalXml = await principalResponse.text();
    
    // Parse principal URL from XML (simple regex extraction)
    const principalMatch = principalXml.match(/<D:href[^>]*>([^<]+)<\/D:href>/i);
    if (!principalMatch) {
      console.error("Could not parse principal URL from:", principalXml.substring(0, 500));
      return null;
    }
    
    const principalUrl = principalMatch[1];
    console.log("Found principal URL:", principalUrl);

    // Step 2: Get calendar home set
    const homeResponse = await fetch(`${CALDAV_BASE_URL}${principalUrl}`, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader,
        Depth: "0",
        "Content-Type": "application/xml",
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
          <D:prop>
            <C:calendar-home-set/>
          </D:prop>
        </D:propfind>`,
    });

    if (!homeResponse.ok && homeResponse.status !== 207) {
      console.error("Failed to get calendar home:", homeResponse.status);
      return null;
    }

    const homeXml = await homeResponse.text();
    
    // Parse calendar home URL
    const homeMatch = homeXml.match(/<D:href[^>]*>([^<]*calendar[^<]*)<\/D:href>/i) ||
                      homeXml.match(/<D:href[^>]*>([^<]+)<\/D:href>/g);
    
    let calendarHomeUrl = principalUrl; // Fallback to principal URL
    if (homeMatch && typeof homeMatch === "object" && homeMatch[1]) {
      calendarHomeUrl = homeMatch[1];
    }
    
    console.log("Using calendar home URL:", calendarHomeUrl);

    // Step 3: List calendars and find the default one
    const calendarsResponse = await fetch(`${CALDAV_BASE_URL}${calendarHomeUrl}`, {
      method: "PROPFIND",
      headers: {
        Authorization: authHeader,
        Depth: "1",
        "Content-Type": "application/xml",
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:CS="http://calendarserver.org/ns/">
          <D:prop>
            <D:displayname/>
            <D:resourcetype/>
            <CS:getctag/>
          </D:prop>
        </D:propfind>`,
    });

    if (!calendarsResponse.ok && calendarsResponse.status !== 207) {
      console.error("Failed to list calendars:", calendarsResponse.status);
      return null;
    }

    const calendarsXml = await calendarsResponse.text();
    
    // Find a calendar URL (look for paths containing "calendar")
    const calendarMatches = calendarsXml.match(/<D:href[^>]*>([^<]+)<\/D:href>/g) || [];
    let calendarUrl = calendarHomeUrl;
    
    for (const match of calendarMatches) {
      const urlMatch = match.match(/<D:href[^>]*>([^<]+)<\/D:href>/);
      if (urlMatch && urlMatch[1] && urlMatch[1].includes("/calendars/")) {
        calendarUrl = urlMatch[1];
        break;
      }
    }
    
    console.log("Using calendar URL:", calendarUrl);

    return { principalUrl, calendarUrl };
  } catch (error) {
    console.error("Error discovering calendar URL:", error);
    return null;
  }
}

// Generate a unique UID for iCalendar events
function generateEventUid(taskId: string): string {
  return `clozze-${taskId}@clozze.app`;
}

// Format date/time for iCalendar (YYYYMMDDTHHMMSS format)
function formatICalDateTime(
  dateStr: string,
  timeStr?: string
): string {
  const [year, month, day] = dateStr.split("-");
  
  if (timeStr) {
    const [hours, minutes] = timeStr.split(":");
    return `${year}${month}${day}T${hours}${minutes}00`;
  }
  
  return `${year}${month}${day}`;
}

// Create iCalendar event string (VEVENT)
function createICalEvent(task: TaskToSync): string {
  const uid = generateEventUid(task.id);
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  
  const timezone = task.timezone || "America/Los_Angeles";
  
  let dtstart: string;
  let dtend: string;
  let dateParams = "";
  
  if (task.dueTime) {
    // Timed event
    dtstart = formatICalDateTime(task.dueDate, task.dueTime);
    
    if (task.endTime) {
      dtend = formatICalDateTime(task.dueDate, task.endTime);
    } else {
      // Default to 1 hour duration
      const [hours, minutes] = task.dueTime.split(":").map(Number);
      const endHours = (hours + 1) % 24;
      const endTime = `${String(endHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
      dtend = formatICalDateTime(task.dueDate, endTime);
    }
    
    dateParams = `;TZID=${timezone}`;
  } else {
    // All-day event
    dtstart = formatICalDateTime(task.dueDate);
    // For all-day events, DTEND is the next day
    const nextDay = new Date(task.dueDate);
    nextDay.setDate(nextDay.getDate() + 1);
    dtend = nextDay.toISOString().split("T")[0].replace(/-/g, "");
    dateParams = ";VALUE=DATE";
  }
  
  // Escape special characters in text fields
  const escapedTitle = (task.title || "").replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
  const escapedNotes = (task.notes || "").replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
  const escapedLocation = (task.address || "").replace(/[,;\\]/g, "\\$&").replace(/\n/g, "\\n");
  
  let icalEvent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Clozze//Calendar Sync//EN
BEGIN:VEVENT
UID:${uid}
DTSTAMP:${dtstamp}
DTSTART${dateParams}:${dtstart}
DTEND${dateParams}:${dtend}
SUMMARY:${escapedTitle}`;

  if (task.notes) {
    icalEvent += `\nDESCRIPTION:${escapedNotes}`;
  }
  
  if (task.address) {
    icalEvent += `\nLOCATION:${escapedLocation}`;
  }
  
  icalEvent += `
END:VEVENT
END:VCALENDAR`;

  return icalEvent;
}

// Sync a task to Apple Calendar via CalDAV PUT
async function syncTaskToAppleCalendar(
  credentials: AppleCalendarCredentials,
  calendarUrl: string,
  task: TaskToSync
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    const authHeader = `Basic ${btoa(`${credentials.appleId}:${credentials.appPassword}`)}`;
    const eventUid = generateEventUid(task.id);
    const eventUrl = `${CALDAV_BASE_URL}${calendarUrl}${eventUid}.ics`;
    
    const icalEvent = createICalEvent(task);
    
    console.log("Syncing event to Apple Calendar:", eventUrl);
    
    const response = await fetch(eventUrl, {
      method: "PUT",
      headers: {
        Authorization: authHeader,
        "Content-Type": "text/calendar; charset=utf-8",
        "If-None-Match": "*", // Create new or update existing
      },
      body: icalEvent,
    });
    
    if (response.status === 201 || response.status === 204 || response.ok) {
      console.log("Event synced to Apple Calendar:", eventUid);
      return { success: true, eventId: eventUid };
    }
    
    const errorText = await response.text();
    console.error("Apple Calendar PUT failed:", response.status, errorText);
    return { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` };
  } catch (error) {
    console.error("Error syncing to Apple Calendar:", error);
    return { success: false, error: String(error) };
  }
}

// Delete an event from Apple Calendar
async function deleteAppleCalendarEvent(
  credentials: AppleCalendarCredentials,
  calendarUrl: string,
  eventId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const authHeader = `Basic ${btoa(`${credentials.appleId}:${credentials.appPassword}`)}`;
    const eventUrl = `${CALDAV_BASE_URL}${calendarUrl}${eventId}.ics`;
    
    console.log("Deleting event from Apple Calendar:", eventUrl);
    
    const response = await fetch(eventUrl, {
      method: "DELETE",
      headers: {
        Authorization: authHeader,
      },
    });
    
    if (response.status === 204 || response.status === 200 || response.status === 404) {
      // 404 is ok - event may already be deleted
      return { success: true };
    }
    
    const errorText = await response.text();
    return { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` };
  } catch (error) {
    console.error("Error deleting Apple Calendar event:", error);
    return { success: false, error: String(error) };
  }
}

// Pull events from Apple Calendar for two-way sync
async function pullEventsFromAppleCalendar(
  credentials: AppleCalendarCredentials,
  calendarUrl: string,
  since?: Date
): Promise<{ success: boolean; events?: unknown[]; error?: string }> {
  try {
    const authHeader = `Basic ${btoa(`${credentials.appleId}:${credentials.appPassword}`)}`;
    
    // Use REPORT method with calendar-query to get events
    const startDate = since || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: last 30 days
    const endDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // Next year
    
    const startStr = startDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "").slice(0, 15) + "Z";
    const endStr = endDate.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "").slice(0, 15) + "Z";
    
    const response = await fetch(`${CALDAV_BASE_URL}${calendarUrl}`, {
      method: "REPORT",
      headers: {
        Authorization: authHeader,
        Depth: "1",
        "Content-Type": "application/xml",
      },
      body: `<?xml version="1.0" encoding="utf-8"?>
        <C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
          <D:prop>
            <D:getetag/>
            <C:calendar-data/>
          </D:prop>
          <C:filter>
            <C:comp-filter name="VCALENDAR">
              <C:comp-filter name="VEVENT">
                <C:time-range start="${startStr}" end="${endStr}"/>
              </C:comp-filter>
            </C:comp-filter>
          </C:filter>
        </C:calendar-query>`,
    });
    
    if (!response.ok && response.status !== 207) {
      const errorText = await response.text();
      return { success: false, error: `HTTP ${response.status}: ${errorText.substring(0, 200)}` };
    }
    
    const xml = await response.text();
    
    // Parse events from XML (basic parsing - extract calendar-data elements)
    const events: unknown[] = [];
    const eventMatches = xml.match(/<C:calendar-data[^>]*>([\s\S]*?)<\/C:calendar-data>/gi) || [];
    
    for (const match of eventMatches) {
      const icalData = match.replace(/<\/?C:calendar-data[^>]*>/gi, "").trim();
      
      // Skip events created by Clozze (to avoid duplication)
      if (icalData.includes("clozze-")) continue;
      
      // Parse basic event properties
      const uidMatch = icalData.match(/UID:(.+)/i);
      const summaryMatch = icalData.match(/SUMMARY:(.+)/i);
      const dtstartMatch = icalData.match(/DTSTART[^:]*:(.+)/i);
      const dtendMatch = icalData.match(/DTEND[^:]*:(.+)/i);
      const locationMatch = icalData.match(/LOCATION:(.+)/i);
      const descriptionMatch = icalData.match(/DESCRIPTION:(.+)/i);
      
      if (uidMatch && summaryMatch && dtstartMatch) {
        events.push({
          uid: uidMatch[1].trim(),
          summary: summaryMatch[1].trim().replace(/\\n/g, "\n").replace(/\\([,;\\])/g, "$1"),
          dtstart: dtstartMatch[1].trim(),
          dtend: dtendMatch?.[1]?.trim(),
          location: locationMatch?.[1]?.trim().replace(/\\n/g, "\n").replace(/\\([,;\\])/g, "$1"),
          description: descriptionMatch?.[1]?.trim().replace(/\\n/g, "\n").replace(/\\([,;\\])/g, "$1"),
        });
      }
    }
    
    console.log(`Pulled ${events.length} events from Apple Calendar`);
    return { success: true, events };
  } catch (error) {
    console.error("Error pulling events from Apple Calendar:", error);
    return { success: false, error: String(error) };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { action, task, eventId, taskId } = await req.json() as RequestBody;

    // Get Apple Calendar credentials
    const credentials = await getAppleCredentials(adminClient, user.id);
    
    if (!credentials) {
      return new Response(
        JSON.stringify({ 
          error: "No valid Apple Calendar connection",
          reconnect_required: true 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Discover calendar URL
    const discovery = await discoverCalendarUrl(credentials);
    
    if (!discovery) {
      return new Response(
        JSON.stringify({ error: "Failed to discover Apple Calendar. Please reconnect." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "sync_task" && task) {
      const result = await syncTaskToAppleCalendar(credentials, discovery.calendarUrl, task);
      
      // Store the Apple Calendar event ID in the task
      if (result.success && result.eventId && task.id) {
        // Use a separate field or append to existing external_calendar_event_id
        // For simplicity, we'll use a JSON format: {"google": "...", "apple": "..."}
        const { data: existingTask } = await adminClient
          .from("tasks")
          .select("external_calendar_event_id")
          .eq("id", task.id)
          .single();
        
        let eventIds: Record<string, string> = {};
        if (existingTask?.external_calendar_event_id) {
          try {
            eventIds = JSON.parse(existingTask.external_calendar_event_id);
          } catch {
            // If it's not JSON (old format from Google), preserve it
            eventIds = { google: existingTask.external_calendar_event_id };
          }
        }
        eventIds.apple = result.eventId;
        
        await adminClient
          .from("tasks")
          .update({ external_calendar_event_id: JSON.stringify(eventIds) })
          .eq("id", task.id);
          
        console.log("Stored Apple Calendar event ID in task:", task.id, result.eventId);
      }
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete_event") {
      let appleEventId = eventId;
      
      if (!appleEventId && taskId) {
        // Look up the Apple Calendar event ID from the task
        const { data: taskData, error: taskError } = await adminClient
          .from("tasks")
          .select("external_calendar_event_id")
          .eq("id", taskId)
          .eq("user_id", user.id)
          .single();
        
        if (taskError || !taskData?.external_calendar_event_id) {
          return new Response(
            JSON.stringify({ success: true, message: "No external event to delete" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        
        // Parse the event IDs JSON
        try {
          const eventIds = JSON.parse(taskData.external_calendar_event_id);
          appleEventId = eventIds.apple;
        } catch {
          // Old format - no Apple event
          return new Response(
            JSON.stringify({ success: true, message: "No Apple event to delete" }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      
      if (!appleEventId) {
        return new Response(
          JSON.stringify({ error: "No event ID provided" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      const result = await deleteAppleCalendarEvent(credentials, discovery.calendarUrl, appleEventId);
      
      // Update the task to remove Apple event ID
      if (result.success && taskId) {
        const { data: taskData } = await adminClient
          .from("tasks")
          .select("external_calendar_event_id")
          .eq("id", taskId)
          .single();
          
        if (taskData?.external_calendar_event_id) {
          try {
            const eventIds = JSON.parse(taskData.external_calendar_event_id);
            delete eventIds.apple;
            await adminClient
              .from("tasks")
              .update({ 
                external_calendar_event_id: Object.keys(eventIds).length > 0 
                  ? JSON.stringify(eventIds) 
                  : null 
              })
              .eq("id", taskId);
          } catch {
            // Ignore parse errors
          }
        }
      }
      
      return new Response(
        JSON.stringify(result),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "pull_events") {
      const result = await pullEventsFromAppleCalendar(credentials, discovery.calendarUrl);
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
        
        const result = await syncTaskToAppleCalendar(credentials, discovery.calendarUrl, {
          id: taskData.id,
          title: taskData.title,
          notes: taskData.notes,
          dueDate: taskData.due_date,
          dueTime: taskData.due_time,
          endTime: taskData.end_time,
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
    console.error("Error in sync-apple-calendar:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
