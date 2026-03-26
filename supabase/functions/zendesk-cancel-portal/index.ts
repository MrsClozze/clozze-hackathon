import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : "";
  console.log(`[ZENDESK-CANCEL-PORTAL] [${new Date().toISOString()}] ${step}${detailsStr}`);
};

const errorResponse = (message: string, status: number) =>
  new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status,
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405);
  }

  try {
    // 1. Authenticate via API key
    const zendeskKey = Deno.env.get("ZENDESK_API_KEY");
    if (!zendeskKey) {
      logStep("ERROR", { reason: "ZENDESK_API_KEY not configured" });
      return errorResponse("Server configuration error", 500);
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      logStep("AUTH_FAILED", { reason: "Missing or malformed Authorization header" });
      return errorResponse("Unauthorized", 401);
    }

    const providedKey = authHeader.replace("Bearer ", "");
    if (providedKey !== zendeskKey) {
      logStep("AUTH_FAILED", { reason: "Invalid API key" });
      return errorResponse("Unauthorized", 401);
    }

    // 2. Parse and validate request body
    let body: { email?: string };
    try {
      body = await req.json();
    } catch {
      return errorResponse("Invalid JSON body", 400);
    }

    const email = body.email?.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      logStep("VALIDATION_FAILED", { reason: "Invalid or missing email" });
      return errorResponse("A valid email address is required", 400);
    }

    logStep("REQUEST_RECEIVED", { email });

    // 3. Look up Supabase user by email
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) {
      logStep("ERROR", { reason: "Failed to list users", detail: listError.message });
      return errorResponse("Internal server error", 500);
    }

    const matchingUsers = userList.users.filter(
      (u) => u.email?.toLowerCase() === email
    );

    if (matchingUsers.length === 0) {
      logStep("USER_NOT_FOUND", { email });
      return errorResponse("No user found with that email address", 404);
    }

    if (matchingUsers.length > 1) {
      logStep("MULTIPLE_USERS", { email, count: matchingUsers.length });
      return errorResponse("Multiple users found with that email — manual resolution required", 409);
    }

    const userId = matchingUsers[0].id;
    logStep("USER_FOUND", { email, userId });

    // 4. Find matching Stripe customer
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      logStep("ERROR", { reason: "STRIPE_SECRET_KEY not configured" });
      return errorResponse("Server configuration error", 500);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email, limit: 10 });

    // Match by supabase_user_id metadata first
    let matchedCustomer = customers.data.find(
      (c: Stripe.Customer) => c.metadata?.supabase_user_id === userId
    );
    // Fall back to orphaned customer without user ID set
    if (!matchedCustomer) {
      matchedCustomer = customers.data.find(
        (c: Stripe.Customer) => !c.metadata?.supabase_user_id
      );
    }

    if (!matchedCustomer) {
      logStep("STRIPE_CUSTOMER_NOT_FOUND", { email, userId });
      return errorResponse("No Stripe customer found for this user", 404);
    }

    // Verify there aren't multiple viable customers
    const viableCustomers = customers.data.filter(
      (c: Stripe.Customer) =>
        c.metadata?.supabase_user_id === userId || !c.metadata?.supabase_user_id
    );
    if (viableCustomers.length > 1) {
      logStep("MULTIPLE_STRIPE_CUSTOMERS", { email, count: viableCustomers.length });
      return errorResponse("Multiple Stripe customers found — manual resolution required", 409);
    }

    logStep("STRIPE_CUSTOMER_FOUND", { email, customerId: matchedCustomer.id });

    // 5. Find active subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: matchedCustomer.id,
      status: "active",
      limit: 10,
    });

    let activeSubs = subscriptions.data;

    // Also check trialing subscriptions
    if (activeSubs.length === 0) {
      const trialingSubs = await stripe.subscriptions.list({
        customer: matchedCustomer.id,
        status: "trialing",
        limit: 10,
      });
      activeSubs = trialingSubs.data;
    }

    if (activeSubs.length === 0) {
      logStep("NO_ACTIVE_SUBSCRIPTION", { email });
      return errorResponse("No active subscription found for this user", 404);
    }

    if (activeSubs.length > 1) {
      logStep("MULTIPLE_SUBSCRIPTIONS", { email, count: activeSubs.length });
      return errorResponse("Multiple active subscriptions found — manual resolution required", 409);
    }

    const subscriptionId = activeSubs[0].id;
    logStep("SUBSCRIPTION_FOUND", { email, subscriptionId });

    // 6. Create Billing Portal session with cancellation flow
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: matchedCustomer.id,
      return_url: "https://app.clozze.io/",
      flow_data: {
        type: "subscription_cancel",
        subscription_cancel: {
          subscription: subscriptionId,
        },
      },
    });

    logStep("PORTAL_SESSION_CREATED", { email, success: true });

    return new Response(JSON.stringify({ url: portalSession.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("UNHANDLED_ERROR", { message: errorMessage });
    return errorResponse("An unexpected error occurred", 500);
  }
});
