import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

interface IntegrationsContextType {
  isPhoneConnected: boolean;
  isEmailConnected: boolean;
  isWhatsAppConnected: boolean;
  isWhatsAppBusinessConnected: boolean;
  isGmailConnected: boolean;
  whatsAppNumber: string | null;
  whatsAppBusinessPhone: string | null;
  connectPhone: () => void;
  connectEmail: () => void;
  refreshWhatsAppStatus: () => Promise<void>;
  refreshWhatsAppBusinessStatus: () => Promise<void>;
  refreshGmailStatus: () => Promise<void>;
  disconnectWhatsApp: () => Promise<void>;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export const IntegrationsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [isWhatsAppBusinessConnected, setIsWhatsAppBusinessConnected] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState<string | null>(null);
  const [whatsAppBusinessPhone, setWhatsAppBusinessPhone] = useState<string | null>(null);

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

  const refreshWhatsAppBusinessStatus = async () => {
    if (!user) {
      setIsWhatsAppBusinessConnected(false);
      setWhatsAppBusinessPhone(null);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('whatsapp_business_connections')
        .select('business_phone_number, phone_number_id, is_connected')
        .eq('user_id', user.id)
        .eq('is_connected', true)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setIsWhatsAppBusinessConnected(true);
        setWhatsAppBusinessPhone(data.business_phone_number || data.phone_number_id);
      } else {
        setIsWhatsAppBusinessConnected(false);
        setWhatsAppBusinessPhone(null);
      }
    } catch (error) {
      console.error('Error fetching WhatsApp Business status:', error);
      setIsWhatsAppBusinessConnected(false);
      setWhatsAppBusinessPhone(null);
    }
  };

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
    refreshWhatsAppBusinessStatus();
    refreshGmailStatus();
  }, [user, refreshGmailStatus]);

  return (
    <IntegrationsContext.Provider
      value={{ 
        isPhoneConnected, 
        isEmailConnected, 
        isWhatsAppConnected,
        isWhatsAppBusinessConnected,
        isGmailConnected,
        whatsAppNumber,
        whatsAppBusinessPhone,
        connectPhone, 
        connectEmail,
        refreshWhatsAppStatus,
        refreshWhatsAppBusinessStatus,
        refreshGmailStatus,
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
