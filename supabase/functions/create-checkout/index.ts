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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const body = await req.json();
    const priceId = typeof body?.priceId === 'string' ? body.priceId.trim() : null;
    
    // Validate priceId format (Stripe price IDs start with "price_")
    if (!priceId || !priceId.startsWith('price_') || priceId.length > 100) {
      throw new Error("Invalid or missing Price ID");
    }

    // Map price IDs to plan types for analytics tracking
    const priceToPlnMap: Record<string, string> = {
      'price_1SD8YkRkZlhjPqo6lctEkYcA': 'pro',
      'price_1SD8YzRkZlhjPqo6IMzZB3Fc': 'team',
    };
    const planType = priceToPlnMap[priceId] || 'pro';

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Look for existing customer with matching user ID in metadata, or create new one
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    let customerId;
    
    // Find customer that matches this specific user ID
    const matchedCustomer = customers.data.find(
      (c: Stripe.Customer) => c.metadata?.supabase_user_id === user.id
    );
    
    if (matchedCustomer) {
      customerId = matchedCustomer.id;
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
      } else {
        // Create new customer with user ID metadata
        const newCustomer = await stripe.customers.create({
          email: user.email,
          metadata: { supabase_user_id: user.id }
        });
        customerId = newCustomer.id;
      }
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      allow_promotion_codes: true,
      success_url: `${getRequestOrigin(req)}/auth?session_id={CHECKOUT_SESSION_ID}&plan=${planType}&purchase_success=true`,
      cancel_url: `${getRequestOrigin(req)}/pricing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
