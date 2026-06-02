// =============================================================
// Analytics — Vercel Web Analytics + PostHog event tracking
// =============================================================
// Vercel Analytics provides zero-config traffic / Core Web Vitals and is
// initialized in App.tsx via <Analytics /> from @vercel/analytics/react.
//
// PostHog drives event-level funnel analytics. It is initialized lazily
// from this module the first time we try to use it, so the bundle stays
// small for users who never make it past the landing.
//
// Configure via Vercel env vars:
//   VITE_POSTHOG_KEY    — project API key from posthog.com → Project Settings
//   VITE_POSTHOG_HOST   — optional, defaults to https://us.i.posthog.com
//                        (use https://eu.i.posthog.com if you chose EU cloud)
//
// When the key is unset every track() call is a silent no-op, so this is
// safe to ship before PostHog is wired up.
// =============================================================

import type { PostHog } from 'posthog-js';

let phPromise: Promise<PostHog | null> | null = null;

function getEnv(key: string): string | undefined {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env || {};
  const value = env[key];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function loadPostHog(): Promise<PostHog | null> {
  if (typeof window === 'undefined') return null;

  const apiKey = getEnv('VITE_POSTHOG_KEY');
  if (!apiKey) return null;

  const host = getEnv('VITE_POSTHOG_HOST') || 'https://us.i.posthog.com';

  // Lazy-import keeps PostHog out of the initial bundle.
  const { default: posthog } = await import('posthog-js');
  posthog.init(apiKey, {
    api_host: host,
    capture_pageview: true,         // automatic page-view tracking
    capture_pageleave: true,        // for time-on-page
    autocapture: false,             // we send explicit events instead
    persistence: 'localStorage+cookie',
    person_profiles: 'identified_only', // only create profiles when we identify
  });
  return posthog;
}

function getPostHog(): Promise<PostHog | null> {
  if (!phPromise) phPromise = loadPostHog();
  return phPromise;
}

/**
 * Fire-and-forget custom event. Silent no-op when PostHog isn't configured.
 *
 * Funnel-key events the quiz fires:
 *   quiz_landing_viewed     — landed on the assessment (with `source`)
 *   quiz_started            — first question rendered
 *   quiz_question_answered  — each radio selection (with `step`, `questionId`)
 *   quiz_completed          — final question answered (with `score`, `tier`)
 *   quiz_form_started       — focused first form field
 *   quiz_form_submitted     — pressed Generate My Report (with `tier`)
 *   quiz_report_delivered   — pdfUrl received from /api/capture
 *   quiz_report_downloaded  — clicked the PDF download button
 *   quiz_booking_clicked    — clicked the briefing CTA
 *   quiz_restarted          — clicked "take the assessment again"
 */
export function track(event: string, properties?: Record<string, unknown>): void {
  void getPostHog().then(ph => ph?.capture(event, properties));
}

/**
 * Associate the current session with an email. Call once after the lead
 * submits the form so subsequent events are attributable in PostHog.
 */
export function identify(email: string, traits?: Record<string, unknown>): void {
  void getPostHog().then(ph => {
    if (!ph) return;
    ph.identify(email, traits);
  });
}

/**
 * Reset identity (e.g. "take the assessment again" → treat as new session).
 */
export function reset(): void {
  void getPostHog().then(ph => ph?.reset());
}
