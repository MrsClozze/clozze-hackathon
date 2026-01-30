import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export type AccountState = 'demo' | 'live';

interface AccountStateContextType {
  accountState: AccountState;
  isLoading: boolean;
  activateAccount: () => Promise<void>;
  isDemo: boolean;
  isLive: boolean;
}

const AccountStateContext = createContext<AccountStateContextType | undefined>(undefined);

export function AccountStateProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [accountState, setAccountState] = useState<AccountState>('demo');
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccountState = useCallback(async () => {
    if (authLoading) return;
    
    if (!user) {
      setAccountState('demo');
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('account_state')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      // Use the account_state from the profile, default to 'demo' if not found
      setAccountState((data?.account_state as AccountState) || 'demo');
    } catch (error) {
      console.error('Error fetching account state:', error);
      setAccountState('demo');
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchAccountState();
  }, [fetchAccountState]);

  /**
   * Flip the account from demo to live mode.
   * Called when user creates their first real listing or buyer.
   */
  const activateAccount = useCallback(async () => {
    if (!user) {
      console.warn('Cannot activate account: no user logged in');
      return;
    }

    if (accountState === 'live') {
      // Already live, no need to update
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ account_state: 'live' })
        .eq('id', user.id);

      if (error) throw error;

      setAccountState('live');
      console.log('Account activated to live mode');
    } catch (error) {
      console.error('Error activating account:', error);
      throw error;
    }
  }, [user, accountState]);

  return (
    <AccountStateContext.Provider
      value={{
        accountState,
        isLoading,
        activateAccount,
        isDemo: accountState === 'demo',
        isLive: accountState === 'live',
      }}
    >
      {children}
    </AccountStateContext.Provider>
  );
}

export function useAccountState() {
  const context = useContext(AccountStateContext);
  if (context === undefined) {
    throw new Error("useAccountState must be used within an AccountStateProvider");
  }
  return context;
}
