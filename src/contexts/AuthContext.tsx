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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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

  useEffect(() => {
    let previousUserId: string | null = null;

    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        const newUserId = currentSession?.user?.id ?? null;
        
        // Detect user switch and clear stale data
        if (previousUserId && newUserId && previousUserId !== newUserId) {
          console.warn('[AUTH] User changed from', previousUserId, 'to', newUserId, '- clearing stale subscription data');
          setSubscription(null);
        }
        previousUserId = newUserId;

        // Prevent UI from flashing between "no subscription" and "active subscription" states
        // by keeping the app in a loading state until subscription status has been checked.
        setLoading(true);

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        
        try {
          if (currentSession?.user) {
            await withTimeout(checkSubscription(currentSession), 8000, 'checkSubscription');
          } else {
            setSubscription(null);
          }
        } catch (e) {
          console.error('Subscription check timed out:', e);
        } finally {
          setLoading(false);
        }
      }
    );

    (async () => {
      setLoading(true);
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      try {
        if (currentSession?.user) {
          await withTimeout(checkSubscription(currentSession), 8000, 'checkSubscription');
        }
      } catch (e) {
        console.error('Initial subscription check timed out:', e);
      } finally {
        setLoading(false);
      }
    })();

    return () => authSubscription.unsubscribe();
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
