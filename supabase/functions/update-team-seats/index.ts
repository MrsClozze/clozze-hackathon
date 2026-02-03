import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEAM_SEAT_PRICE_ID = "price_1StwWwRkZlhjPqo6C2YuhMir";
const PRO_PRODUCT_ID = "prod_T9RR0I88OJF8l0";
const TEAM_MEMBER_ADDON_PRODUCT_ID = "prod_TrfsLS44eabjDh";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[UPDATE-TEAM-SEATS] ${step}${detailsStr}`);
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

    const { action, quantity } = await req.json();
    
    // action: 'add' | 'remove' | 'set'
    // quantity: number of seats to add/remove, or total seats for 'set'
    
    if (!action || !['add', 'remove', 'set'].includes(action)) {
      throw new Error("Invalid action. Must be 'add', 'remove', or 'set'.");
    }
    
    if (typeof quantity !== 'number' || quantity < 0) {
      throw new Error("Quantity must be a non-negative number.");
    }

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Handle @clozze.io internal users - update database directly without Stripe
    if (user.email.endsWith('@clozze.io') && user.email_confirmed_at) {
      logStep("Internal user detected - updating slots directly", { action, quantity });
      
      const { data: existingSlots } = await supabaseClient
        .from('team_member_slots')
        .select('total_slots')
        .eq('user_id', user.id)
        .maybeSingle();
      
      const currentSlots = existingSlots?.total_slots || 0;
      let newTotalSlots: number;
      
      switch (action) {
        case 'add':
          newTotalSlots = currentSlots + quantity;
          break;
        case 'remove':
          newTotalSlots = Math.max(0, currentSlots - quantity);
          break;
        case 'set':
          newTotalSlots = quantity;
          break;
        default:
          newTotalSlots = currentSlots;
      }
      
      await supabaseClient
        .from('team_member_slots')
        .upsert({
          user_id: user.id,
          total_slots: newTotalSlots,
          stripe_subscription_id: 'internal_clozze',
          stripe_subscription_item_id: 'internal_clozze',
        }, { onConflict: 'user_id' });
      
      logStep("Internal user slots updated", { newTotalSlots });
      
      return new Response(JSON.stringify({ 
        success: true,
        totalSlots: newTotalSlots,
        internalUser: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2025-08-27.basil" 
    });
    
    // Find customer
    const customers = await stripe.customers.list({ email: user.email, limit: 10 });
    const matchedCustomer = customers.data.find(
      (c: Stripe.Customer) => c.metadata?.supabase_user_id === user.id
    );
    
    if (!matchedCustomer) {
      throw new Error("No Stripe customer found. Please subscribe to a Pro plan first.");
    }
    
    const customerId = matchedCustomer.id;
    logStep("Found customer", { customerId });

    // Find active subscription with Pro product
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    let targetSubscription: Stripe.Subscription | null = null;
    let proItemId: string | null = null;
    let seatItemId: string | null = null;
    let currentSeatQuantity = 0;

    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const productId = item.price.product as string;
        if (productId === PRO_PRODUCT_ID) {
          targetSubscription = sub;
          proItemId = item.id;
        }
        if (productId === TEAM_MEMBER_ADDON_PRODUCT_ID) {
          seatItemId = item.id;
          currentSeatQuantity = item.quantity || 0;
        }
      }
      if (targetSubscription) break;
    }

    if (!targetSubscription || !proItemId) {
      throw new Error("No active Pro subscription found. Please subscribe to a Pro plan first.");
    }

    logStep("Found subscription", { 
      subscriptionId: targetSubscription.id, 
      proItemId,
      seatItemId,
      currentSeatQuantity 
    });

    // Calculate new seat quantity
    let newSeatQuantity: number;
    switch (action) {
      case 'add':
        newSeatQuantity = currentSeatQuantity + quantity;
        break;
      case 'remove':
        newSeatQuantity = Math.max(0, currentSeatQuantity - quantity);
        break;
      case 'set':
        newSeatQuantity = quantity;
        break;
      default:
        newSeatQuantity = currentSeatQuantity;
    }

    logStep("Updating seat quantity", { currentSeatQuantity, newSeatQuantity });

    // Update subscription
    const updateItems: Stripe.SubscriptionUpdateParams.Item[] = [];

    if (seatItemId) {
      // Update existing seat line item
      if (newSeatQuantity > 0) {
        updateItems.push({
          id: seatItemId,
          quantity: newSeatQuantity,
        });
      } else {
        // Remove seat line item if quantity is 0
        updateItems.push({
          id: seatItemId,
          deleted: true,
        });
      }
    } else if (newSeatQuantity > 0) {
      // Add new seat line item
      updateItems.push({
        price: TEAM_SEAT_PRICE_ID,
        quantity: newSeatQuantity,
      });
    }

    if (updateItems.length > 0) {
      const updatedSub = await stripe.subscriptions.update(targetSubscription.id, {
        items: updateItems,
        proration_behavior: 'create_prorations',
      });

      logStep("Subscription updated", { subscriptionId: updatedSub.id, newSeatQuantity });

      // Update local database
      const newSeatItem = updatedSub.items.data.find(
        (item: Stripe.SubscriptionItem) => (item.price.product as string) === TEAM_MEMBER_ADDON_PRODUCT_ID
      );

      if (newSeatQuantity > 0) {
        await supabaseClient
          .from('team_member_slots')
          .upsert({
            user_id: user.id,
            total_slots: newSeatQuantity,
            stripe_subscription_id: updatedSub.id,
            stripe_subscription_item_id: newSeatItem?.id || null,
          }, { onConflict: 'user_id' });
      } else {
        await supabaseClient
          .from('team_member_slots')
          .delete()
          .eq('user_id', user.id);
      }
    }

    return new Response(JSON.stringify({ 
      success: true,
      totalSlots: newSeatQuantity,
      subscriptionId: targetSubscription.id
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
