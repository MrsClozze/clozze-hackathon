import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AccountStateProvider } from '@/contexts/AccountStateContext';
import { IntegrationsProvider } from '@/contexts/IntegrationsContext';
import { UserProvider } from '@/contexts/UserContext';
import { ListingsProvider } from '@/contexts/ListingsContext';
import { BuyersProvider } from '@/contexts/BuyersContext';
import { ContactsProvider } from '@/contexts/ContactsContext';
import { TasksProvider } from '@/contexts/TasksContext';

/**
 * Root layout component that wraps all routes
 * and data providers that depend on AccountStateContext
 */
export function RootLayout() {
  const location = useLocation();

  // Load Zendesk widget globally on mount
  useEffect(() => {
    if (!document.getElementById('ze-snippet')) {
      const script = document.createElement('script');
      script.id = 'ze-snippet';
      script.src = 'https://static.zdassets.com/ekr/snippet.js?key=94614987-dc1f-4600-b492-211a2a24c813';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Hide Zendesk widget on auth page
  useEffect(() => {
    const hide = location.pathname === '/auth';
    if (hide) {
      (window as any).zE?.('messenger', 'hide');
    } else {
      (window as any).zE?.('messenger', 'show');
    }
  }, [location.pathname]);

  return (
    <AccountStateProvider>
      <IntegrationsProvider>
        <UserProvider>
          <ListingsProvider>
            <BuyersProvider>
              <ContactsProvider>
                <TasksProvider>
                  <Outlet />
                </TasksProvider>
              </ContactsProvider>
            </BuyersProvider>
          </ListingsProvider>
        </UserProvider>
      </IntegrationsProvider>
    </AccountStateProvider>
  );
}
