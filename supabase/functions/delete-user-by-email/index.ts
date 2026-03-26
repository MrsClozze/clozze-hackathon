import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

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

    // Check if caller has admin role using service role client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: isAdmin, error: roleError } = await supabaseAdmin.rpc('is_admin', {
      _user_id: caller.id,
    });

    if (roleError || !isAdmin) {
      console.warn(`Unauthorized admin action attempt by user: ${caller.id} (${caller.email})`);
      return new Response(
        JSON.stringify({ error: "Forbidden: Admin privileges required" }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Proceed with deletion - caller is verified admin
    const { email }: DeleteUserRequest = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 254) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Admin ${caller.email} requesting deletion of user: ${email}`);

    // ========== STRIPE CLEANUP ==========
    // Cancel all active Stripe subscriptions for this email to prevent
    // subscription inheritance when the user re-registers
    const stripeCleanupResults: Record<string, any> = {};
    
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        
        // Find Stripe customer by email
        const customers = await stripe.customers.list({ email: email.toLowerCase(), limit: 10 });
        
        if (customers.data.length > 0) {
          console.log(`Found ${customers.data.length} Stripe customer(s) for email: ${email}`);
          
          for (const customer of customers.data) {
            // Cancel all subscriptions for this customer
            const subscriptions = await stripe.subscriptions.list({
              customer: customer.id,
              status: 'all',
              limit: 100,
            });

            const activeStatuses = ['active', 'trialing', 'past_due', 'unpaid'];
            const activeSubs = subscriptions.data.filter((s: Stripe.Subscription) => activeStatuses.includes(s.status));
            
            console.log(`Customer ${customer.id} has ${activeSubs.length} active subscription(s)`);
            
            for (const sub of activeSubs) {
              try {
                await stripe.subscriptions.cancel(sub.id);
                console.log(`Canceled subscription: ${sub.id}`);
                stripeCleanupResults[sub.id] = { ok: true, action: 'canceled' };
              } catch (cancelError: any) {
                console.warn(`Failed to cancel subscription ${sub.id}:`, cancelError.message);
                stripeCleanupResults[sub.id] = { ok: false, error: cancelError.message };
              }
            }
            
            // Optionally delete the Stripe customer entirely to prevent any data remnants
            try {
              await stripe.customers.del(customer.id);
              console.log(`Deleted Stripe customer: ${customer.id}`);
              stripeCleanupResults[`customer_${customer.id}`] = { ok: true, action: 'deleted' };
            } catch (deleteError: any) {
              console.warn(`Failed to delete Stripe customer ${customer.id}:`, deleteError.message);
              stripeCleanupResults[`customer_${customer.id}`] = { ok: false, error: deleteError.message };
            }
          }
        } else {
          console.log(`No Stripe customer found for email: ${email}`);
          stripeCleanupResults['customer'] = { ok: true, action: 'not_found' };
        }
      } catch (stripeError: any) {
        console.error("Stripe cleanup error:", stripeError.message);
        stripeCleanupResults['stripe'] = { ok: false, error: stripeError.message };
      }
    } else {
      console.warn("STRIPE_SECRET_KEY not configured - skipping Stripe cleanup");
      stripeCleanupResults['stripe'] = { ok: false, error: 'STRIPE_SECRET_KEY not configured' };
    }

    // ========== SUPABASE USER LOOKUP ==========
    // List users and find by email (case-insensitive)
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (listError) {
      console.error("Error listing users:", listError);
      return new Response(JSON.stringify({ error: listError.message, stripeCleanupResults }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const user = usersData.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase());

    if (!user) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User not found in auth (already deleted). Stripe cleanup completed.", 
        email,
        stripeCleanupResults 
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ========== SUPABASE DATA CLEANUP ==========
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
      { table: "team_member_slots", key: "user_id" },
      { table: "agent_communication_preferences", key: "user_id" },
      { table: "calendar_connections", key: "user_id" },
      { table: "calendar_events", key: "user_id" },
      { table: "whatsapp_integrations", key: "user_id" },
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
      return new Response(JSON.stringify({ error: deleteError.message, cleanupResults, stripeCleanupResults }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    console.log(`Admin ${caller.email} successfully deleted user: ${email} (${userId})`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "User, related data, and Stripe subscriptions deleted", 
        email, 
        userId, 
        cleanupResults,
        stripeCleanupResults,
        deletedBy: caller.email 
      }),
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
