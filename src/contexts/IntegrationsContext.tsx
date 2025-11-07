import React, { createContext, useContext, useState, ReactNode } from 'react';

interface IntegrationsContextType {
  isPhoneConnected: boolean;
  isEmailConnected: boolean;
  isWhatsAppConnected: boolean;
  whatsAppNumber: string | null;
  connectPhone: () => void;
  connectEmail: () => void;
  connectWhatsApp: (phoneNumber: string) => void;
  disconnectWhatsApp: () => void;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export const IntegrationsProvider = ({ children }: { children: ReactNode }) => {
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [isEmailConnected, setIsEmailConnected] = useState(false);
  const [isWhatsAppConnected, setIsWhatsAppConnected] = useState(false);
  const [whatsAppNumber, setWhatsAppNumber] = useState<string | null>(null);

  const connectPhone = () => setIsPhoneConnected(true);
  const connectEmail = () => setIsEmailConnected(true);
  const connectWhatsApp = (phoneNumber: string) => {
    setIsWhatsAppConnected(true);
    setWhatsAppNumber(phoneNumber);
  };
  const disconnectWhatsApp = () => {
    setIsWhatsAppConnected(false);
    setWhatsAppNumber(null);
  };

  return (
    <IntegrationsContext.Provider
      value={{ 
        isPhoneConnected, 
        isEmailConnected, 
        isWhatsAppConnected,
        whatsAppNumber,
        connectPhone, 
        connectEmail,
        connectWhatsApp,
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
