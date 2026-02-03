import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

/**
 * Checkout page that handles redirects from the marketing site (clozze.io)
 * 
 * Expected URL format: /checkout?plan=pro or /checkout?plan=pro&seats=2
 * 
 * This page supports both authenticated and guest checkout:
 * - Authenticated users: Links subscription to their account
 * - Guest users: Stripe collects email, account created after payment
 */
export default function Checkout() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const plan = searchParams.get("plan") || "pro";
  const seats = parseInt(searchParams.get("seats") || "0", 10);

  useEffect(() => {
    // Wait for auth to finish loading before proceeding
    if (authLoading) return;

    // Initiate checkout (works for both authenticated and guest users)
    const initiateCheckout = async () => {
      if (processing) return;
      setProcessing(true);
      setError(null);

      try {
        // Call create-checkout - it handles both authenticated and guest flows
        const { data, error: fnError } = await supabase.functions.invoke("create-checkout", {
          body: { plan, seats },
        });

        if (fnError) throw fnError;

        if (data?.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url;
        } else {
          throw new Error(data?.error || "No checkout URL returned");
        }
      } catch (err: any) {
        console.error("Checkout error:", err);
        setError(err.message || "Failed to create checkout session");
        setProcessing(false);
      }
    };

    initiateCheckout();
  }, [authLoading, plan, seats, processing]);

  if (authLoading || processing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-semibold text-text-heading mb-2">
            {authLoading ? "Loading..." : "Preparing checkout..."}
          </h1>
          <p className="text-text-muted">
            You'll be redirected to complete your purchase shortly.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-md mx-auto p-6">
          <h1 className="text-2xl font-semibold text-text-heading mb-4">
            Checkout Error
          </h1>
          <p className="text-destructive mb-6">{error}</p>
          <button
            onClick={() => navigate("/pricing")}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover transition-colors"
          >
            Return to Pricing
          </button>
        </div>
      </div>
    );
  }

  return null;
}
