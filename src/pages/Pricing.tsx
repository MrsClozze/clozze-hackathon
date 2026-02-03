import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { trackPurchase } from "@/lib/analytics";
import SubscriptionManagement from "@/components/subscription/SubscriptionManagement";

const plans = [
  {
    name: "Free Trial",
    price: "$0",
    period: "",
    description: "Explore every feature, no risk. Perfect for testing how AI can simplify your real estate deals.",
    features: [
      "Try for free for 30 days",
      "AI-powered document reading",
      "Timeline creation",
      "Automated reminders",
      "AI transaction coordination",
      "Advanced dashboards"
    ],
    plan: null, // No checkout for free
    seats: 0,
    planType: 'free',
    badge: "NEW"
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    description: "Automate your workflow and connect your favorite tools. Ideal for agents ready to work smarter.",
    features: [
      { text: "Multi-app syncing", badge: "NEW" },
      "User tracking and sales monitoring",
      "Multi-application syncing",
      "Custom tasks",
      "Automated reminders and workflows",
      "Unlimited deals",
      "30-day free trial included"
    ],
    plan: 'pro',
    seats: 0,
    planType: 'pro',
    badge: null,
    popular: true
  },
  {
    name: "Pro + Team Add-on",
    price: "$19.98",
    period: "/mo total",
    description: "Get Pro ($9.99/mo) plus one team seat ($9.99/mo). Perfect for agents who want to collaborate with an assistant or colleague.",
    features: [
      { text: "Everything in Pro", badge: "INCLUDED" },
      { text: "Shared team dashboards", badge: "NEW" },
      "One team member seat included",
      "Collaboration on shared deals",
      "Task delegation & management",
      "Advanced analytics & reporting"
    ],
    plan: 'team', // Use 'team' plan (Pro + seats) for non-Pro users
    seats: 1, // Default to 1 seat
    quantity: 1,
    planType: 'team',
    badge: null,
    isAddon: true
  }
];

