import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clozze Pro product and prices
const PRO_PRICE_ID = "price_1SD8YkRkZlhjPqo6lctEkYcA"; // $9.99/mo base Pro (30-day trial configured on price)
const TEAM_SEAT_PRICE_ID = "price_1StwWwRkZlhjPqo6C2YuhMir"; // $9.99/mo per additional seat

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

const getRequestOrigin = (req: Request) => {
  const origin = req.headers.get("origin");
  if (origin) return origin;

  const referer = req.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).origin;
    } catch {
      // ignore
    }
  }

  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (forwardedHost) return `${forwardedProto}://${forwardedHost}`;

  return "https://lovable.dev";
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");
    
    const body = await req.json();
    
    // Accept either legacy priceId or new plan/seats format
    // Legacy: { priceId: "price_xxx" }
    // New: { plan: "pro" | "team", seats?: number }
    let plan = body?.plan as string | undefined;
    let seats = typeof body?.seats === 'number' ? body.seats : 0;
    const legacyPriceId = body?.priceId as string | undefined;
    
    // Handle legacy priceId format for backwards compatibility
    if (legacyPriceId && !plan) {
      if (legacyPriceId === PRO_PRICE_ID) {
        plan = 'pro';
        seats = 0;
      } else if (legacyPriceId === "price_1SD8YzRkZlhjPqo6IMzZB3Fc") {
        // Legacy team price - treat as pro + 1 seat
        plan = 'pro';
        seats = 1;
      }
    }
    
    // Default to 'pro' if no plan specified
    if (!plan) {
      plan = 'pro';
    }
    
    // Validate plan type
    if (plan !== 'pro' && plan !== 'team') {
      throw new Error(`Invalid plan type: ${plan}. Must be 'pro' or 'team'.`);
    }
    
    // 'team' is just 'pro' + seats
    if (plan === 'team' && seats < 1) {
      seats = 1; // Team plan requires at least 1 additional seat
    }
    
    logStep("Checkout params", { plan, seats });

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Look for existing customer with matching user ID in metadata
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    let customerId;
    
    // Find customer that matches this specific user ID
    const matchedCustomer = customers.data.find(
      (c: Stripe.Customer) => c.metadata?.supabase_user_id === user.id
    );
    
    if (matchedCustomer) {
      customerId = matchedCustomer.id;
      logStep("Found matched customer", { customerId });
      
      // Check if user already has an active subscription
      const existingSubs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 5,
      });
      
      if (existingSubs.data.length > 0) {
        // User already has a subscription - redirect to customer portal instead
        logStep("User already has active subscription - use customer portal to manage");
        throw new Error("You already have an active subscription. Use 'Manage Subscription' to modify your plan.");
      }
    } else {
      // Check for orphaned customer (no user ID set) and claim it
      const orphanedCustomer = customers.data.find(
        (c: Stripe.Customer) => !c.metadata?.supabase_user_id
      );
      
      if (orphanedCustomer) {
        // Update metadata to link to current user
        await stripe.customers.update(orphanedCustomer.id, {
          metadata: { supabase_user_id: user.id }
        });
        customerId = orphanedCustomer.id;
        logStep("Claimed orphaned customer", { customerId });
      } else {
        // Create new customer with user ID metadata
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id }
        });
        customerId = newCustomer.id;
        logStep("Created new customer", { customerId });
      }
    }

    // Build line items - always include Pro base, optionally add seats
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price: PRO_PRICE_ID,
        quantity: 1,
      },
    ];
    
    // Add team seat line item (quantity 0 or more)
    // Even if seats = 0, we include it so the subscription has both line items
    // This makes it easy to add seats later via subscription update
    if (seats > 0) {
      lineItems.push({
        price: TEAM_SEAT_PRICE_ID,
        quantity: seats,
      });
    }
    
    logStep("Line items prepared", { lineItems: lineItems.map(li => ({ price: li.price, qty: li.quantity })) });

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      client_reference_id: user.id, // Clozze user ID for webhook identification
      line_items: lineItems,
      mode: "subscription",
      allow_promotion_codes: true,
      metadata: {
        clozze_user_id: user.id,
        clozze_email: user.email,
        plan_type: seats > 0 ? 'team' : 'pro',
        initial_seats: seats.toString(),
      },
      success_url: `${getRequestOrigin(req)}/auth?session_id={CHECKOUT_SESSION_ID}&plan=${seats > 0 ? 'team' : 'pro'}&purchase_success=true`,
      cancel_url: `${getRequestOrigin(req)}/pricing`,
    });

    logStep("Checkout session created", { sessionId: session.id, plan: seats > 0 ? 'team' : 'pro', seats });

    return new Response(JSON.stringify({ url: session.url }), {
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
