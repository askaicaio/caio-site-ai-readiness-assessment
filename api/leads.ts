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

export const config = { maxDuration: 30 };

const DEFAULT_PASSWORD = 'scalingup2026';
const COOKIE_NAME = 'su_leads_auth';
const COOKIE_MAX_AGE = 60 * 60 * 8; // 8 hours

// ─── Auth helpers ────────────────────────────────────────────────────────────
function getPassword(): string {
  return (process.env.SCALING_UP_LEADS_PASSWORD?.trim()) || DEFAULT_PASSWORD;
}
function getSecret(): string {
  // Reuse the password as the HMAC secret if a dedicated secret isn't set —
  // this makes the setup work with zero required env vars.
  return (process.env.SCALING_UP_LEADS_SECRET?.trim()) || getPassword();
}
function makeSessionToken(): string {
  return createHmac('sha256', getSecret()).update('scaling-up-leads-authed').digest('hex');
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
function isAuthed(req: VercelRequest): boolean {
  const cookies = parseCookies(req.headers.cookie);
  const token = cookies[COOKIE_NAME];
  if (!token) return false;
  return timingSafeStringEqual(token, makeSessionToken());
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
  };
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
    // Auth attempt.
    const body = (req.body || {}) as { password?: string };
    const password = (body.password || '').trim();
    if (!password) return res.status(400).json({ error: 'Password required.' });
    if (!timingSafeStringEqual(password, getPassword())) {
      return res.status(401).json({ error: 'Wrong password.' });
    }
    const token = makeSessionToken();
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${COOKIE_MAX_AGE}`,
    );
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    // Logout — clear the cookie.
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`,
    );
    return res.status(200).json({ ok: true });
  }

  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  // GET requires the session cookie.
  if (!isAuthed(req)) return res.status(401).json({ error: 'Not signed in.' });

  const apiKey = process.env.MAILERLITE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'MAILERLITE_API_KEY not configured in Vercel env.' });
  }

  try {
    const leads = await fetchAllSubscribers(apiKey);
    return res.status(200).json({ leads, count: leads.length, fetchedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[leads] fetch error:', err);
    return res.status(502).json({ error: `Failed to fetch subscribers from MailerLite: ${err instanceof Error ? err.message : String(err)}` });
  }
}
