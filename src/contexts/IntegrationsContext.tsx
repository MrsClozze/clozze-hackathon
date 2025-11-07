import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface IntegrationsContextType {
  isPhoneConnected: boolean;
  isEmailConnected: boolean;
  isWhatsAppConnected: boolean;
  whatsAppNumber: string | null;
  connectPhone: () => void;
  connectEmail: () => void;
  refreshWhatsAppStatus: () => Promise<void>;
  disconnectWhatsApp: () => Promise<void>;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export const IntegrationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState<string | null>(null);

  const connectPhone = () => setIsPhoneConnected(true);
  const connectEmail = () => setIsEmailConnected(true);

  const refreshWhatsAppStatus = async () => {
    if (!user) {
      setIsWhatsAppConnected(false);
      setWhatsAppNumber(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_integrations')
        .select('phone_number, verified')
        .eq('user_id', user.id)
        .eq('verified', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsWhatsAppConnected(true);
        setWhatsAppNumber(data.phone_number);
      } else {
        setIsWhatsAppConnected(false);
        setWhatsAppNumber(null);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error);
      setIsWhatsAppConnected(false);
      setWhatsAppNumber(null);
    }
  };

  const disconnectWhatsApp = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('whatsapp_integrations')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      setIsWhatsAppConnected(false);
      setWhatsAppNumber(null);
    } catch (error) {
      console.error('Error disconnecting WhatsApp:', error);
      throw error;
    }
  };

  useEffect(() => {
    refreshWhatsAppStatus();
  }, [user]);

  return (
    <IntegrationsContext.Provider
      value={{ 
        isPhoneConnected, 
        isEmailConnected, 
        isWhatsAppConnected,
        whatsAppNumber,
        connectPhone, 
        connectEmail,
        refreshWhatsAppStatus,
        disconnectWhatsApp
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
