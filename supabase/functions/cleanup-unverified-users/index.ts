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
    console.log("Starting cleanup of unverified users...");
    
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Calculate the cutoff date (3 days ago)
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const cutoffTimestamp = Math.floor(threeDaysAgo.getTime() / 1000);

    // List all users
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) throw listError;

    const deletedUsers: string[] = [];
    const errors: any[] = [];

    // Filter and delete unverified users older than 3 days
    for (const user of users) {
      // Check if user is unverified and older than 3 days
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
