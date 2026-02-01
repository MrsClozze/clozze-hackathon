/**
 * Google Analytics 4 Event Tracking Utility
 * 
 * This module provides type-safe wrappers for firing GA4 events.
 * The base gtag.js script with measurement ID G-1JF0Z8KBYW is loaded in index.html.
 */

// Extend Window interface to include gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
  }
}

/**
 * Safely fire a GA4 event, ensuring gtag is available
 */
function safeGtag(...args: any[]): void {
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag(...args);
  } else {
    console.warn('[Analytics] gtag not available, event not fired:', args);
  }
}

/**
 * Track when a user qualifies a lead (e.g., moves buyer/listing to Active status)
 */
export function trackQualifyLead(): void {
  safeGtag('event', 'qualify_lead');
}

/**
 * Track when a user closes/converts a lead (e.g., moves buyer/listing to Closed status)
 */
export function trackCloseConvertLead(): void {
  safeGtag('event', 'close_convert_lead');
}

/**
 * Track when a user completes a purchase
 * @param value - The purchase amount in USD
 */
export function trackPurchase(value: number): void {
  safeGtag('event', 'purchase', {
    value: value,
    currency: 'USD'
  });
}

/**
 * Generic event tracking for custom events
 */
export function trackEvent(eventName: string, params?: Record<string, any>): void {
  if (params) {
    safeGtag('event', eventName, params);
  } else {
    safeGtag('event', eventName);
  }
}
