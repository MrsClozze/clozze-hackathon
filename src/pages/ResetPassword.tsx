import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import clozzeLogo from "@/assets/clozze-logo.png";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

// Flag to signal AuthContext that we're in password reset mode
// This prevents auto-redirect after session is created
const PASSWORD_RESET_FLAG = 'clozze_password_reset_active';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [validatingLink, setValidatingLink] = useState(true);
  const [isValidLink, setIsValidLink] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const validationAttempted = useRef(false);

  const [needsManualVerify, setNeedsManualVerify] = useState(false);
  const [manualVerifyTokenHash, setManualVerifyTokenHash] = useState<string | null>(null);

  const getRecoveryParams = () => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const type = hashParams.get("type") || searchParams.get("type");
    const code = hashParams.get("code") || searchParams.get("code");
    const hasTokensInHash = !!hashParams.get("access_token") || !!hashParams.get("refresh_token");
    return { type, code, hasTokensInHash };
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  // Set flag on mount, clear on unmount
  useEffect(() => {
    sessionStorage.setItem(PASSWORD_RESET_FLAG, 'true');
    return () => {
      sessionStorage.removeItem(PASSWORD_RESET_FLAG);
    };
  }, []);

  // If the auth session arrives slightly after initial validation (common with hash-token recovery links),
  // treat the link as valid and keep the user on the reset form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!currentSession?.user) return;
      setIsValidLink(true);
      setUserEmail(currentSession.user.email || "");
      setValidatingLink(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Prevent double execution
    if (validationAttempted.current) return;
    
    const validateResetLink = async () => {
      validationAttempted.current = true;

      const { type: finalType, code: finalCode, hasTokensInHash } = getRecoveryParams();
      const tokenHash = searchParams.get("token_hash");

      // Check if we already have a valid session from recovery
      // This handles the case where the code was already exchanged
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData.session?.user) {
        console.log('[RESET] Found existing session, using it for password reset');
        setIsValidLink(true);
        setUserEmail(sessionData.session.user.email || "");
        setValidatingLink(false);
        return;
      }

      // If we received a token_hash deep-link (used to avoid email scanners burning the one-time token),
      // don't auto-verify. Require an explicit user click.
      if (finalType === 'recovery' && tokenHash) {
        setNeedsManualVerify(true);
        setManualVerifyTokenHash(tokenHash);
        setValidatingLink(false);
        return;
      }

      if (finalType === 'recovery' && finalCode) {
        try {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(finalCode);
          
          if (error) {
            console.error('[RESET] Code exchange failed:', error.message);
            toast({
              title: "Invalid or expired reset link",
              description: "Please request a new password reset link.",
              variant: "destructive"
            });
            setIsValidLink(false);
          } else {
            console.log('[RESET] Code exchange successful for:', data.user?.email);
            setIsValidLink(true);
            setUserEmail(data.user?.email || "");
          }
        } catch (err) {
          console.error("[RESET] Error validating reset link:", err);
          setIsValidLink(false);
        }
      } else {
        // Some recovery links arrive with tokens in the URL hash, and the session can take a moment to appear.
        // Wait briefly before declaring the link invalid.
        if (finalType === 'recovery' && hasTokensInHash) {
          await sleep(1200);
          const { data: sessionAfterWait } = await supabase.auth.getSession();
          if (sessionAfterWait.session?.user) {
            setIsValidLink(true);
            setUserEmail(sessionAfterWait.session.user.email || "");
            setValidatingLink(false);
            return;
          }
        }

        toast({
          title: "Invalid reset link",
          description: "This link is not valid. Please request a new password reset.",
          variant: "destructive"
        });
        setIsValidLink(false);
      }
      
      setValidatingLink(false);
    };

    validateResetLink();
  }, [searchParams, toast]);

  const handleManualVerify = async () => {
    if (!manualVerifyTokenHash) return;

    setValidatingLink(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        type: 'recovery',
        token_hash: manualVerifyTokenHash,
      });

      if (error) throw error;

      setIsValidLink(true);
      setUserEmail(data.user?.email || "");
      setNeedsManualVerify(false);
    } catch (e: any) {
      toast({
        title: "Invalid or expired reset link",
        description: e?.message || "Please request a new password reset link.",
        variant: "destructive",
      });
      setIsValidLink(false);
    } finally {
      setValidatingLink(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please ensure both passwords are identical.",
        variant: "destructive"
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long.",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      // Update the user's password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      // Send confirmation email
      try {
        await supabase.functions.invoke('send-password-reset-confirmation', {
          body: { 
            email: userEmail,
            redirectOrigin: window.location.origin 
          }
        });
      } catch (emailError) {
        console.error("Error sending confirmation email:", emailError);
        // Don't fail the password reset if email fails
      }

      setResetComplete(true);
      
      toast({
        title: "Password updated successfully!",
        description: "Check your email to confirm the password reset. You'll be redirected to login shortly.",
      });

      // Sign out the user
      await supabase.auth.signOut();

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/auth");
      }, 3000);
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (validatingLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-text-muted">Validating reset link...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (needsManualVerify) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <img src={clozzeLogo} alt="Clozze" className="h-24 mb-4" />
            <h1 className="text-2xl font-bold text-text-heading">Confirm Password Reset</h1>
            <p className="text-text-muted mt-2 text-center">
              For your security, click continue to validate your reset link.
            </p>
          </div>

          <div className="space-y-3">
            <Button className="w-full" onClick={handleManualVerify}>
              Continue
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/auth")}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!isValidLink) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-6">
            <img src={clozzeLogo} alt="Clozze" className="h-24 mb-4" />
            <h1 className="text-2xl font-bold text-text-heading">Invalid Reset Link</h1>
          </div>
          
          <div className="space-y-4 text-center">
            <p className="text-text-muted">
              This password reset link is invalid or has expired. Password reset links expire after 1 hour for security reasons.
            </p>
            <Button
              onClick={() => navigate("/auth")}
              className="w-full"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8">
          <div className="flex flex-col items-center space-y-6">
            <CheckCircle2 className="h-16 w-16 text-primary" />
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-text-heading">Password Reset Complete!</h1>
              <p className="text-text-muted">
                We've sent a confirmation email to <strong>{userEmail}</strong>
              </p>
              <p className="text-text-muted">
                Please check your email and click the confirmation link to complete the process.
              </p>
              <p className="text-sm text-text-muted mt-4">
                You'll be redirected to the login page shortly...
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={clozzeLogo} alt="Clozze" className="h-24 mb-4" />
          <h1 className="text-2xl font-bold text-text-heading">Set New Password</h1>
          <p className="text-text-muted mt-2 text-center">
            Enter your new password below
          </p>
        </div>

        <form onSubmit={handlePasswordReset} className="space-y-4">
          <div>
            <Label htmlFor="new-password">New Password</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Enter new password (min. 6 characters)"
              disabled={loading}
            />
          </div>
          
          <div>
            <Label htmlFor="confirm-password">Confirm New Password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Confirm new password"
              disabled={loading}
            />
          </div>

          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full transition-all duration-300 hover:shadow-lg hover:brightness-110"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Updating password...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full transition-all duration-300 hover:shadow-lg hover:bg-accent hover:border-primary"
              onClick={() => navigate("/auth")}
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Login
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
