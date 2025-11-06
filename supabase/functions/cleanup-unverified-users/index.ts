import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Try to read body for targeted deletion by email; fallback to cleanup if none provided
    let requestedEmail: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.email === "string") {
        requestedEmail = body.email.trim();
      }
    } catch (_) {
      // No JSON body provided, proceed with cleanup
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    if (requestedEmail) {
      console.log(`Requested deletion for email: ${requestedEmail}`);

      // List users and find matching email
      const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (listError) throw listError;

      const target = usersData.users.find((u) => (u.email ?? "").toLowerCase() === requestedEmail!.toLowerCase());

      if (!target) {
        return new Response(
          JSON.stringify({ success: true, message: "User not found (already deleted)", email: requestedEmail }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      const userId = target.id;

      // Best-effort cleanup of public tables referencing the user
      const cleanupTables = [
        { table: "profiles", key: "id" },
        { table: "subscriptions", key: "user_id" },
        { table: "service_integrations", key: "user_id" },
        { table: "contacts", key: "user_id" },
        { table: "buyers", key: "user_id" },
        { table: "listings", key: "user_id" },
        { table: "tasks", key: "user_id" },
        { table: "team_members", key: "user_id" },
        { table: "agent_communication_preferences", key: "user_id" },
      ] as const;

      const cleanupResults: Record<string, any> = {};
      for (const { table, key } of cleanupTables) {
        const { error } = await supabaseAdmin.from(table).delete().eq(key, userId);
        cleanupResults[table] = error ? { ok: false, error: error.message } : { ok: true };
      }

      const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      if (deleteError) {
        console.error("Failed to delete auth user:", deleteError);
        return new Response(
          JSON.stringify({ error: deleteError.message, email: requestedEmail, cleanupResults }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, message: "User and related data deleted", email: requestedEmail, userId, cleanupResults }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fallback: cleanup unverified users older than 3 days
    console.log("Starting cleanup of unverified users...");

    // Calculate the cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffTimestamp = Math.floor(threeDaysAgo.getTime() / 1000);

    // List all users
    const { data: { users }, error: listError2 } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError2) throw listError2;

    const deletedUsers: string[] = [];
    const errors: any[] = [];

    // Filter and delete unverified users older than 3 days
    for (const user of users) {
      const createdAt = new Date(user.created_at).getTime() / 1000;
      const isUnverified = !user.email_confirmed_at;
      const isOld = createdAt < cutoffTimestamp;

      if (isUnverified && isOld) {
        console.log(`Deleting unverified user: ${user.email} (created: ${user.created_at})`);
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);
        if (deleteError) {
          console.error(`Failed to delete user ${user.email}:`, deleteError);
          errors.push({ email: user.email || 'unknown', error: deleteError.message });
        } else {
          deletedUsers.push(user.email || 'unknown');
        }
      }
    }

    console.log(`Cleanup complete. Deleted ${deletedUsers.length} unverified users.`);
    
    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: deletedUsers.length,
        deletedUsers,
        errors,
        message: `Successfully deleted ${deletedUsers.length} unverified users older than 3 days`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error during cleanup:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
