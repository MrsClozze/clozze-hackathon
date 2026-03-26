import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface IntegrationsContextType {
  isPhoneConnected: boolean;
  isEmailConnected: boolean;
  isGmailConnected: boolean;
  connectPhone: () => void;
  connectEmail: () => void;
  refreshGmailStatus: () => Promise<void>;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export const IntegrationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  const connectPhone = () => setIsPhoneConnected(true);
  const connectEmail = () => setIsEmailConnected(true);

  const refreshGmailStatus = useCallback(async () => {
    if (!user) {
      setIsGmailConnected(false);
      setIsEmailConnected(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('service_integrations')
        .select('is_connected')
        .eq('user_id', user.id)
        .eq('service_name', 'gmail')
        .maybeSingle();

      if (error) throw error;

      const connected = data?.is_connected ?? false;
      setIsGmailConnected(connected);
      setIsEmailConnected(connected);
    } catch (error) {
      console.error('Error fetching Gmail status:', error);
      setIsGmailConnected(false);
      setIsEmailConnected(false);
    }
  }, [user]);

  useEffect(() => {
    refreshGmailStatus();
  }, [user, refreshGmailStatus]);

  return (
    <IntegrationsContext.Provider
      value={{ 
        isPhoneConnected, 
        isEmailConnected, 
        isGmailConnected,
        connectPhone, 
        connectEmail,
        refreshGmailStatus,
      }}
    >
      {children}
    </IntegrationsContext.Provider>
  );
};

export const useIntegrations = () => {
  const context = useContext(IntegrationsContext);
  if (!context) {
    throw new Error('useIntegrations must be used within an IntegrationsProvider');
  }
  return context;
};