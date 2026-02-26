/**
 * PostHog Analytics Module
 *
 * Initialises PostHog once and exposes typed helpers for
 * identification, UTM registration, and event capture.
 */
import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_WsPeLkruW8jpxi20MXxeBbFFEQXIrTfFvSt1dlyIDbF';

/** The shared PostHog instance – import this instead of relying on window. */
export const ph = posthog;

let initialised = false;

export function initPostHog() {
  if (initialised) return;
  console.log('[PostHog] Initializing...');
  ph.init(POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  });
  initialised = true;

  // Attach to window for DevTools debugging
  (window as any).posthog = ph;
  console.log('[PostHog] Attached to window.posthog', typeof (window as any).posthog);

  // Register UTM params on first load
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
    const val = params.get(key);
    if (val) utm[key] = val;
  });
  if (Object.keys(utm).length > 0) {
    ph.register(utm);
  }
}

// ─── User identification ───────────────────────────────────────
export function identifyUser(userId: string, traits: Record<string, any> = {}) {
  console.log('[PostHog] identify fired', userId, traits);
  ph.identify(userId, traits);
}

export function resetUser() {
  console.log('[PostHog] reset fired');
  ph.reset();
}

// ─── Generic capture ───────────────────────────────────────────
export function phCapture(event: string, properties?: Record<string, any>) {
  ph.capture(event, properties);
}

// ─── Typed event helpers ───────────────────────────────────────

// Core
export const phAppVisit = () => { console.log('[PostHog] app_visit fired'); phCapture('app_visit'); };
export const phSignupStart = () => { console.log('[PostHog] signup_start fired'); phCapture('signup_start'); };
export const phSignupComplete = () => { console.log('[PostHog] signup_complete fired'); phCapture('signup_complete'); };
export const phLogin = () => { console.log('[PostHog] login fired'); phCapture('login'); };

// Activation
export const phCreateWorkspace = () => { console.log('[PostHog] create_workspace fired'); phCapture('create_workspace'); };
export const phCreateTransaction = () => { console.log('[PostHog] create_transaction fired'); phCapture('create_transaction'); };
export const phInviteTeammate = () => { console.log('[PostHog] invite_teammate fired'); phCapture('invite_teammate'); };
export const phConnectIntegration = (name?: string) => {
  console.log('[PostHog] connect_integration fired', name);
  phCapture('connect_integration', name ? { integration: name } : undefined);
};

// Engagement
export const phUploadDocument = () => { console.log('[PostHog] upload_document fired'); phCapture('upload_document'); };
export const phCreateTask = () => { console.log('[PostHog] create_task fired'); phCapture('create_task'); };
export const phCompleteTask = () => { console.log('[PostHog] complete_task fired'); phCapture('complete_task'); };
export const phCommentAdded = () => { console.log('[PostHog] comment_added fired'); phCapture('comment_added'); };

// Revenue
export const phCheckoutStart = () => { console.log('[PostHog] checkout_start fired'); phCapture('checkout_start'); };
export const phPurchaseComplete = (value: number, plan: string) => {
  console.log('[PostHog] purchase_complete fired', { value, plan });
  phCapture('purchase_complete', { value, plan });
};
export const phSubscriptionCanceled = () => { console.log('[PostHog] subscription_canceled fired'); phCapture('subscription_canceled'); };
