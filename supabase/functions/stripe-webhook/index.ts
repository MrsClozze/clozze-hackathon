import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Product IDs for plan mapping
const PRO_PRODUCT_ID = "prod_T9RR0I88OJF8l0";
const TEAM_PRODUCT_ID = "prod_T9RRLKSinSr7xt";
const TEAM_MEMBER_ADDON_PRODUCT_ID = "prod_TrfsLS44eabjDh";

// Price IDs to Product mapping (for when product isn't expanded)
const PRO_PRICE_ID = "price_1Swo7ODFKg8bCIsk0ZGRJDVa";
const TEAM_SEAT_PRICE_ID = "price_1Swo7cDFKg8bCIskRcjBLk1k";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

/**
 * Determine plan type from subscription items
 * Checks both product IDs and price IDs to handle all cases
 */
function determinePlanType(subscription: Stripe.Subscription): 'pro' | 'team' | 'free' {
  const items = subscription.items?.data ?? [];
  
  let hasPro = false;
  let hasTeamSeats = false;
  
  for (const item of items) {
    const productId = item.price?.product as string;
    const priceId = item.price?.id as string;
    
    // Check by product ID first
    if (productId === PRO_PRODUCT_ID) {
      hasPro = true;
    }
    // Also check by price ID as fallback (when product isn't expanded)
    if (priceId === PRO_PRICE_ID) {
      hasPro = true;
    }
    
    if ((productId === TEAM_MEMBER_ADDON_PRODUCT_ID || priceId === TEAM_SEAT_PRICE_ID) && (item.quantity ?? 0) > 0) {
      hasTeamSeats = true;
    }
    if (productId === TEAM_PRODUCT_ID) {
      // Legacy team product
      return 'team';
    }
  }
  
  logStep("determinePlanType result", { hasPro, hasTeamSeats, itemCount: items.length });
  
  if (hasPro && hasTeamSeats) {
    return 'team';
  }
  if (hasPro) {
    return 'pro';
  }
  
  return 'free';
}

/**
 * Map Stripe subscription status to app status
 */
function mapStatus(stripeStatus: string): 'trial' | 'active' | 'canceled' | 'past_due' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trial';
    case 'past_due':
      return 'past_due';
    default:
      return 'canceled';
  }
}

/**
 * Get team seat quantity from subscription
 */
