import { Outlet } from 'react-router-dom';
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
