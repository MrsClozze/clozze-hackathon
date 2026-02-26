/**
 * PostHog Analytics Module
 *
 * Initialises PostHog once and exposes typed helpers for
 * identification, UTM registration, and event capture.
 */
import posthog from 'posthog-js';

const POSTHOG_KEY = 'phc_WsPeLkruW8jpxi20MXxeBbFFEQXIrTfFvSt1dlyIDbF';

let initialised = false;

export function initPostHog() {
  if (initialised) return;
  posthog.init(POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
  });
  initialised = true;

  // Register UTM params on first load
  const params = new URLSearchParams(window.location.search);
  const utm: Record<string, string> = {};
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'].forEach((key) => {
    const val = params.get(key);
    if (val) utm[key] = val;
  });
  if (Object.keys(utm).length > 0) {
    posthog.register(utm);
  }
}

// ─── User identification ───────────────────────────────────────
export function identifyUser(userId: string, traits: Record<string, any> = {}) {
  posthog.identify(userId, traits);
}

export function resetUser() {
  posthog.reset();
}

// ─── Generic capture ───────────────────────────────────────────
export function phCapture(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}

// ─── Typed event helpers ───────────────────────────────────────

// Core
export const phAppVisit = () => phCapture('app_visit');
export const phSignupStart = () => phCapture('signup_start');
export const phSignupComplete = () => phCapture('signup_complete');
export const phLogin = () => phCapture('login');

// Activation
export const phCreateWorkspace = () => phCapture('create_workspace');
export const phCreateTransaction = () => phCapture('create_transaction');
export const phInviteTeammate = () => phCapture('invite_teammate');
export const phConnectIntegration = (name?: string) =>
  phCapture('connect_integration', name ? { integration: name } : undefined);

// Engagement
export const phUploadDocument = () => phCapture('upload_document');
export const phCreateTask = () => phCapture('create_task');
export const phCompleteTask = () => phCapture('complete_task');
export const phCommentAdded = () => phCapture('comment_added');

// Revenue
export const phCheckoutStart = () => phCapture('checkout_start');
export const phPurchaseComplete = (value: number, plan: string) =>
  phCapture('purchase_complete', { value, plan });
export const phSubscriptionCanceled = () => phCapture('subscription_canceled');
