import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteUserRequest {
  email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email }: DeleteUserRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // List users and find by email (case-insensitive)
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(JSON.stringify({ error: listError.message }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = usersData.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());

    if (!user) {
      return new Response(JSON.stringify({ success: true, message: "User not found (already deleted)", email }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Best-effort cleanup of related public rows that reference the auth user
    // These operations use the service role and bypass RLS.
    const userId = user.id;

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
      if (error) {
        console.warn(`Cleanup warning on ${table}:`, error.message);
        cleanupResults[table] = { ok: false, error: error.message };
      } else {
        cleanupResults[table] = { ok: true };
      }
    }

    // Finally delete auth user
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error("Failed to delete auth user:", deleteError);
      return new Response(JSON.stringify({ error: deleteError.message, cleanupResults }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message: "User and related data deleted", email, userId, cleanupResults }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in delete-user-by-email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
};

serve(handler);
