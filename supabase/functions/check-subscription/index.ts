import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      logStep("No authorization header");
      return new Response(JSON.stringify({ error: "No authorization header provided" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !userData?.user) {
      logStep("Authentication failed", { error: userError?.message });
      return new Response(JSON.stringify({ error: "Authentication failed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const user = userData.user;
    if (!user?.email) {
      logStep("User email not available");
      return new Response(JSON.stringify({ error: "User email not available" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Grant access to verified @clozze.io email addresses
    // Additional security: only grant if email is verified
    if (user.email.endsWith('@clozze.io') && user.email_confirmed_at) {
      logStep("Verified Clozze.io user detected - granting internal access", { 
        userId: user.id, 
        email: user.email,
        emailVerifiedAt: user.email_confirmed_at 
      });
      return new Response(JSON.stringify({
        subscribed: true,
        product_id: 'clozze_internal',
        plan_type: 'team',
        status: 'active',
        subscription_end: null // No expiration for internal users
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if user is a team member (invited via team invitation flow)
    // These users have their subscription set locally without a Stripe subscription
    const { data: localSub } = await supabaseClient
      .from('subscriptions')
      .select('plan_type, status')
      .eq('user_id', user.id)
      .single();

    if (localSub?.plan_type === 'team_member' && localSub?.status === 'active') {
      logStep("Team member detected - granting team member access", { userId: user.id });
      return new Response(JSON.stringify({
        subscribed: true,
        product_id: 'team_member',
        plan_type: 'team_member',
        status: 'active',
        subscription_end: null
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false, plan_type: 'free', status: 'trial' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Find customer that matches this specific user ID via metadata
    // If no customer has matching metadata, check if ANY customer with this email has active subs
    // This handles both new accounts (with metadata) and legacy accounts (without metadata)
    let matchedCustomer = customers.data.find(
      (c: Stripe.Customer) => c.metadata?.supabase_user_id === user.id
    );
    
    // If no exact match, fall back to first customer BUT only if they don't have a different user_id set
    // This prevents email-based subscription inheritance from deleted accounts
    if (!matchedCustomer) {
      const orphanedCustomer = customers.data.find(
        (c: Stripe.Customer) => !c.metadata?.supabase_user_id
      );
      if (orphanedCustomer) {
        // Legacy customer without metadata - update it to link to current user
        try {
          await stripe.customers.update(orphanedCustomer.id, {
            metadata: { supabase_user_id: user.id }
          });
          matchedCustomer = orphanedCustomer;
          logStep("Linked orphaned customer to user", { customerId: orphanedCustomer.id, userId: user.id });
        } catch (e) {
          logStep("Failed to update customer metadata", { error: String(e) });
        }
      }
    }

    if (!matchedCustomer) {
      logStep("No customer matched this user ID - ignoring stale customers for different users");
      return new Response(JSON.stringify({ subscribed: false, plan_type: 'free', status: 'trial' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = matchedCustomer.id;
    logStep("Found Stripe customer", { customerId });

    // NOTE: promo-code / free-trial checkouts often create subscriptions in `trialing` state,
    // so we must not only look for `active`.
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 20,
    });

    // Products that count as primary plans (Pro/Team).
    // EXCLUDE the Team Member add-on product from plan evaluation.
    const PRO_PRODUCT_ID = "prod_T9RR0I88OJF8l0";
    const TEAM_PRODUCT_ID = "prod_T9RRLKSinSr7xt";
    const TEAM_MEMBER_ADDON_PRODUCT_ID = "prod_Tay3X0u5Vw4oNw"; // team-member add-on must be ignored

    const statusPriority: Record<string, number> = {
      active: 0,
      trialing: 1,
      past_due: 2,
      unpaid: 3,
    };

    const subs = subscriptions.data as Stripe.Subscription[];

    // Filter out subscriptions that ONLY contain the add-on product (not a plan).
    const planSubs = subs.filter((s: Stripe.Subscription) => {
      const products: string[] = (s.items?.data ?? []).map((item: Stripe.SubscriptionItem) => (item.price?.product as string) ?? '');
      // Accept if at least one product is a recognised plan (pro or team)
      return products.some((p: string) => p === PRO_PRODUCT_ID || p === TEAM_PRODUCT_ID);
    });

    const qualifyingSubs = planSubs
      .filter((s: Stripe.Subscription) => Object.prototype.hasOwnProperty.call(statusPriority, s.status))
      .sort((a: Stripe.Subscription, b: Stripe.Subscription) => {
        const pa = statusPriority[a.status] ?? 999;
        const pb = statusPriority[b.status] ?? 999;
        if (pa !== pb) return pa - pb;

        // Prefer the subscription that ends later if statuses tie
        const ea = typeof a.current_period_end === "number" ? a.current_period_end : 0;
        const eb = typeof b.current_period_end === "number" ? b.current_period_end : 0;
        return eb - ea;
      });

    const subscription = qualifyingSubs[0] ?? null;
    const hasQualifyingSub = Boolean(subscription);
    let productId: string | null = null;
    let subscriptionEnd: string | null = null;
    let planType: 'free' | 'pro' | 'team' = 'free';
    let appStatus: 'trial' | 'active' | 'canceled' | 'past_due' = 'trial';

    if (subscription) {
      // Guard against null/undefined current_period_end (prevents "Invalid time value")
      if (typeof subscription.current_period_end === "number") {
        const date = new Date(subscription.current_period_end * 1000);
        subscriptionEnd = Number.isFinite(date.getTime()) ? date.toISOString() : null;
      }

      const firstItem = subscription.items?.data?.[0];
      productId = (firstItem?.price?.product as string) || null;

      // Map product ID to plan type
      if (productId === 'prod_T9RR0I88OJF8l0') {
        planType = 'pro';
      } else if (productId === 'prod_T9RRLKSinSr7xt') {
        planType = 'team';
      }

      // Normalize Stripe subscription status -> app status
      if (subscription.status === 'active') appStatus = 'active';
      else if (subscription.status === 'trialing') appStatus = 'trial';
      else if (subscription.status === 'past_due') appStatus = 'past_due';
      else appStatus = 'canceled';

      logStep("Qualifying subscription found", {
        subscriptionId: subscription.id,
        stripeStatus: subscription.status,
        planType,
        endDate: subscriptionEnd,
      });
    }

    return new Response(JSON.stringify({
      subscribed: hasQualifyingSub,
      product_id: productId,
      plan_type: planType,
      status: appStatus,
      subscription_end: subscriptionEnd,
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
