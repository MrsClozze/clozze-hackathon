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
    // SECURITY: Verify caller is authenticated and has admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Missing authorization header" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Verify the caller's identity using anon client
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user: caller }, error: callerError } = await userClient.auth.getUser();
    
    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid token" }),
        { status: 401, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Check if caller has admin role
    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('is_admin', {
      _user_id: caller.id,
    });

    if (roleError || !isAdmin) {
      console.warn(`Unauthorized cleanup attempt by user: ${caller.id} (${caller.email})`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin privileges required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Try to read body for targeted deletion by email; fallback to cleanup if none provided
    let requestedEmail: string | undefined;
    try {
      const body = await req.json();
      if (body && typeof body.email === "string") {
        const emailCandidate = body.email.trim();
        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(emailCandidate) || emailCandidate.length > 254) {
          return new Response(
            JSON.stringify({ error: "Invalid email format" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
        requestedEmail = emailCandidate;
      }
    } catch (_) {
      // No JSON body provided, proceed with cleanup
    }

    if (requestedEmail) {
      console.log(`Admin ${caller.email} requested deletion for email: ${requestedEmail}`);

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
        { table: "calendar_connections", key: "user_id" },
        { table: "whatsapp_integrations", key: "user_id" },
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

      console.log(`Admin ${caller.email} successfully deleted user: ${requestedEmail} (${userId})`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "User and related data deleted", 
          email: requestedEmail, 
          userId, 
          cleanupResults,
          deletedBy: caller.email 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Fallback: cleanup unverified users older than 3 days
    console.log(`Admin ${caller.email} starting cleanup of unverified users...`);

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

    console.log(`Admin ${caller.email} cleanup complete. Deleted ${deletedUsers.length} unverified users.`);
    
    return new Response(
      JSON.stringify({
        success: true,
        deletedCount: deletedUsers.length,
        deletedUsers,
        errors,
        message: `Successfully deleted ${deletedUsers.length} unverified users older than 3 days`,
        triggeredBy: caller.email,
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