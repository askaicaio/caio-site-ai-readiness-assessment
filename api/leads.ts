// =============================================================
// Password-gated Scaling Up leads endpoint
// =============================================================
// Two operations on a single URL, distinguished by method:
//
//   POST /api/leads   { password }
//     → checks against SCALING_UP_LEADS_PASSWORD env (default 'scalingup2026')
//     → on success, sets an httpOnly cookie carrying a signed session token
//     → returns { ok: true }
//     → 401 on wrong password
//
//   GET  /api/leads   (cookie required)
//     → verifies the cookie's HMAC token
//     → queries the MailerLite Connect API for every subscriber, paginates
//     → returns { leads: [...] } shaped for the front-end table
//     → 401 if the cookie is missing or invalid
//
// Security notes:
//   - Password comparison uses timingSafeEqual to resist timing attacks
//   - Session token is an HMAC of a fixed string using SCALING_UP_LEADS_SECRET
//     (falls back to the password itself, so the setup works with just one env)
//   - Cookie is HttpOnly + Secure + SameSite=Strict → no JS access, no CSRF
//   - X-Robots-Tag header on every response tells search engines to noindex
//   - Fallback default password is intentional so it works out of the box —
//     override SCALING_UP_LEADS_PASSWORD in Vercel env to change it
// =============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createHmac, timingSafeEqual } from 'crypto';
import { list } from '@vercel/blob';

export const config = { maxDuration: 30 };

// Two portals share this endpoint, scoped by which password was used:
//   'scaling-up' → Scaling Up team. Sees ONLY edition === 'scaling-up' leads.
//   'all'        → CAIO team. Sees every lead.
// The scope is derived from the password (never a client-supplied param), so a
// Scaling Up user can't widen their view by tampering with the request.
type Scope = 'scaling-up' | 'all';

const SU_DEFAULT_PASSWORD   = 'scalingup2026';
const CAIO_DEFAULT_PASSWORD = 'caioleads2026';
const COOKIE_NAME = 'leads_auth';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

// Known Scaling Up leads captured BEFORE edition tracking existed (so their
// stored edition is blank). Sourced from the GHL `ai-audit-scaling-up` tag.
// We treat these as scaling-up so they surface in the Scaling Up portal.
// Newer submissions carry the edition automatically and don't need listing.
const KNOWN_SCALING_UP_EMAILS = new Set<string>([
  'cdc@krexinc.com',
  'dani@123.com',
  'dneefe@gmail.com',
  'djneefe@gmail.com',
  'joshua@chiefaiofficer.com',
  'abroome@scalingup.com',
  'askai@chiefaiofficer.com',
]);

// ─── Auth helpers ────────────────────────────────────────────────────────────
function passwordForScope(scope: Scope): string {
  return scope === 'all'
    ? (process.env.CAIO_LEADS_PASSWORD?.trim()) || CAIO_DEFAULT_PASSWORD
    : (process.env.SCALING_UP_LEADS_PASSWORD?.trim()) || SU_DEFAULT_PASSWORD;
}
function secretForScope(scope: Scope): string {
  // Reuse the scope's password as the HMAC secret if no dedicated secret is set,
  // so the setup works with zero required env vars. Distinct passwords per scope
  // mean distinct tokens automatically.
  return (process.env.LEADS_SECRET?.trim()) || `${passwordForScope(scope)}::${scope}`;
}
function makeSessionToken(scope: Scope): string {
  return createHmac('sha256', secretForScope(scope)).update(`leads-authed:${scope}`).digest('hex');
}
function timingSafeStringEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a, 'utf8');
  const bb = Buffer.from(b, 'utf8');
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
function parseCookies(header: string | undefined): Record<string, string> {
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (!k) continue;
    out[k] = rest.join('=');
  }
  return out;
}
// Server-to-server bypass: a caller presenting the shared LEADS_API_TOKEN in
// the X-Leads-Token header gets 'all' scope without a password/cookie. Used by
// the Motherboard dashboard's server-side proxy so the token never reaches a
// browser. No-op unless LEADS_API_TOKEN is configured.
function tokenScope(req: VercelRequest): Scope | null {
  const configured = process.env.LEADS_API_TOKEN?.trim();
  if (!configured) return null;
  const raw = req.headers['x-leads-token'];
  const presented = (Array.isArray(raw) ? raw[0] : raw)?.trim();
  if (presented && timingSafeStringEqual(presented, configured)) return 'all';
  return null;
}

