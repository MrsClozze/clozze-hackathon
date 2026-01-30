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

  // Track page views with UserGuiding after route changes
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(() => {
      if (typeof window !== 'undefined' && (window as any).userGuiding) {
        (window as any).userGuiding.track('page_view', {
          path: location.pathname,
        });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
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
