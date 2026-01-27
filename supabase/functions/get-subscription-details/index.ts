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

    // Map product IDs to plan names
    const PRO_PRODUCT_ID = "prod_T9RR0I88OJF8l0";
    const TEAM_PRODUCT_ID = "prod_T9RRLKSinSr7xt";
    const TEAM_MEMBER_PRODUCT_ID = "prod_T9RYlxkUl1DvRo";

    // Fetch active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });

    // Find active or trialing subscriptions
    const activeSubscriptions = subscriptions.data.filter(
      (sub: Stripe.Subscription) => sub.status === "active" || sub.status === "trialing"
    );

    if (activeSubscriptions.length === 0) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ subscription: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Prioritize main Pro/Team subscription over add-on subscriptions (like team member seats)
    let activeSubscription = activeSubscriptions.find((sub: Stripe.Subscription) => {
      const productId = sub.items?.data?.[0]?.price?.product as string;
      return productId === PRO_PRODUCT_ID || productId === TEAM_PRODUCT_ID;
    });

    // Fallback to first active subscription if no main subscription found
    if (!activeSubscription) {
      activeSubscription = activeSubscriptions[0];
    }

    const subscriptionItem = activeSubscription.items?.data?.[0];
    const price = subscriptionItem?.price;
    const product = price?.product as string;
    
    let planName = "Pro";
    if (product === TEAM_PRODUCT_ID) {
      planName = "Team";
    } else if (product === PRO_PRODUCT_ID) {
      planName = "Pro";
    } else if (product === TEAM_MEMBER_PRODUCT_ID) {
      planName = "Team Member Add-on";
    }

    const cps = activeSubscription.current_period_start;
    const cpe = activeSubscription.current_period_end;
    logStep("Period dates", { current_period_start: cps, current_period_end: cpe });

    const subscriptionDetails = {
      id: activeSubscription.id,
      status: activeSubscription.status,
      planName,
      productId: product,
      priceId: price?.id,
      amount: (price?.unit_amount || 0) / 100,
      currency: price?.currency?.toUpperCase() || 'USD',
      interval: price?.recurring?.interval || 'month',
      // Use explicit type checks (avoid falsy checks) to prevent accidentally returning null.
      currentPeriodStart: typeof cps === "number"
        ? new Date(cps * 1000).toISOString()
        : null,
      currentPeriodEnd: typeof cpe === "number"
        ? new Date(cpe * 1000).toISOString()
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