// Returns the authed scope from the cookie, or null if not signed in.
function authedScope(req: VercelRequest): Scope | null {
  const token = parseCookies(req.headers.cookie)[COOKIE_NAME];
  if (!token) return null;
  if (timingSafeStringEqual(token, makeSessionToken('all'))) return 'all';
  if (timingSafeStringEqual(token, makeSessionToken('scaling-up'))) return 'scaling-up';
  return null;
}

// ─── MailerLite fetch ────────────────────────────────────────────────────────
interface MlSubscriber {
  id?: string;
  email?: string;
  status?: string;
  subscribed_at?: string;
  fields?: Record<string, string | number | null>;
  groups?: Array<{ id?: string; name?: string } | string>;
}

interface QA { question: string; answer: string }

interface Lead {
  id: string;
  email: string;
  subscribedAt: string;
  name: string;
  company: string;
  role: string;
  industry: string;
  companySize: string;
  tier: string;
  pct: string;
  pdfUrl: string;
  edition: string;
  groups: string[];
  // Enriched from the Blob lead-record sidecar (blank for pre-tracking leads).
  utmSource: string;
  utmCampaign: string;
  referer: string;
  primaryGoal: string;
  biggestChallenge: string;
  aiTools: string;
  answers: QA[];
  // Enriched from the Blob booking sidecar (bookings/) — set when this lead has
  // booked a call on a tracked GHL calendar (Dani's 1:1, CAIO exec briefing…).
  bookedCall: boolean;
  bookedAt: string;
  bookedCalendar: string;
}

function toLead(s: MlSubscriber): Lead {
  const fields = s.fields || {};
  const asStr = (v: unknown): string => (v == null ? '' : String(v));
  const groups: string[] = (s.groups || []).map(g =>
    typeof g === 'object' && g && 'name' in g ? (g.name || '') : String(g || ''),
  ).filter(Boolean);
  // Derive tier from group name if the tier field isn't populated on older records.
  const tierFromGroups = ['Leader', 'Adopter', 'Explorer']
    .find(t => groups.some(g => g.includes(t))) || '';
  return {
    id: asStr(s.id),
    email: asStr(s.email),
    subscribedAt: asStr(s.subscribed_at),
    name: asStr(fields.name),
    company: asStr(fields.company),
    role: asStr(fields.role),
    industry: asStr(fields.industry),
    companySize: asStr(fields.company_size),
    tier: asStr(fields.tier) || tierFromGroups,
    pct: asStr(fields.pct),
    pdfUrl: asStr(fields.pdf_url),
    edition: asStr(fields.edition),
    groups,
    utmSource: '', utmCampaign: '', referer: '',
    primaryGoal: '', biggestChallenge: '', aiTools: '',
    answers: [],
    bookedCall: false, bookedAt: '', bookedCalendar: '',
  };
}

// ─── Blob lead-record sidecars ────────────────────────────────────────────────
// Every submission writes a complete JSON record under leads/. We read them
// back server-side (never exposed to the client except through this gated
// endpoint) and key by lowercased email so we can enrich the MailerLite rows
// with the true source + every answer.
interface LeadRecord {
  name?: string; email?: string;
  company?: string; role?: string; industry?: string; companySize?: string;
  tier?: string; pct?: number; score?: number; maxScore?: number;
  edition?: string;
  utmSource?: string; utmCampaign?: string; referer?: string;
  primaryGoal?: string; biggestChallenge?: string; aiTools?: string;
  answers?: QA[];
  pdfUrl?: string; submittedAt?: string;
}

async function fetchLeadRecords(): Promise<Map<string, LeadRecord>> {
  const map = new Map<string, LeadRecord>();
  try {
    const { blobs } = await list({ prefix: 'leads/', limit: 1000 });
    const records = await Promise.all(blobs.map(async b => {
      try {
        const res = await fetch(b.url);
        if (!res.ok) return null;
        return (await res.json()) as LeadRecord;
      } catch { return null; }
    }));
    for (const rec of records) {
      const email = rec?.email?.trim().toLowerCase();
      if (!email) continue;
      const existing = map.get(email);
      // Keep the newest record if the same email submitted more than once.
      if (!existing || (rec!.submittedAt || '') > (existing.submittedAt || '')) {
        map.set(email, rec!);
      }
    }
  } catch (err) {
    console.error('[leads] blob list error:', err);
  }
  return map;
}

