import React, { createContext, useContext, useState, ReactNode } from 'react';

interface IntegrationsContextType {
  isPhoneConnected: boolean;
  isEmailConnected: boolean;
  connectPhone: () => void;
  connectEmail: () => void;
}

const IntegrationsContext = createContext<IntegrationsContextType | undefined>(undefined);

export const IntegrationsProvider = ({ children }: { children: ReactNode }) => {
  const [isPhoneConnected, setIsPhoneConnected] = useState(false);
  const [isEmailConnected, setIsEmailConnected] = useState(false);

  const connectPhone = () => setIsPhoneConnected(true);
  const connectEmail = () => setIsEmailConnected(true);

  return (
    <IntegrationsContext.Provider
      value={{ isPhoneConnected, isEmailConnected, connectPhone, connectEmail }}
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
