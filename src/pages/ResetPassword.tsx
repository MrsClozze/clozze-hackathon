import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import clozzeLogo from "@/assets/clozze-logo.png";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";

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

  useEffect(() => {
    const validateResetLink = async () => {
      const code = searchParams.get('code');
      const type = searchParams.get('type');
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
      const hashType = hashParams.get('type');
      const hashCode = hashParams.get('code');
      
      const finalType = hashType || type;
      const finalCode = hashCode || code;

      if (finalType === 'recovery' && finalCode) {
        try {
          // Exchange code for session
          const { data, error } = await supabase.auth.exchangeCodeForSession(finalCode);
          
          if (error) {
            toast({
              title: "Invalid or expired reset link",
              description: "Please request a new password reset link.",
              variant: "destructive"
            });
            setIsValidLink(false);
          } else {
            setIsValidLink(true);
            setUserEmail(data.user?.email || "");
          }
        } catch (err) {
          console.error("Error validating reset link:", err);
          setIsValidLink(false);
        }
      } else {
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
            <CheckCircle2 className="h-16 w-16 text-green-500" />
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
