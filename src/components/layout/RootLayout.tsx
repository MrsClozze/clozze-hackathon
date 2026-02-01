import { useEffect, useRef } from 'react';
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
  const hasLaunchedChecklist = useRef(false);

  // Track page views and launch checklist on dashboard with extended retry
  useEffect(() => {
    const trackAndLaunch = () => {
      const ug = (window as any).userGuiding;
      if (ug && typeof ug.track === 'function') {
        console.log('[UserGuiding] Tracking page_view:', location.pathname);
        ug.track('page_view', { path: location.pathname });
        
        // Launch checklist on dashboard (home page) for first visit
        if (location.pathname === '/' && !hasLaunchedChecklist.current) {
          if (typeof ug.launchChecklist === 'function') {
            console.log('[UserGuiding] Launching checklist on dashboard');
            // Don't specify checklist ID to use the default one configured in UserGuiding
            ug.launchChecklist();
            hasLaunchedChecklist.current = true;
          }
        }
        return true;
      }
      return false;
    };

    // Initial delay for DOM readiness
    let attempts = 0;
    const maxAttempts = 20; // 20 attempts = up to 10 seconds
    
    const tryTrack = () => {
      if (trackAndLaunch()) return;
      
      attempts++;
      if (attempts < maxAttempts) {
        setTimeout(tryTrack, 500);
      } else {
        console.warn('[UserGuiding] Failed to track page_view after', maxAttempts, 'attempts');
      }
    };

    // Start after small delay
    const timeoutId = setTimeout(tryTrack, 500);
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