function PlanSelection() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Track purchase event when returning from successful checkout
  useEffect(() => {
    const success = searchParams.get('success');
    const planType = searchParams.get('plan');
    
    if (success === 'true' && planType) {
      // Map plan type to price for GA4 tracking
      const priceMap: Record<string, number> = {
        'pro': 9.99,
        'team': 9.99
      };
      const purchaseValue = priceMap[planType] || 9.99;
      trackPurchase(purchaseValue);
      
      // Clean up URL params
      searchParams.delete('success');
      searchParams.delete('plan');
      setSearchParams(searchParams, { replace: true });
      
      toast({
        title: "Purchase Complete!",
        description: "Welcome to your new plan.",
      });
    }
  }, [searchParams, setSearchParams, toast]);

  const handleSignUp = async (planConfig: typeof plans[0]) => {
    const { plan, seats, planType } = planConfig;
    const quantity = (planConfig as any).quantity || 1;
    const isAddon = (planConfig as any).isAddon;
    
    if (!user) {
      // Redirect to auth with return URL for checkout
      let returnUrl: string;
      if (!plan) {
        returnUrl = '/auth';
      } else if (plan === 'seats') {
        returnUrl = `/checkout?plan=seats&quantity=${quantity}`;
      } else {
        returnUrl = `/checkout?plan=${plan}${seats > 0 ? `&seats=${seats}` : ''}`;
      }
      navigate(returnUrl === '/auth' ? '/auth' : `/auth?redirect=${encodeURIComponent(returnUrl)}`);
      return;
    }

    if (!plan) {
      toast({
        title: "You're already on the free trial!",
        description: "Upgrade to unlock more features.",
      });
      return;
    }

    // Check current subscription status
    const currentPlanType = subscription?.plan_type;
    const hasProAccess = currentPlanType === 'pro' || currentPlanType === 'team' || (currentPlanType as string) === 'enterprise';

    // For team add-on: if user already has Pro, add seats only; otherwise upgrade to Pro + Team
    if (isAddon && hasProAccess) {
      // Already on Pro - just add seats to existing subscription
      setLoading(planType);
      try {
        const { data, error } = await supabase.functions.invoke('create-checkout', {
          body: { plan: 'seats', quantity }
        });

        if (error) throw error;
        
        if (data?.url) {
          window.open(data.url, '_blank');
        }
      } catch (error: any) {
        toast({
          title: "Error creating checkout",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(null);
      }
      return;
    }

    // For all other cases (Pro plan, or Team add-on without Pro)
    setLoading(planType);
    
    try {
      // Team add-on for non-Pro users: checkout for Pro + 1 seat
      const checkoutPlan = isAddon ? 'team' : plan;
      const checkoutSeats = isAddon ? 1 : seats;
      
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { plan: checkoutPlan, seats: checkoutSeats }
      });

      if (error) throw error;
      
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({
        title: "Error creating checkout",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-text-heading mb-4">Choose Your Plan</h1>
        <p className="text-lg text-text-muted max-w-2xl mx-auto">
          Select the perfect plan for your real estate business
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto">
        {plans.map((plan) => {
          const isCurrentPlan = subscription?.plan_type === plan.planType;
          
          return (
            <Card
              key={plan.name}
              className={`p-8 relative ${
                plan.popular
                  ? 'border-primary shadow-lg ring-2 ring-primary'
                  : isCurrentPlan
                  ? 'border-primary'
                  : ''
              }`}
            >
              {plan.badge && (
                <div className="absolute top-4 right-4">
                  <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                    {plan.badge}
                  </span>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute top-4 left-4">
                  <span className="bg-secondary text-secondary-foreground text-xs px-2 py-1 rounded">
                    Your Plan
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-2xl font-bold text-text-heading mb-2">{plan.name}</h3>
                <div className="flex items-baseline mb-4">
                  <span className="text-5xl font-bold text-text-heading">{plan.price}</span>
                  {plan.period && <span className="text-text-muted ml-2">{plan.period}</span>}
                </div>
                <p className="text-text-muted text-sm">{plan.description}</p>
              </div>

              <Button
                className={`w-full mb-6 ${plan.planType === 'team' ? 'bg-primary hover:bg-primary/90 text-primary-foreground' : ''}`}
                variant={plan.popular ? "default" : plan.planType === 'team' ? "default" : "outline"}
                disabled={loading === plan.planType || isCurrentPlan}
                onClick={() => handleSignUp(plan)}
              >
                {loading === plan.planType
                  ? "Loading..."
                  : isCurrentPlan
                  ? "Current Plan"
                  : plan.planType === 'team' 
                    ? (subscription?.plan_type === 'pro' || subscription?.plan_type === 'team' || (subscription?.plan_type as string) === 'enterprise'
                      ? "Add Team Seats"
                      : "Get Started")
                    : "Sign Up"}
              </Button>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => {
                  const featureText = typeof feature === 'string' ? feature : feature.text;
                  const featureBadge = typeof feature === 'string' ? null : feature.badge;
                  
                  return (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-text-muted">
                        {featureText}
                        {featureBadge && (
                          <span className="ml-2 bg-muted text-text-muted text-xs px-1.5 py-0.5 rounded">
                            {featureBadge}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              
              {/* Footer note for team seats */}
              {plan.planType === 'team' && (
                <p className="mt-4 pt-4 border-t border-border text-xs text-text-muted">
                  Need more than one seat? You can add additional team members from the Team page after upgrading.
                </p>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default function Pricing() {
  const { subscription, loading } = useAuth();

  // Check if user has an active paid subscription (not trial or free)
  const hasActiveSubscription = subscription && 
    subscription.status === 'active' && 
    (subscription.plan_type === 'pro' || subscription.plan_type === 'team');

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {hasActiveSubscription ? (
        <div className="container mx-auto px-4 py-12 max-w-5xl">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-text-heading mb-2">Subscription</h1>
            <p className="text-lg text-text-muted">
              Manage your subscription, billing, and team members
            </p>
          </div>
          <SubscriptionManagement />
        </div>
      ) : (
        <PlanSelection />
      )}
    </Layout>
  );
}
