import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import clozzeLogo from "@/assets/clozze-logo.png";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export default function Auth() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, refreshSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    const checkOnboardingAndRedirect = async () => {
      if (user) {
        console.log('[AUTH] User detected, checking redirect...', user.id);
        
        const sessionId = searchParams.get('session_id');
        if (sessionId) {
          refreshSubscription().then(() => {
            toast({
              title: "Subscription activated!",
              description: "Welcome to your new plan.",
            });
            navigate("/integrations");
          });
          return;
        }
        
        // Wait a moment for the database trigger to create the profile
        // This handles the race condition where signup completes before profile is created
        let attempts = 0;
        const maxAttempts = 5;
        
        const checkProfile = async (): Promise<void> => {
          attempts++;
          console.log('[AUTH] Checking profile, attempt:', attempts);
          
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('onboarding_completed')
            .eq('id', user.id)
            .maybeSingle();
          
          console.log('[AUTH] Profile check result:', { profile, error });
          
          if (error) {
            console.error('[AUTH] Profile query error:', error);
            // If there's an error, still try to navigate to onboarding
            navigate("/onboarding");
            return;
          }
          
          if (!profile && attempts < maxAttempts) {
            // Profile not created yet by trigger, wait and retry
            console.log('[AUTH] Profile not found, retrying in 500ms...');
            await new Promise(resolve => setTimeout(resolve, 500));
            return checkProfile();
          }
          
          if (!profile || !profile.onboarding_completed) {
            console.log('[AUTH] Redirecting to onboarding');
            navigate("/onboarding");
          } else {
            console.log('[AUTH] Onboarding complete, redirecting to home');
            navigate("/");
          }
        };
        
        await checkProfile();
      }
    };
    
    checkOnboardingAndRedirect();
  }, [user, navigate, searchParams, refreshSubscription, toast]);

  // Handle OAuth code exchange on redirect
  useEffect(() => {
    const code = searchParams.get('code');
    const errorDesc = searchParams.get('error_description');
    const errorCode = searchParams.get('error_code');

    // Also parse hash params (Supabase often returns tokens in the URL hash)
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const hashErrorDesc = hashParams.get('error_description');
    const hashErrorCode = hashParams.get('error_code');

    const finalErrorDesc = hashErrorDesc || errorDesc;
    const finalErrorCode = hashErrorCode || errorCode;

    if (finalErrorDesc) {
      toast({ 
        title: finalErrorCode === 'otp_expired' ? 'Link expired' : 'Sign in failed', 
        description: decodeURIComponent(finalErrorDesc), 
        variant: 'destructive' 
      });
    }

    if (code && !finalErrorDesc) {
      (async () => {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          toast({ title: 'Sign in failed', description: error.message, variant: 'destructive' });
          return;
        }
        
        // Check if this is a new OAuth signup (created within last 60 seconds)
        const user = data.session?.user;
        if (user) {
          const createdAt = new Date(user.created_at).getTime();
          const now = Date.now();
          const isNewUser = (now - createdAt) < 60000; // 60 seconds
          
          if (isNewUser) {
            // Extract name from user metadata (Google provides these)
            const firstName = user.user_metadata?.full_name?.split(' ')[0] || 
                            user.user_metadata?.given_name || '';
            const lastName = user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 
                           user.user_metadata?.family_name || '';
            
            // Send welcome email for new OAuth signups (fire-and-forget)
            supabase.functions.invoke('send-welcome-email', {
              body: { email: user.email, firstName, lastName }
            }).catch(emailError => {
              console.warn('[AUTH] Welcome email for OAuth signup failed (non-critical):', emailError);
            });
          }
        }
        // Session is now set; AuthContext listener will redirect
      })();
    }
  }, [searchParams, toast]);

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      console.log('[AUTH] Starting signup for:', email);
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth`,
          data: {
            first_name: firstName,
            last_name: lastName,
          }
        },
      });

      if (error) {
        console.error('[AUTH] Signup error:', error);
        throw error;
      }

      console.log('[AUTH] Signup successful, user:', data.user?.id);

      // Show success toast immediately - don't wait for welcome email
      toast({
        title: "Account created!",
        description: "Check your email for the verification link to activate your account.",
      });

      // Send welcome email in background (fire-and-forget) - don't block navigation
      supabase.functions.invoke('send-welcome-email', {
        body: { email, firstName, lastName }
      }).catch(emailError => {
        console.warn('[AUTH] Welcome email failed (non-critical):', emailError);
      });

      // Send verification email in background (fire-and-forget)
      // Note: This is separate from the auth provider's internal emails.
      supabase.functions.invoke('send-verification-email', {
        body: { email, firstName, redirectOrigin: window.location.origin }
      }).catch(emailError => {
        console.warn('[AUTH] Verification email failed (non-critical):', emailError);
      });

      // Fallback navigation: some sessions don't trigger the AuthContext redirect reliably.
      // We still want users to proceed to onboarding immediately.
      setTimeout(() => navigate('/onboarding'), 0);

      // The useEffect will handle navigation when user state updates
      // But add a fallback in case it doesn't trigger
      console.log('[AUTH] Signup complete, navigation should happen via useEffect');
      
    } catch (error: any) {
      console.error('[AUTH] Signup failed:', error);
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
      console.log('[AUTH] Loading state reset to false');
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await withTimeout(
        supabase.auth.signInWithPassword({
          email,
          password,
        }),
        12000,
        'signInWithPassword'
      );

      if (error) throw error;

      toast({
        title: "Welcome back!",
      });
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const redirectUri = `${window.location.origin}/auth`;
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
      });

      if (result?.error) throw result.error;
      // If redirected, the browser will navigate to the provider.
    } catch (error: any) {
      toast({
        title: "Google sign in failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };



  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Send password reset email via custom edge function
      const { error } = await supabase.functions.invoke('send-password-reset-email', {
        body: { email }
      });

      if (error) throw error;
      
      toast({
        title: "Password reset email sent!",
        description: "Check your email from hello@mail.clozze.io for the password reset link. It will expire in 1 hour.",
      });

      setIsForgotPassword(false);
      setEmail("");
    } catch (error: any) {
      toast({
        title: "Password reset failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img src={clozzeLogo} alt="Clozze" className="h-36 mb-4" />
          <h1 className="text-2xl font-bold text-text-heading">Welcome to Clozze</h1>
          <p className="text-text-muted mt-2 text-center">
            {isForgotPassword 
              ? "Reset your password" 
              : isSignUp 
                ? "Create your account to get started" 
                : "Sign in or create an account to continue"}
          </p>
        </div>

        {isForgotPassword ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full transition-all duration-300 hover:shadow-lg hover:brightness-110" 
                disabled={loading}
              >
                {loading ? "Sending reset link..." : "Send Reset Link"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full transition-all duration-300 hover:shadow-lg hover:bg-accent hover:border-primary"
                onClick={() => {
                  setIsForgotPassword(false);
                  setEmail("");
                }}
              >
                Back to Sign In
              </Button>
            </div>
          </form>
        ) : !isSignUp ? (
          <form onSubmit={handleEmailSignIn} className="space-y-4">
            <div>
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="signin-password">Password</Label>
              <Input
                id="signin-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full transition-all duration-300 hover:shadow-lg hover:brightness-110" 
                disabled={loading}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full transition-all duration-300 hover:shadow-lg hover:bg-accent hover:border-primary"
                onClick={() => setIsSignUp(true)}
              >
                Sign Up
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-primary hover:text-primary hover:bg-accent"
                onClick={() => {
                  setIsForgotPassword(true);
                  setPassword("");
                }}
              >
                Forgot Password?
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEmailSignUp} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-3">
              <Button 
                type="submit" 
                className="w-full transition-all duration-300 hover:shadow-lg hover:brightness-110" 
                disabled={loading}
              >
                {loading ? "Creating account..." : "Create Account"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full transition-all duration-300 hover:shadow-lg hover:bg-accent hover:border-primary"
                onClick={() => setIsSignUp(false)}
              >
                Back to Sign In
              </Button>
            </div>
          </form>
        )}

        {!isForgotPassword && (
          <>
            <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-text-muted">Or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            type="button"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </Button>
        </div>
          </>
        )}
      </Card>
    </div>
  );
}
