import React, { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const OAuthStart: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [authUrl, setAuthUrl] = useState<string | null>(null);

  useEffect(() => {
    const provider = searchParams.get("provider") as "google" | "azure" | null;
    if (!provider) {
      toast({ title: "Invalid provider", description: "Missing OAuth provider.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    // Start OAuth in this top-level page; let the SDK handle redirect to provider
    supabase.auth
      .signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      })
      .then(({ error }) => {
        if (error) {
          toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
          navigate("/auth");
        }
      });
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-text-heading">Connecting to provider…</h1>
        <p className="text-text-muted mt-2">Please wait while we redirect you.</p>
        {authUrl && (
          <div className="mt-6 space-y-2">
            <p className="text-text-muted">If you weren’t redirected, continue below:</p>
            <Button asChild className="w-full">
              <a href={authUrl} target="_blank" rel="noopener noreferrer">
                Continue to Google
              </a>
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OAuthStart;
