// =============================================================
// Booking webhook — "who booked a call" signal from GHL
// =============================================================
// GoHighLevel fires this endpoint from a workflow when someone books (or
// cancels) an appointment on a tracked calendar (Dani's 1:1, the CAIO exec
// briefing, etc). We persist a small booking record to Blob keyed by email;
// /api/leads reads those back and stamps each lead with `bookedCall` so the
// leads portals + the Motherboard Leads tab can show a "Booked" badge/filter.
//
//   POST /api/booking            (token required)
//     header  X-Booking-Token: <LEADS_API_TOKEN>   — or —
//     query   ?token=<LEADS_API_TOKEN>
//     body    { email, bookedAt?, calendar?, status? }   (JSON)
//     → writes bookings/<emailslug>-<ts>.json, returns { ok: true }
//
// Auth reuses LEADS_API_TOKEN (the same secret the Motherboard proxy uses to
// READ leads) so there's no extra env var to configure. Without that env set,
// the endpoint refuses writes (503) rather than accepting anonymous bookings.
//
// Cancellations: GHL's "Appointment status" trigger also fires on cancelled /
// no-show. We record whatever status arrives; a status of cancelled/no-show/
// invalid marks booked=false. /api/leads keeps the LATEST record per email, so
// a later cancel correctly clears the badge.
// =============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { timingSafeEqual } from 'crypto';
import { put } from '@vercel/blob';

export const config = { maxDuration: 15 };

function timingSafeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

// Accepts the token from either a header (cleaner) or a query param (easiest to
// paste into GHL's webhook URL). Both are checked against LEADS_API_TOKEN.
function isAuthed(req: VercelRequest): boolean {
  const configured = process.env.LEADS_API_TOKEN?.trim();
  if (!configured) return false;
  const headerRaw = req.headers['x-booking-token'] ?? req.headers['x-leads-token'];
  const header = (Array.isArray(headerRaw) ? headerRaw[0] : headerRaw)?.trim();
  const queryRaw = req.query?.token;
  const query = (Array.isArray(queryRaw) ? queryRaw[0] : queryRaw)?.trim();
  const presented = header || query;
  if (!presented) return false;
  return timingSafeStringEqual(presented, configured);
}

// GHL payload shapes vary by how the webhook action is configured, so pull each
// value from a permissive set of likely keys (flat or lightly nested).
function pick(obj: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v != null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

const CANCELLED_STATUSES = new Set(['cancelled', 'canceled', 'no-show', 'noshow', 'no_show', 'invalid', 'declined']);

function emailSlug(email: string): string {
  return email.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'unknown';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. POST only.' });
  }
  if (!process.env.LEADS_API_TOKEN?.trim()) {
    return res.status(503).json({ error: 'Booking capture not configured (missing LEADS_API_TOKEN).' });
  }
  if (!isAuthed(req)) {
    return res.status(401).json({ error: 'Invalid or missing booking token.' });
  }

  // Body may arrive parsed (JSON / form) or as a raw string — handle both.
  let body: Record<string, unknown> = {};
  if (req.body && typeof req.body === 'object') {
    body = req.body as Record<string, unknown>;
  } else if (typeof req.body === 'string' && req.body.trim()) {
    try { body = JSON.parse(req.body); } catch { body = {}; }
  }
  // Some GHL configs nest the contact under `contact`.
  const contact = (body.contact && typeof body.contact === 'object' ? body.contact : {}) as Record<string, unknown>;
  const appt = (body.appointment && typeof body.appointment === 'object' ? body.appointment : {}) as Record<string, unknown>;

  const email = (
    pick(body, ['email', 'contact_email', 'contactEmail']) ||
    pick(contact, ['email', 'contact_email'])
  ).toLowerCase();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  const bookedAt =
    pick(body, ['bookedAt', 'booked_at', 'startTime', 'start_time', 'appointmentStartTime', 'selected_slot', 'startAt']) ||
    pick(appt, ['startTime', 'start_time', 'startAt']);

  const calendar =
    pick(body, ['calendar', 'calendarName', 'calendar_name', 'appointmentTitle', 'appointment_title', 'title']) ||
    pick(appt, ['title', 'calendarName', 'calendar_name', 'name']);

  const status = (
    pick(body, ['status', 'appointmentStatus', 'appointment_status']) ||
    pick(appt, ['status', 'appointmentStatus'])
  ).toLowerCase();

  // GHL contact source (which link/form/tag they came in on) — extra
  // attribution context, sent as a custom {{contact.source}} pair.
  const source =
    pick(body, ['source', 'contactSource', 'contact_source']) ||
    pick(contact, ['source', 'contact_source']);

  const booked = !CANCELLED_STATUSES.has(status);

  const record = {
    email,
    bookedAt,
    calendar,
    status,
    source,
    booked,
    receivedAt: new Date().toISOString(),
  };

  try {
    // One file per event (Blob adds a random suffix); /api/leads keeps the
    // latest per email, so re-books and cancellations resolve correctly.
    await put(`bookings/${emailSlug(email)}-${Date.now()}.json`, JSON.stringify(record), {
      access: 'public',
      contentType: 'application/json',
    });
  } catch (err) {
    console.error('[booking] blob write failed:', err);
    return res.status(500).json({ error: 'Failed to persist booking.' });
  }

  return res.status(200).json({ ok: true, email, booked });
}