function recordToLead(rec: LeadRecord): Lead {
  return {
    id: rec.submittedAt || rec.email || Math.random().toString(36).slice(2),
    email: rec.email || '',
    subscribedAt: rec.submittedAt || '',
    name: rec.name || '',
    company: rec.company || '',
    role: rec.role || '',
    industry: rec.industry || '',
    companySize: rec.companySize || '',
    tier: rec.tier || '',
    pct: rec.pct != null ? String(rec.pct) : '',
    pdfUrl: rec.pdfUrl || '',
    edition: rec.edition || '',
    groups: [],
    utmSource: rec.utmSource || '',
    utmCampaign: rec.utmCampaign || '',
    referer: rec.referer || '',
    primaryGoal: rec.primaryGoal || '',
    biggestChallenge: rec.biggestChallenge || '',
    aiTools: rec.aiTools || '',
    answers: Array.isArray(rec.answers) ? rec.answers : [],
    bookedCall: false, bookedAt: '', bookedCalendar: '',
  };
}

// ─── Blob booking sidecars ───────────────────────────────────────────────────
// api/booking.ts writes one record per booking event under bookings/. We keep
// the LATEST event per email (so a cancel after a book wins) and expose a small
// { booked, bookedAt, calendar } we can stamp onto each lead.
interface BookingRecord {
  email?: string;
  bookedAt?: string;
  calendar?: string;
  status?: string;
  booked?: boolean;
  receivedAt?: string;
}
interface BookingState { booked: boolean; bookedAt: string; calendar: string }

async function fetchBookings(): Promise<Map<string, BookingState>> {
  const latest = new Map<string, BookingRecord>();
  try {
    const { blobs } = await list({ prefix: 'bookings/', limit: 1000 });
    const records = await Promise.all(blobs.map(async b => {
      try {
        const res = await fetch(b.url, { cache: 'no-store' });
        if (!res.ok) return null;
        return (await res.json()) as BookingRecord;
      } catch { return null; }
    }));
    for (const rec of records) {
      const email = rec?.email?.trim().toLowerCase();
      if (!email) continue;
      const existing = latest.get(email);
      if (!existing || (rec!.receivedAt || '') > (existing.receivedAt || '')) {
        latest.set(email, rec!);
      }
    }
  } catch (err) {
    console.error('[leads] bookings list error:', err);
  }
  const out = new Map<string, BookingState>();
  for (const [email, rec] of latest) {
    out.set(email, {
      booked: rec.booked !== false, // default true unless explicitly cancelled
      bookedAt: rec.bookedAt || rec.receivedAt || '',
      calendar: rec.calendar || '',
    });
  }
  return out;
}

