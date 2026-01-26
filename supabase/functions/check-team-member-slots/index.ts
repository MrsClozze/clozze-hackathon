import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEAM_MEMBER_PRODUCT_ID = "prod_TrfsLS44eabjDh";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-TEAM-MEMBER-SLOTS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        totalSlots: 0,
        usedSlots: 0,
        availableSlots: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found customer", { customerId });

    // Check for team member add-on subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let totalSlots = 0;
    let subscriptionId = null;
    let subscriptionItemId = null;

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        if (item.price.product === TEAM_MEMBER_PRODUCT_ID) {
          totalSlots += item.quantity || 0;
          subscriptionId = sub.id;
          subscriptionItemId = item.id;
          logStep("Found team member subscription", { 
            subscriptionId, 
            quantity: item.quantity 
          });
        }
      }
    }

    // Update or create team_member_slots record
    if (totalSlots > 0) {
      await supabaseClient
        .from('team_member_slots')
        .upsert({
          user_id: user.id,
          total_slots: totalSlots,
          stripe_subscription_id: subscriptionId,
          stripe_subscription_item_id: subscriptionItemId,
        }, { onConflict: 'user_id' });
    }

    // Get count of actual team members
    const { count: usedSlots } = await supabaseClient
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('team_id', user.id);

    const availableSlots = totalSlots - (usedSlots || 0);

    logStep("Returning slot info", { totalSlots, usedSlots: usedSlots || 0, availableSlots });

    return new Response(JSON.stringify({
      totalSlots,
      usedSlots: usedSlots || 0,
      availableSlots,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
