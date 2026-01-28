import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useUserpilot } from '@/hooks/useUserpilot';

/**
 * UserpilotProvider component
 * 
 * This component initializes Userpilot and identifies users when they log in.
 * It should be placed inside the Router context but wrapping the main app content.
 * 
 * Userpilot flows are configured in the Userpilot dashboard (https://app.userpilot.io)
 * 
 * Recommended flows to create in Userpilot:
 * 
 * 1. Welcome Tour (trigger on first visit to /)
 *    - Introduction to Clozze
 *    - Overview of main navigation
 * 
 * 2. Add Listing Guide (trigger on first visit to /listings)
 *    - How to add a new listing
 *    - Explain listing statuses (Active, Pending, Closed)
 * 
 * 3. Tasks & To-Dos Guide (trigger on first visit to /tasks)
 *    - How to create tasks
 *    - Task assignment and due dates
 *    - Priority levels
 * 
 * 4. Buyers Management (trigger on first visit to /buyers)
 *    - Adding new buyers
 *    - Tracking buyer preferences
 *    - Pre-approval amounts
 * 
 * 5. Calendar Integration (trigger on /integrations or settings)
 *    - How to connect Google/Outlook calendar
 *    - Syncing showings and appointments
 * 
 * 6. Communication Hub (trigger on first visit to /communication-hub)
 *    - AI-powered message assistance
 *    - Connecting email/phone integrations
 * 
 * 7. Documents Page (trigger on first visit to /documents)
 *    - Uploading and organizing documents
 *    - Document categories
 * 
 * 8. Contacts Page (trigger on first visit to /contacts)
 *    - Adding and managing contacts
 *    - Contact categories (clients, vendors, etc.)
 */
export function UserpilotProvider({ children }: { children: React.ReactNode }) {
  // Initialize Userpilot hooks - this handles user identification
  useUserpilot();
  
  const location = useLocation();
  const lastPath = useRef<string | null>(null);

  // Reload Userpilot on route changes to trigger page-specific flows
  useEffect(() => {
    if (!window.userpilot) return;
    
    if (lastPath.current !== location.pathname) {
      lastPath.current = location.pathname;
      window.userpilot.reload(window.location.href);
    }
  }, [location.pathname]);

  return <>{children}</>;
}
