import { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useUser } from '@/contexts/UserContext';

// Userpilot App Token - this is a publishable key, safe to include in code
const USERPILOT_TOKEN = 'YOUR_USERPILOT_TOKEN'; // Replace with your actual token from Userpilot dashboard

declare global {
  interface Window {
    userpilot: {
      identify: (userId: string, properties?: Record<string, unknown>) => void;
      reload: (currentUrl?: string) => void;
      track: (eventName: string, properties?: Record<string, unknown>) => void;
      trigger: (flowId: string) => void;
      anonymous: () => void;
      destroy: () => void;
    };
  }
}

export function useUserpilot() {
  const { user: authUser } = useAuth();
  const { user: userProfile } = useUser();
  const hasIdentified = useRef(false);

  // Initialize and identify user when authenticated
  useEffect(() => {
    if (!window.userpilot) {
      console.warn('[Userpilot] SDK not loaded');
      return;
    }

    if (USERPILOT_TOKEN === 'YOUR_USERPILOT_TOKEN') {
      console.warn('[Userpilot] Token not configured - onboarding flows will not work');
      return;
    }

    if (authUser && !hasIdentified.current) {
      // Identify the user with Userpilot
      window.userpilot.identify(authUser.id, {
        name: userProfile.name || undefined,
        email: authUser.email,
        created_at: authUser.created_at,
        // Add any additional properties you want to segment users by
        plan: 'trial', // You can update this based on subscription status
      });
      hasIdentified.current = true;
      console.log('[Userpilot] User identified:', authUser.id);
    } else if (!authUser && hasIdentified.current) {
      // User logged out - reset state
      hasIdentified.current = false;
      window.userpilot.anonymous();
    }
  }, [authUser, userProfile.name]);

  // Helper to manually trigger a specific flow
  const triggerFlow = (flowId: string) => {
    if (window.userpilot) {
      window.userpilot.trigger(flowId);
    }
  };

  // Helper to track custom events
  const trackEvent = (eventName: string, properties?: Record<string, unknown>) => {
    if (window.userpilot) {
      window.userpilot.track(eventName, properties);
    }
  };

  return { triggerFlow, trackEvent };
}
