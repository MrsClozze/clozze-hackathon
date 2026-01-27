import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-SUBSCRIPTION-DETAILS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscription: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // Fetch active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // Find the active or trialing subscription
    const activeSubscription = subscriptions.data.find(
      (sub: Stripe.Subscription) => sub.status === "active" || sub.status === "trialing"
    );

    if (!activeSubscription) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ subscription: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscriptionItem = activeSubscription.items?.data?.[0];
    const price = subscriptionItem?.price;
    const product = price?.product as string;

    // Map product IDs to plan names
    const PRO_PRODUCT_ID = "prod_T9RR0I88OJF8l0";
    const TEAM_PRODUCT_ID = "prod_T9RRLKSinSr7xt";
    
    let planName = "Pro";
    if (product === TEAM_PRODUCT_ID) {
      planName = "Team";
    } else if (product === PRO_PRODUCT_ID) {
      planName = "Pro";
    }

    const subscriptionDetails = {
      id: activeSubscription.id,
      status: activeSubscription.status,
      planName,
      productId: product,
      priceId: price?.id,
      amount: (price?.unit_amount || 0) / 100,
      currency: price?.currency?.toUpperCase() || 'USD',
      interval: price?.recurring?.interval || 'month',
      currentPeriodStart: activeSubscription.current_period_start 
        ? new Date(activeSubscription.current_period_start * 1000).toISOString() 
        : null,
      currentPeriodEnd: activeSubscription.current_period_end 
        ? new Date(activeSubscription.current_period_end * 1000).toISOString() 
        : null,
      cancelAtPeriodEnd: activeSubscription.cancel_at_period_end,
      cancelAt: activeSubscription.cancel_at 
        ? new Date(activeSubscription.cancel_at * 1000).toISOString() 
        : null,
      createdAt: activeSubscription.created 
        ? new Date(activeSubscription.created * 1000).toISOString() 
        : null,
    };

    logStep("Subscription details fetched", { subscriptionId: activeSubscription.id });

    return new Response(JSON.stringify({ subscription: subscriptionDetails }), {
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
