import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Clozze Pro product and prices (LIVE)
const PRO_PRICE_ID = "price_1Swo7ODFKg8bCIsk0ZGRJDVa"; // $9.99/mo base Pro
const TEAM_SEAT_PRICE_ID = "price_1Swo7cDFKg8bCIskRcjBLk1k"; // $9.99/mo per additional seat

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
    let plan = body?.plan as string | undefined;
    let seats = typeof body?.seats === 'number' ? body.seats : 0;
    const quantity = typeof body?.quantity === 'number' ? body.quantity : 1;
    const legacyPriceId = body?.priceId as string | undefined;
    
    // Handle legacy priceId format for backwards compatibility
    if (legacyPriceId && !plan) {
      if (legacyPriceId === PRO_PRICE_ID) {
        plan = 'pro';
        seats = 0;
      } else if (legacyPriceId === "price_1SD8YzRkZlhjPqo6IMzZB3Fc") {
        plan = 'pro';
        seats = 1;
      }
    }
    
    // Default to 'pro' if no plan specified
    if (!plan) {
      plan = 'pro';
    }
    
    // Validate plan type - now supports 'seats' for standalone seat purchases
    if (plan !== 'pro' && plan !== 'team' && plan !== 'seats') {
      throw new Error(`Invalid plan type: ${plan}. Must be 'pro', 'team', or 'seats'.`);
    }
    
    // 'team' is just 'pro' + seats
    if (plan === 'team' && seats < 1) {
      seats = 1;
    }
    
    // For 'seats' plan, use quantity parameter
    const seatQuantity = plan === 'seats' ? Math.max(1, quantity) : seats;
    
    logStep("Checkout params", { plan, seats, seatQuantity });

    // Check if user is authenticated (optional for guest checkout)
    const authHeader = req.headers.get("Authorization");
    let user = null;
    let userEmail: string | null = null;
    let userId: string | null = null;
    
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data } = await supabaseClient.auth.getUser(token);
      user = data.user;
      if (user?.email) {
        userEmail = user.email;
        userId = user.id;
        logStep("Authenticated user", { userId, email: userEmail });
      }
    }
    
    // For guest checkout, we won't have user info - Stripe will collect email
    const isGuestCheckout = !userId;
    logStep("Checkout type", { isGuestCheckout });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    let customerId: string | undefined;
    
    // Only look up/create customer if we have a user
    if (userId && userEmail) {
      // Look for existing customer with matching user ID in metadata
      const customers = await stripe.customers.list({ email: userEmail, limit: 10 });
      
      // Find customer that matches this specific user ID
      const matchedCustomer = customers.data.find(
        (c: Stripe.Customer) => c.metadata?.supabase_user_id === userId
      );
      
      if (matchedCustomer) {
        customerId = matchedCustomer.id;
        logStep("Found matched customer", { customerId });
        
        // For 'seats' plan, we ALLOW existing subscriptions (they're adding to it)
        // For 'pro' or 'team' plans, check if they already have a subscription
        if (plan !== 'seats') {
          const existingSubs = await stripe.subscriptions.list({
            customer: customerId,
            status: "active",
            limit: 5,
          });
          
          if (existingSubs.data.length > 0) {
            logStep("User already has active subscription - use customer portal to manage");
            throw new Error("You already have an active subscription. Use 'Manage Subscription' to modify your plan.");
          }
        }
      } else {
        // Check for orphaned customer (no user ID set) and claim it
        const orphanedCustomer = customers.data.find(
          (c: Stripe.Customer) => !c.metadata?.supabase_user_id
        );
        
        if (orphanedCustomer) {
          await stripe.customers.update(orphanedCustomer.id, {
            metadata: { supabase_user_id: userId }
          });
          customerId = orphanedCustomer.id;
          logStep("Claimed orphaned customer", { customerId });
        } else {
          // Create new customer with user ID metadata
          const newCustomer = await stripe.customers.create({
            email: userEmail,
            metadata: { supabase_user_id: userId }
          });
          customerId = newCustomer.id;
          logStep("Created new customer", { customerId });
        }
      }
    }

    // Build line items based on plan type
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    
    if (plan === 'seats') {
      // Standalone seat purchase - only team seats, no Pro
      lineItems.push({
        price: TEAM_SEAT_PRICE_ID,
        quantity: seatQuantity,
      });
    } else {
      // Pro or Team plan - always includes Pro base
      lineItems.push({
        price: PRO_PRICE_ID,
        quantity: 1,
      });
      
      if (seats > 0) {
        lineItems.push({
          price: TEAM_SEAT_PRICE_ID,
          quantity: seats,
        });
      }
    }
    
    logStep("Line items prepared", { lineItems: lineItems.map(li => ({ price: li.price, qty: li.quantity })) });

    // Determine plan type for metadata
    let planType: string;
    let successRedirectPlan: string;
    if (plan === 'seats') {
      planType = 'seats_addon';
      successRedirectPlan = 'seats';
    } else if (seats > 0) {
      planType = 'team';
      successRedirectPlan = 'team';
    } else {
      planType = 'pro';
      successRedirectPlan = 'pro';
    }

    // Build checkout session config
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      line_items: lineItems,
      mode: "subscription",
      allow_promotion_codes: true,
      metadata: {
        plan_type: planType,
        initial_seats: (plan === 'seats' ? seatQuantity : seats).toString(),
      },
      success_url: `${getRequestOrigin(req)}/auth?session_id={CHECKOUT_SESSION_ID}&plan=${successRedirectPlan}&purchase_success=true`,
      cancel_url: `${getRequestOrigin(req)}/pricing`,
    };
    
    // Add 30-day free trial for Pro/Team plans (not for seats-only add-on)
    if (plan !== 'seats') {
      sessionConfig.subscription_data = {
        trial_period_days: 30,
      };
      logStep("Adding 30-day trial to subscription");
    }
    
    // Add customer info based on checkout type
    if (customerId) {
      sessionConfig.customer = customerId;
      sessionConfig.client_reference_id = userId!;
      sessionConfig.metadata!.clozze_user_id = userId!;
      sessionConfig.metadata!.clozze_email = userEmail!;
    } else {
      // Guest checkout - let Stripe collect email
      // We'll create/link the user in the webhook
      logStep("Guest checkout - Stripe will collect email");
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    logStep("Checkout session created", { 
      sessionId: session.id, 
      plan: planType, 
      seats: plan === 'seats' ? seatQuantity : seats,
      isGuest: isGuestCheckout 
    });

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
