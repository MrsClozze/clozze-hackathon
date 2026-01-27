import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

const TEAM_MEMBER_PRICE_ID = "price_1StwWwRkZlhjPqo6C2YuhMir";
const PRO_PRODUCT_ID = "prod_T9RR0I88OJF8l0";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TEAM-MEMBER-CHECKOUT] ${step}${detailsStr}`);
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

    const { quantity } = await req.json();
    
    if (!quantity || quantity < 1) {
      throw new Error("Quantity must be at least 1");
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Handle @clozze.io internal users - grant slots directly without Stripe
    if (user.email.endsWith('@clozze.io')) {
      logStep("Internal user detected - granting slots directly", { quantity });
      
      // Get existing slots or create new record
      const { data: existingSlots } = await supabaseClient
        .from('team_member_slots')
        .select('total_slots')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const currentSlots = existingSlots?.total_slots || 0;
      const newTotalSlots = currentSlots + quantity;
      
      await supabaseClient
        .from('team_member_slots')
        .upsert({
          user_id: user.id,
          total_slots: newTotalSlots,
          stripe_subscription_id: 'internal_clozze',
          stripe_subscription_item_id: 'internal_clozze',
        }, { onConflict: 'user_id' });
      
      logStep("Slots granted to internal user", { newTotalSlots });
      
      return new Response(JSON.stringify({ 
        success: true,
        internalUser: true,
        totalSlots: newTotalSlots
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Check if user has a Stripe customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing customer", { customerId });
      
      // Check if customer has an active Pro subscription
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 10,
      });
      
      const hasProSubscription = subscriptions.data.some((sub: any) => 
        sub.items.data.some((item: any) => item.price.product === PRO_PRODUCT_ID)
      );
      
      if (!hasProSubscription) {
        logStep("User does not have Pro subscription");
        return new Response(JSON.stringify({ 
          error: "Pro subscription required",
          requiresPro: true 
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
      logStep("User has Pro subscription");
    } else {
      logStep("No customer found - Pro subscription required");
      return new Response(JSON.stringify({ 
        error: "Pro subscription required",
        requiresPro: true 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Create checkout session for team member add-on
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: TEAM_MEMBER_PRICE_ID,
          quantity: quantity,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${getRequestOrigin(req)}/team?checkout_success=true&slots=${quantity}`,
      cancel_url: `${getRequestOrigin(req)}/team`,
      metadata: {
        user_id: user.id,
        type: "team_member_addon",
        quantity: quantity.toString(),
      },
    });

    logStep("Checkout session created", { sessionId: session.id, quantity });

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
