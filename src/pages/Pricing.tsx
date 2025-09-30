import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const plans = [
  {
    name: "Free website",
    price: "$0",
    period: "",
    description: "Explore every feature, no risk. Perfect for testing how AI can simplify your real estate deals.",
    features: [
      "Try for free for 1 month",
      "AI-powered document reading",
      "Timeline creation",
      "Automated reminders",
      "AI transaction coordination",
      "Advanced dashboards"
    ],
    priceId: null,
    planType: 'free',
    badge: "NEW"
  },
  {
    name: "Pro",
    price: "$9.99",
    period: "/mo",
    description: "Automate your workflow and connect your favorite tools. Ideal for agents ready to work smarter.",
    features: [
      "Multi-app syncing",
      "User tracking and sales monitoring",
      "Multi-application syncing",
      "Custom tasks",
      "Automated reminders and workflows",
      "Unlimited deals"
    ],
    priceId: "price_1SD8YkRkZlhjPqo6lctEkYcA",
    planType: 'pro',
    badge: "NEW",
    popular: true
  },
  {
    name: "Team",
    price: "$49",
    period: "/mo",
    description: "Built for teams and brokerages. Collaborate, manage users, and track every deal together.",
    features: [
      "Team dashboards: Track your teams deal flows",
      "Admin tools",
      "Bulk onboarding",
      "Collaboration on shared deals",
      "Advanced analytics & reporting",
      "Sales monitoring"
    ],
    priceId: "price_1SD8YzRkZlhjPqo6IMzZB3Fc",
    planType: 'team',
    badge: "NEW"
  }
];

export default function Pricing() {
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const handleSignUp = async (priceId: string | null, planType: string) => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!priceId) {
      // Free plan
      toast({
        title: "You're already on the free trial!",
        description: "Upgrade to unlock more features.",
      });
      return;
    }

    setLoading(planType);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
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
    <Layout>
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
                  className="w-full mb-6"
                  variant={plan.popular ? "default" : "outline"}
                  disabled={loading === plan.planType || isCurrentPlan}
                  onClick={() => handleSignUp(plan.priceId, plan.planType)}
                >
                  {loading === plan.planType
                    ? "Loading..."
                    : isCurrentPlan
                    ? "Current Plan"
                    : "Sign Up"}
                </Button>

                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-text-muted">{feature}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
