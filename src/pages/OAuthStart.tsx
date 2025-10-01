import React, { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const OAuthStart: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const provider = searchParams.get("provider") as "google" | "azure" | null;
    if (!provider) {
      toast({ title: "Invalid provider", description: "Missing OAuth provider.", variant: "destructive" });
      navigate("/auth");
      return;
    }

    // Start OAuth ensuring redirect happens in the top window to avoid iframe blocking
    (async () => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth`,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        toast({ title: "Sign in failed", description: error.message, variant: "destructive" });
        navigate("/auth");
        return;
      }

      const targetUrl = data?.url;
      if (!targetUrl) {
        toast({ title: "Sign in failed", description: "Missing redirect URL.", variant: "destructive" });
        navigate("/auth");
        return;
      }

      try {
        if (window.top) {
          (window.top as Window).location.href = targetUrl;
        } else {
          window.location.href = targetUrl;
        }
      } catch {
        window.location.href = targetUrl;
      }
    })();
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <h1 className="text-2xl font-bold text-text-heading">Connecting to provider…</h1>
        <p className="text-text-muted mt-2">Please wait while we redirect you.</p>
      </Card>
    </div>
  );
};

export default OAuthStart;