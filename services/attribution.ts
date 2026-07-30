// =============================================================
// UTM attribution + visit tracking
// =============================================================
// Captures UTM params from the URL on first page load, persists
// them to sessionStorage so they survive the quiz flow, and pings
// motherboard's campaign webhook when someone arrives from a
// tagged email source so we can count clicks (not just completions).
// =============================================================

const STORAGE_KEY = "caio_utm_attribution";

export interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referer?: string;
  capturedAt?: string;
  /**
   * Affiliate/partner referral code — read from ?aff_id (the param the CAIO
   * affiliate redirector /r appends), falling back to ?utm_content (which the
   * same redirect also sets). Persisted through the quiz so a completed lead
   * can be credited to the affiliate.
   */
  affiliateCode?: string;
}

/**
 * Read UTMs from the current URL and persist to sessionStorage if
 * present. If the URL has no UTMs but sessionStorage already has some
 * (from an earlier load this session), keep those. Idempotent.
 */
export function captureAttributionFromUrl(): Attribution {
  if (typeof window === "undefined") return {};

  const url = new URL(window.location.href);
  const fresh: Attribution = {};
  const get = (k: string) => url.searchParams.get(k)?.trim() || undefined;

  fresh.utmSource = get("utm_source");
  fresh.utmMedium = get("utm_medium");
  fresh.utmCampaign = get("utm_campaign");
  fresh.utmContent = get("utm_content");
  fresh.utmTerm = get("utm_term");
  fresh.referer = document.referrer || undefined;
  // Affiliate code: prefer the explicit ?aff_id, fall back to ?utm_content
  // (the CAIO /r redirect sets both).
  fresh.affiliateCode = get("aff_id") || get("utm_content");

  const hasFresh = !!(
    fresh.utmSource ||
    fresh.utmMedium ||
    fresh.utmCampaign ||
    fresh.utmContent ||
    fresh.utmTerm ||
    fresh.affiliateCode
  );

  if (hasFresh) {
    fresh.capturedAt = new Date().toISOString();
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
    } catch {
      // sessionStorage can throw in private windows / cookie-blocked browsers — ignore
    }
    return fresh;
  }

  // No UTMs in this URL — fall back to whatever we captured earlier this session
  return readAttribution();
}

export function readAttribution(): Attribution {
  if (typeof window === "undefined") return {};
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Attribution;
  } catch {
    return {};
  }
}

// -------------------------------------------------------------
// Visit ping — fire-and-forget POST to motherboard so it can count
// clicks separately from completions. Configured via env. We only
// fire when we actually have a utm_source so we don't spam motherboard
// with organic traffic noise.
// -------------------------------------------------------------

/**
 * Vercel exposes Vite-prefixed envs to the client. Set these in the
 * Vercel project for the quiz:
 *   VITE_MOTHERBOARD_WEBHOOK_URL — the full URL up to (and including) the secret
 *                                  but NOT the ?event= query string. We append
 *                                  the event type per call.
 *
 * Example value:
 *   https://motherboard.chiefaiofficer.com/api/campaigns/{campaignId}/webhook/{secret}
 *
 * When not set, the ping silently no-ops.
 */
function getWebhookBase(): string | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const env = (import.meta as any).env || {};
  const url = env.VITE_MOTHERBOARD_WEBHOOK_URL as string | undefined;
  return url && url.trim() ? url.trim().replace(/\/$/, "") : null;
}

/**
 * Notify motherboard that someone landed on the quiz from a tagged
 * email source. No-ops when (a) no webhook configured or (b) no
 * utm_source on this visit. We don't have an email yet so motherboard
 * stores it as an attributionless event on the campaign.
 */
export async function pingQuizVisit(attribution: Attribution): Promise<void> {
  if (!attribution.utmSource) return;
  const base = getWebhookBase();
  if (!base) return;

  const url = `${base}?event=quiz_visit`;
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive lets the request complete even if the user navigates away
      keepalive: true,
      body: JSON.stringify({
        ...attribution,
        // No email yet — motherboard logs this as a no-lead event
        userAgent: navigator.userAgent,
        path: window.location.pathname,
      }),
    });
  } catch {
    // Best-effort — never block the user on telemetry
  }
}
