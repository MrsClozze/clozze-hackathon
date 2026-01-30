import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

interface SubscriptionInfo {
  subscribed: boolean;
  plan_type: 'free' | 'pro' | 'team';
  status: 'trial' | 'active' | 'canceled' | 'past_due';
  subscription_end?: string | null;
  trial_end?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  subscription: SubscriptionInfo | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Flag used by ResetPassword page to prevent auto-redirect during password reset
const PASSWORD_RESET_FLAG = 'clozze_password_reset_active';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check if we're in password reset flow - don't auto-redirect
  const isPasswordResetActive = () => {
    return sessionStorage.getItem(PASSWORD_RESET_FLAG) === 'true';
  };

  // Identify user in UserGuiding with retry for SDK readiness
  const identifyUserGuiding = (userId: string, email?: string, createdAt?: string) => {
    const doIdentify = () => {
      if ((window as any).userGuiding) {
        (window as any).userGuiding.identify(userId, {
          email: email,
          created_at: createdAt ? new Date(createdAt).getTime() : undefined,
        });
        return true;
      }
      return false;
    };

    // Try immediately
    if (doIdentify()) return;

    // Retry a few times if SDK not ready yet
    let attempts = 0;
    const maxAttempts = 10;
    const interval = setInterval(() => {
      attempts++;
      if (doIdentify() || attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 200);
  };

  const checkSubscription = async (currentSession: Session | null) => {
    if (!currentSession) {
      setSubscription(null);
      return;
    }

    try {
      const { data, error } = await withTimeout(
        supabase.functions.invoke('check-subscription'),
        8000,
        'check-subscription'
      );
      
      if (error) throw error;
      
      const subData: SubscriptionInfo = data;
      
      // Get trial_end from database if in trial
      if (subData.status === 'trial') {
        const { data: dbSub } = await supabase
          .from('subscriptions')
          .select('trial_end')
          .eq('user_id', currentSession.user.id)
           .maybeSingle();
        
        if (dbSub) {
          subData.trial_end = dbSub.trial_end;
        }
      }
      
      setSubscription(subData);
      
      // Update database subscription record
      await withTimeout(
        (async () => {
          const { error: upsertError } = await supabase
            .from('subscriptions')
            .upsert(
              {
                user_id: currentSession.user.id,
                plan_type: subData.plan_type,
                status: subData.status,
                current_period_end: subData.subscription_end,
              },
              { onConflict: 'user_id' }
            );

          if (upsertError) throw upsertError;
        })(),
        8000,
        'subscriptions upsert'
      );
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const refreshSubscription = async () => {
    await checkSubscription(session);
  };

  // Helper to validate session and clear if user no longer exists
  const validateSession = async (currentSession: Session | null): Promise<boolean> => {
    if (!currentSession) return false;
    
    try {
      const { data, error } = await withTimeout(
        supabase.auth.getUser(),
        8000,
        'auth.getUser'
      );

      const msg = error?.message || '';

      // Only treat known "deleted user" errors as invalid.
      // Transient auth/network errors should NOT force a sign-out or block state updates.
      if (
        msg.includes('User from sub claim in JWT does not exist') ||
        msg.includes('user_not_found')
      ) {
        console.warn('[AUTH] User no longer exists - clearing stale session');
        await supabase.auth.signOut();
        setUser(null);
        setSession(null);
        setSubscription(null);
        return false;
      }

      if (error) {
        console.warn('[AUTH] Non-fatal session validation error (allowing session):', error);
        return true;
      }

      return !!data?.user;
    } catch (e) {
      console.warn('[AUTH] Session validation threw (allowing session):', e);
      return true;
    }
  };

  useEffect(() => {
    let isMounted = true;
    let previousUserId: string | null = null;

    // ONGOING auth changes listener - does NOT control isLoading
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        if (!isMounted) return;
        
        const newUserId = currentSession?.user?.id ?? null;
        
        // Detect user switch and clear stale data
        if (previousUserId && newUserId && previousUserId !== newUserId) {
          console.warn('[AUTH] User changed from', previousUserId, 'to', newUserId, '- clearing stale subscription data');
          setSubscription(null);
        }
        previousUserId = newUserId;

        // Always update local state first; validate in background.
        // This avoids getting stuck in a state where login succeeded but UI never updates.
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        // Identify user in UserGuiding for onboarding guides
        if (currentSession?.user) {
          identifyUserGuiding(
            currentSession.user.id,
            currentSession.user.email,
            currentSession.user.created_at
          );
        }

        if (currentSession) {
          // Handles deleted users (clears session) but won't block on transient errors.
          validateSession(currentSession).catch((e) => {
            console.warn('[AUTH] Session validation failed (non-blocking):', e);
          });
        }
        
        // Fire-and-forget subscription check - don't await, don't affect loading state
        if (currentSession?.user) {
          checkSubscription(currentSession).catch(e => {
            console.error('[AUTH] Subscription check failed (non-blocking):', e);
          });
        } else {
          setSubscription(null);
        }
      }
    );

    // INITIAL load - controls isLoading
    const initializeAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        // Set state first to avoid UI deadlocks; validate in background.
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession) {
          await validateSession(currentSession);
        }

        // Fetch subscription BEFORE setting loading false
        if (currentSession?.user) {
          // Identify with UserGuiding during initial load
          identifyUserGuiding(
            currentSession.user.id,
            currentSession.user.email,
            currentSession.user.created_at
          );
          
          try {
            await withTimeout(checkSubscription(currentSession), 8000, 'checkSubscription');
          } catch (e) {
            console.error('[AUTH] Initial subscription check timed out:', e);
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      authSubscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setSubscription(null);
      toast({
        title: "Signed out successfully",
      });
    } catch (error) {
      toast({
        title: "Error signing out",
        variant: "destructive",
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, subscription, loading, signOut, refreshSubscription }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