function getTeamSeatCount(subscription: Stripe.Subscription): number {
  const items = subscription.items?.data ?? [];
  for (const item of items) {
    const productId = item.price?.product as string;
    if (productId === TEAM_MEMBER_ADDON_PRODUCT_ID) {
      return item.quantity ?? 0;
    }
  }
  return 0;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
    apiVersion: "2025-08-27.basil" 
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const signature = req.headers.get("stripe-signature");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!signature) {
      logStep("Missing stripe-signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const body = await req.text();
    let event: Stripe.Event;

    if (webhookSecret) {
      try {
        event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err);
        logStep("Webhook signature verification failed", { error: errMsg });
        return new Response(JSON.stringify({ error: `Webhook Error: ${errMsg}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }
    } else {
      // Development fallback - parse without verification (NOT for production)
      logStep("WARNING: No webhook secret configured - parsing without verification");
      event = JSON.parse(body) as Stripe.Event;
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        
        // Get user ID from client_reference_id (primary) or metadata (fallback)
        let userId = session.client_reference_id || session.metadata?.clozze_user_id;
        const customerEmail = session.customer_details?.email || session.customer_email;
        
        logStep("Processing checkout completion", { 
          userId, 
          customerEmail,
          customerId: session.customer,
          subscriptionId: session.subscription 
        });
        
        // Handle guest checkout - create user if needed
        if (!userId && customerEmail) {
          logStep("Guest checkout detected, checking for existing user", { email: customerEmail });
          
          // Check if user with this email already exists
          const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
          const matchedUser = existingUser?.users.find(u => u.email?.toLowerCase() === customerEmail.toLowerCase());
          
          if (matchedUser) {
            userId = matchedUser.id;
            logStep("Found existing user for guest checkout", { userId });
            
            // Update Stripe customer metadata with user ID
            if (session.customer) {
              await stripe.customers.update(session.customer as string, {
                metadata: { supabase_user_id: userId }
              });
            }
          } else {
            // Create new user account
            logStep("Creating new user for guest checkout", { email: customerEmail });
            
            // Generate a random password - user will reset it
            const tempPassword = crypto.randomUUID() + crypto.randomUUID();
            
            const { data: newUser, error: createError } = await supabaseClient.auth.admin.createUser({
              email: customerEmail,
              password: tempPassword,
              email_confirm: true, // Auto-confirm since they paid
              user_metadata: {
                created_via: 'stripe_checkout',
              }
            });
            
            if (createError) {
              logStep("Failed to create user", { error: createError.message });
            } else if (newUser?.user) {
              userId = newUser.user.id;
              logStep("Created new user", { userId });
              
              // Update Stripe customer metadata with user ID
              if (session.customer) {
                await stripe.customers.update(session.customer as string, {
                  metadata: { supabase_user_id: userId }
                });
              }
              
              // Send password reset email so user can set their password
              const { error: resetError } = await supabaseClient.auth.admin.generateLink({
                type: 'recovery',
                email: customerEmail,
              });
              
              if (resetError) {
                logStep("Failed to generate password reset link", { error: resetError.message });
              } else {
                logStep("Password reset link generated for new user");
              }
            }
          }
        }
        
        if (!userId) {
          logStep("No user ID found in checkout session", { sessionId: session.id });
          break;
        }
        
        // Fetch the subscription to get details
        if (session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
          const planType = determinePlanType(subscription);
          const appStatus = mapStatus(subscription.status);
          const seatCount = getTeamSeatCount(subscription);
          
          const periodEnd = typeof subscription.current_period_end === 'number'
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
          
          const trialEnd = subscription.trial_end 
            ? new Date(subscription.trial_end * 1000).toISOString()
            : null;
          
          // Upsert subscription record
          const { error: upsertError } = await supabaseClient
            .from('subscriptions')
            .upsert({
              user_id: userId,
              plan_type: planType,
              status: appStatus,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              current_period_end: periodEnd,
              trial_end: trialEnd,
            }, { onConflict: 'user_id' });
          
          if (upsertError) {
            logStep("Failed to upsert subscription", { error: upsertError.message });
          } else {
            logStep("Subscription record created/updated", { userId, planType, appStatus });
          }
          
          // Update team member slots if applicable
          if (seatCount > 0) {
            const seatItem = subscription.items.data.find(
              (item: Stripe.SubscriptionItem) => (item.price?.product as string) === TEAM_MEMBER_ADDON_PRODUCT_ID
            );
            
            await supabaseClient
              .from('team_member_slots')
              .upsert({
                user_id: userId,
                total_slots: seatCount,
                stripe_subscription_id: subscription.id,
                stripe_subscription_item_id: seatItem?.id || null,
              }, { onConflict: 'user_id' });
            
            logStep("Team member slots updated", { userId, seatCount });
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by customer ID
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const userId = customer.metadata?.supabase_user_id;
        
        if (!userId) {
          logStep("No user ID in customer metadata", { customerId });
          break;
        }
        
        const planType = determinePlanType(subscription);
        const appStatus = mapStatus(subscription.status);
        const seatCount = getTeamSeatCount(subscription);
        
        const periodEnd = typeof subscription.current_period_end === 'number'
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;
        
        const trialEnd = subscription.trial_end 
          ? new Date(subscription.trial_end * 1000).toISOString()
          : null;
        
        // Update subscription record
        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .upsert({
            user_id: userId,
            plan_type: planType,
            status: appStatus,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            current_period_end: periodEnd,
            trial_end: trialEnd,
          }, { onConflict: 'user_id' });
        
        if (updateError) {
          logStep("Failed to update subscription", { error: updateError.message });
        } else {
          logStep("Subscription updated", { userId, planType, appStatus });
        }
        
        // Update team member slots
        const seatItem = subscription.items.data.find(
          (item: Stripe.SubscriptionItem) => (item.price?.product as string) === TEAM_MEMBER_ADDON_PRODUCT_ID
        );
        
        if (seatCount > 0) {
          await supabaseClient
            .from('team_member_slots')
            .upsert({
              user_id: userId,
              total_slots: seatCount,
              stripe_subscription_id: subscription.id,
              stripe_subscription_item_id: seatItem?.id || null,
            }, { onConflict: 'user_id' });
          
          logStep("Team member slots updated", { userId, seatCount });
        } else {
          // Remove slots if quantity is 0
          await supabaseClient
            .from('team_member_slots')
            .delete()
            .eq('user_id', userId);
          
          logStep("Team member slots removed", { userId });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        
        // Find user by customer ID
        const customerId = subscription.customer as string;
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const userId = customer.metadata?.supabase_user_id;
        
        if (!userId) {
          logStep("No user ID in customer metadata", { customerId });
          break;
        }
        
        // Mark subscription as canceled
        const { error: updateError } = await supabaseClient
          .from('subscriptions')
          .update({
            status: 'canceled',
            plan_type: 'free',
          })
          .eq('user_id', userId);
        
        if (updateError) {
          logStep("Failed to cancel subscription", { error: updateError.message });
        } else {
          logStep("Subscription canceled", { userId });
        }
        
        // Remove team member slots
        await supabaseClient
          .from('team_member_slots')
          .delete()
          .eq('user_id', userId);
        
        logStep("Team member slots removed on cancellation", { userId });
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