async function fetchAllSubscribers(apiKey: string): Promise<Lead[]> {
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  };
  const collected: MlSubscriber[] = [];
  let cursor: string | null = null;
  let pages = 0;
  const MAX_PAGES = 30; // hard safety cap → up to 3000 subscribers per view
  while (pages < MAX_PAGES) {
    const url = new URL('https://connect.mailerlite.com/api/subscribers');
    url.searchParams.set('limit', '100');
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url.toString(), { headers });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`MailerLite ${res.status}: ${body.slice(0, 300)}`);
    }
    const json = await res.json() as {
      data?: MlSubscriber[];
      meta?: { next_cursor?: string | null };
      links?: { next?: string | null };
    };
    collected.push(...(json.data || []));
    // MailerLite paginates via `cursor` — presence of a next_cursor indicates more pages.
    const nextCursor = json.meta?.next_cursor;
    if (!nextCursor) break;
    cursor = nextCursor;
    pages++;
  }
  const leads = collected.map(toLead);
  // Sort newest → oldest.
  leads.sort((a, b) => (a.subscribedAt < b.subscribedAt ? 1 : -1));
  return leads;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Belt-and-braces: header-level no-index alongside the vercel.json rule.
  res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');

  if (req.method === 'POST') {
    // Auth attempt. Scope comes from the portal (which URL the user is on);
    // the password is validated against THAT scope's password.
    const body = (req.body || {}) as { password?: string; scope?: string };
    const password = (body.password || '').trim();
    const scope: Scope = body.scope === 'all' ? 'all' : 'scaling-up';
    if (!password) return res.status(400).json({ error: 'Password required.' });
    if (!timingSafeStringEqual(password, passwordForScope(scope))) {
      return res.status(401).json({ error: 'Wrong password.' });
    }
    const token = makeSessionToken(scope);
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}`,
    );
    return res.status(200).json({ ok: true, scope });
  }

  if (req.method === 'DELETE') {
    // Logout — clear the cookie.
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
    );
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  // GET is authorised by the shared server-to-server token OR the session
  // cookie; the resulting scope determines what's visible.
  const scope = tokenScope(req) || authedScope(req);
  if (!scope) return res.status(401).json({ error: 'Not signed in.' });

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'MAILERLITE_API_KEY not configured in Vercel env.' });
  }

  try {
    // MailerLite is the base list (guarantees every existing subscriber shows).
    // Blob records enrich each row with the true source + full answers, and add
    // any lead that made it to Blob but not MailerLite (rare — e.g. an ML write
    // that failed). Blob enrichment is best-effort: if it throws, we still
    // return the MailerLite rows.
    const [mlLeads, records, bookings] = await Promise.all([
      fetchAllSubscribers(apiKey),
      fetchLeadRecords(),
      fetchBookings(),
    ]);

    const seen = new Set<string>();
    const leads: Lead[] = mlLeads.map(l => {
      const key = l.email.trim().toLowerCase();
      seen.add(key);
      const rec = records.get(key);
      if (!rec) return l;
      // Prefer values we already have from ML; fill blanks + attach the rich
      // fields that only exist in the Blob record.
      return {
        ...l,
        tier:        l.tier    || rec.tier    || '',
        pct:         l.pct     || (rec.pct != null ? String(rec.pct) : ''),
        edition:     l.edition || rec.edition || '',
        company:     l.company || rec.company || '',
        role:        l.role    || rec.role    || '',
        industry:    l.industry || rec.industry || '',
        companySize: l.companySize || rec.companySize || '',
        pdfUrl:      l.pdfUrl  || rec.pdfUrl  || '',
        utmSource:   rec.utmSource   || '',
        utmCampaign: rec.utmCampaign || '',
        referer:     rec.referer     || '',
        primaryGoal: rec.primaryGoal || '',
        biggestChallenge: rec.biggestChallenge || '',
        aiTools:     rec.aiTools || '',
        answers:     Array.isArray(rec.answers) ? rec.answers : [],
      };
    });

    // Union in Blob-only leads (not present in MailerLite).
    for (const [key, rec] of records) {
      if (!seen.has(key)) leads.push(recordToLead(rec));
    }

    // Backfill edition for known pre-tracking Scaling Up leads (GHL tag export).
    for (const l of leads) {
      if (!l.edition && KNOWN_SCALING_UP_EMAILS.has(l.email.trim().toLowerCase())) {
        l.edition = 'scaling-up';
      }
    }

    // Stamp booking state (who booked a call, on which calendar) from GHL.
    for (const l of leads) {
      const b = bookings.get(l.email.trim().toLowerCase());
      if (b?.booked) {
        l.bookedCall = true;
        l.bookedAt = b.bookedAt;
        l.bookedCalendar = b.calendar;
      }
    }

    // Scope isolation: the Scaling Up portal only ever receives scaling-up
    // leads — CAIO / unknown-edition leads never leave the server for that
    // scope. The CAIO ('all') portal receives everything.
    const scoped = scope === 'scaling-up'
      ? leads.filter(l => l.edition === 'scaling-up')
      : leads;

    scoped.sort((a, b) => (a.subscribedAt < b.subscribedAt ? 1 : -1));
    return res.status(200).json({ leads: scoped, count: scoped.length, scope, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[leads] fetch error:', err);
    return res.status(502).json({ error: `Failed to fetch subscribers from MailerLite: ${err instanceof Error ? err.message : String(err)}` });
  }
}
