import React from 'react';
import fs from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Document, Page, Text, View, StyleSheet, Image, Link } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import { put } from '@vercel/blob';

export const config = { maxDuration: 30 };

const MAILERLITE_GROUP_ID = '185917251382150276';
const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/FgaFLGYrbGZSBVprTkhR/webhook-trigger/elWtYyahvdVemgjf2SBn';
const BOOKING_URL = 'https://api.leadconnectorhq.com/widget/bookings/b2b-executive-briefing';

// ─── Colours ────────────────────────────────────────────────────────────────
const INDIGO   = '#4f46e5';
const NAVY     = '#1e1b4b';
const TEXT     = '#374151';
const MUTED    = '#6b7280';
const SOFT     = '#f8fafc';
const GREEN    = '#16a34a';
const AMBER    = '#b45309';
const BLUE     = '#1d4ed8';

// ─── Section colour by title keyword ─────────────────────────────────────────
function sectionAccent(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('strength') || t.includes('win') || t.includes('success')) return GREEN;
  if (t.includes('improv') || t.includes('gap') || t.includes('risk') || t.includes('challenge') || t.includes('weakness')) return AMBER;
  if (t.includes('recommend') || t.includes('action') || t.includes('next') || t.includes('priorit') || t.includes('step')) return BLUE;
  return INDIGO;
}

// ─── Logo (bundled via vercel.json includeFiles) ──────────────────────────────
function getLogoSrc(): string {
  try {
    const p = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(p)) {
      return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
    }
  } catch { /* fall through */ }
  // Fallback: fetch from CDN at render time
  return 'https://assessment.chiefaiofficer.com/logo.png';
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:           { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: '#ffffff', paddingBottom: 72 },

  /* Header */
  headerBg:       { backgroundColor: NAVY, paddingTop: 28, paddingBottom: 26, paddingHorizontal: 50 },
  headerLogo:     { width: 190, marginBottom: 14 },
  headerBrand:    { color: '#ffffff', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  headerPartner:  { color: '#a5b4fc', fontSize: 8.5, marginTop: 3, marginBottom: 14 },
  headerRule:     { borderBottom: '1 solid #312e81', marginBottom: 14 },
  headerTitle:    { color: '#e0e7ff', fontSize: 15, fontFamily: 'Helvetica-Bold' },
  headerMeta:     { color: '#a5b4fc', fontSize: 9, marginTop: 4 },

  /* Body */
  body:           { paddingHorizontal: 50, paddingTop: 24 },

  /* Meta cards — row 1 */
  metaRow:        { flexDirection: 'row', gap: 10, marginBottom: 10 },
  metaCard:       { flex: 1, backgroundColor: SOFT, padding: '12 14', borderRadius: 6 },
  metaLabel:      { color: MUTED, fontSize: 7, textTransform: 'uppercase' },
  metaValue:      { color: NAVY, fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 4 },

  /* Meta cards — row 2 (context fields) */
  metaRowCtx:     { flexDirection: 'row', gap: 10, marginBottom: 22 },
  metaCardCtx:    { flex: 1, backgroundColor: SOFT, padding: '10 14', borderRadius: 6 },
  metaLabelCtx:   { color: MUTED, fontSize: 6.5, textTransform: 'uppercase' },
  metaValueCtx:   { color: NAVY, fontSize: 10, fontFamily: 'Helvetica-Bold', marginTop: 3 },

  /* Score card */
  scoreCard:      { backgroundColor: SOFT, borderRadius: 8, padding: '18 22', marginBottom: 24, borderLeft: 4, borderLeftColor: INDIGO },
  scoreRow:       { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  scoreNum:       { fontSize: 52, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1 },
  scoreSlash:     { fontSize: 22, color: MUTED, marginBottom: 8, marginLeft: 3, marginRight: 2 },
  scoreMaxNum:    { fontSize: 22, color: MUTED, marginBottom: 8 },
  scoreMeta:      { marginLeft: 20, paddingBottom: 2, flex: 1 },
  scoreMetaLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase' },
  scorePct:       { fontSize: 26, color: INDIGO, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  scoreTierLabel: { fontSize: 9, color: MUTED, marginTop: 4 },
  barTrack:       { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 },
  barFill:        { height: 8, borderRadius: 4 },
  barCaption:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  barCaptionText: { fontSize: 6.5, color: MUTED },

  /* Report sections — no wrap:false so they flow naturally across pages */
  section:        { marginBottom: 18 },
  sectionHead:    { padding: '9 14', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  sectionTitle:   { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  sectionBody:    { backgroundColor: '#fafbff', padding: '14 16', borderBottomLeftRadius: 5, borderBottomRightRadius: 5, borderLeft: '1 solid #e0e7ff', borderRight: '1 solid #e0e7ff', borderBottom: '1 solid #e0e7ff' },
  para:           { fontSize: 10, color: TEXT, lineHeight: 1.65, marginBottom: 5 },
  listRow:        { flexDirection: 'row', marginBottom: 7 },
  listBullet:     { fontSize: 10, fontFamily: 'Helvetica-Bold', marginRight: 8, minWidth: 18 },
  listText:       { fontSize: 10, color: TEXT, lineHeight: 1.55, flex: 1 },

  /* CTA block */
  ctaSection:     { marginTop: 26, backgroundColor: NAVY, borderRadius: 8, padding: '22 26' },
  ctaTitle:       { color: '#e0e7ff', fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  ctaBody:        { color: '#a5b4fc', fontSize: 9.5, lineHeight: 1.65, marginBottom: 18 },
  ctaBtn:         { backgroundColor: INDIGO, borderRadius: 5, paddingTop: 10, paddingBottom: 10, paddingLeft: 20, paddingRight: 20, alignSelf: 'flex-start' },
  ctaBtnText:     { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' },

  /* Footer */
  footer:         { position: 'absolute', bottom: 24, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTop: '1 solid #e5e7eb', paddingTop: 10 },
  footerText:     { fontSize: 7.5, color: MUTED },
});

// ─── Markdown parser ─────────────────────────────────────────────────────────
type Block = { type: 'paragraph' | 'numbered' | 'bullet'; text: string; num?: string };

function clean(text: string) {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\*(.*?)\*/g, '$1').trim();
}

function parseSection(body: string): Block[] {
  const blocks: Block[] = [];
  let buf: string[] = [];
  const flush = () => {
    const t = buf.join(' ').trim();
    if (t) blocks.push({ type: 'paragraph', text: clean(t) });
    buf = [];
  };
  for (const line of body.split('\n')) {
    const t = line.trim();
    if (!t) { flush(); continue; }
    const nm = t.match(/^(\d+)\.\s+(.*)/);
    if (nm)                { flush(); blocks.push({ type: 'numbered', num: nm[1], text: clean(nm[2]) }); continue; }
    if (/^[-*]\s/.test(t)) { flush(); blocks.push({ type: 'bullet',   text: clean(t.replace(/^[-*]\s+/, '')) }); continue; }
    buf.push(t);
  }
  flush();
  return blocks;
}

function parseReport(md: string) {
  return md.split(/(?=### )/).filter(chunk => chunk.trim()).map(chunk => {
    const lines = chunk.split('\n');
    return { title: lines[0].replace(/^### /, '').trim(), blocks: parseSection(lines.slice(1).join('\n')) };
  });
}

// ─── PDF builder ─────────────────────────────────────────────────────────────
interface DocProps {
  name: string; score: number; maxScore: number;
  tier: string; tierColor: string; date: string;
  sections: { title: string; blocks: Block[] }[];
  company?: string; role?: string; industry?: string; companySize?: string;
  logoSrc: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const e = React.createElement;

function buildPdf({ name, score, maxScore, tier, tierColor, date, sections, company, role, industry, companySize, logoSrc }: DocProps) {
  const pct = Math.round((score / maxScore) * 100);

  // ── Block renderer ──────────────────────────────────────────────────────────
  const blockEl = (b: Block, j: number) => {
    const accent = INDIGO; // colour set per-section below
    if (b.type === 'numbered') return e(View as any, { key: j, style: s.listRow },
      e(Text as any, { style: [s.listBullet, { color: accent }] }, `${b.num}.`),
      e(Text as any, { style: s.listText }, b.text),
    );
    if (b.type === 'bullet') return e(View as any, { key: j, style: s.listRow },
      e(Text as any, { style: [s.listBullet, { color: accent }] }, '•'),
      e(Text as any, { style: s.listText }, b.text),
    );
    return e(Text as any, { key: j, style: s.para }, b.text);
  };

  // ── Context meta row (role / industry / company size / company) ─────────────
  const ctxFields = [
    company     && { label: 'Company',      value: company },
    role        && { label: 'Role',         value: role },
    industry    && { label: 'Industry',     value: industry },
    companySize && { label: 'Company Size', value: companySize },
  ].filter(Boolean) as { label: string; value: string }[];

  const ctxRowEl = ctxFields.length > 0
    ? e(View as any, { style: s.metaRowCtx },
        ...ctxFields.map(({ label, value }) =>
          e(View as any, { style: s.metaCardCtx },
            e(Text as any, { style: s.metaLabelCtx }, label),
            e(Text as any, { style: s.metaValueCtx }, value),
          )
        )
      )
    : null;

  // ── Header line (name + company if available) ────────────────────────────────
  const headerMetaText = company
    ? `Prepared for ${name} at ${company}  ·  ${date}`
    : `Prepared for ${name}  ·  ${date}`;

  // ── Body children ────────────────────────────────────────────────────────────
  const bodyChildren: any[] = [
    // Row 1 meta — Name | Date | Tier
    e(View as any, { style: s.metaRow },
      e(View as any, { style: s.metaCard },
        e(Text as any, { style: s.metaLabel }, 'Prepared For'),
        e(Text as any, { style: s.metaValue }, name),
      ),
      e(View as any, { style: s.metaCard },
        e(Text as any, { style: s.metaLabel }, 'Date'),
        e(Text as any, { style: s.metaValue }, date),
      ),
      e(View as any, { style: [s.metaCard, { backgroundColor: tierColor }] },
        e(Text as any, { style: [s.metaLabel, { color: 'rgba(255,255,255,0.8)' }] }, 'AI Readiness Tier'),
        e(Text as any, { style: [s.metaValue, { color: '#ffffff' }] }, tier),
      ),
    ),
  ];

  // Row 2 meta — context fields (if any)
  if (ctxRowEl) bodyChildren.push(ctxRowEl);

  // Score card
  bodyChildren.push(
    e(View as any, { style: s.scoreCard },
      e(View as any, { style: s.scoreRow },
        e(Text as any, { style: s.scoreNum    }, String(score)),
        e(Text as any, { style: s.scoreSlash  }, '/'),
        e(Text as any, { style: s.scoreMaxNum }, String(maxScore)),
        e(View as any, { style: s.scoreMeta },
          e(Text as any, { style: s.scoreMetaLabel }, 'Overall Score'),
          e(Text as any, { style: s.scorePct       }, `${pct}%`),
          e(Text as any, { style: s.scoreTierLabel }, `${tier} — AI Readiness Tier`),
        ),
      ),
      e(View as any, { style: s.barTrack },
        e(View as any, { style: [s.barFill, { width: `${pct}%`, backgroundColor: tierColor }] }),
      ),
      e(View as any, { style: s.barCaption },
        e(Text as any, { style: s.barCaptionText }, '0%'),
        e(Text as any, { style: s.barCaptionText }, 'Explorer  ·  Adopter  ·  Leader'),
        e(Text as any, { style: s.barCaptionText }, '100%'),
      ),
    ),
  );

  // Report sections — no wrap:false so sections flow naturally across pages
  for (let i = 0; i < sections.length; i++) {
    const sec = sections[i];
    const accent = sectionAccent(sec.title);
    bodyChildren.push(
      e(View as any, { key: i, style: s.section },
        e(View as any, { style: [s.sectionHead, { backgroundColor: accent }] },
          e(Text as any, { style: s.sectionTitle }, sec.title),
        ),
        e(View as any, { style: s.sectionBody },
          ...sec.blocks.map((b, j) => {
            if (b.type === 'numbered') return e(View as any, { key: j, style: s.listRow },
              e(Text as any, { style: [s.listBullet, { color: accent }] }, `${b.num}.`),
              e(Text as any, { style: s.listText }, b.text),
            );
            if (b.type === 'bullet') return e(View as any, { key: j, style: s.listRow },
              e(Text as any, { style: [s.listBullet, { color: accent }] }, '•'),
              e(Text as any, { style: s.listText }, b.text),
            );
            return e(Text as any, { key: j, style: s.para }, b.text);
          }),
        ),
      )
    );
  }

  // CTA block
  bodyChildren.push(
    e(View as any, { style: s.ctaSection },
      e(Text as any, { style: s.ctaTitle }, 'Ready to Accelerate Your AI Journey?'),
      e(Text as any, { style: s.ctaBody },
        "Your report outlines the priorities — but knowing what to do and knowing how to do it are two different things. Book a complimentary AI Strategy Briefing with a fractional Chief AI Officer from ChiefAIOfficer.com and get a clear, actionable path forward."
      ),
      e(Link as any, { src: BOOKING_URL },
        e(View as any, { style: s.ctaBtn },
          e(Text as any, { style: s.ctaBtnText }, 'Book Your Free AI Strategy Briefing  →'),
        )
      ),
    )
  );

  // ── Assemble document ────────────────────────────────────────────────────────
  return e(Document as any, { title: `AI Readiness Report — ${name}`, author: 'ChiefAIOfficer.com' },
    e(Page as any, { size: 'A4', style: s.page },

      // Header
      e(View as any, { style: s.headerBg },
        logoSrc
          ? e(Image as any, { src: logoSrc, style: s.headerLogo })
          : e(View as any, {},
              e(Text as any, { style: s.headerBrand   }, 'ChiefAIOfficer.com'),
              e(Text as any, { style: s.headerPartner }, 'In partnership with Scaling Up'),
            ),
        e(View as any, { style: s.headerRule }),
        e(Text as any, { style: s.headerTitle }, 'AI Readiness Assessment Report'),
        e(Text as any, { style: s.headerMeta  }, headerMetaText),
      ),

      // Body
      e(View as any, { style: s.body }, ...bodyChildren),

      // Footer — fixed on every page
      e(View as any, { style: s.footer, fixed: true },
        e(Text as any, { style: s.footerText }, 'ChiefAIOfficer.com  ·  In partnership with Scaling Up  ·  Confidential'),
        e(Text as any, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}` }),
      ),
    ),
  );
}

// ─── MailerLite helper ────────────────────────────────────────────────────────
async function addToMailerLite(
  email: string, name: string, pdfUrl: string,
  extras: { company?: string; role?: string; industry?: string; companySize?: string }
) {
  const ML_URL = 'https://connect.mailerlite.com/api/subscribers';
  const headers = {
    'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const fields: Record<string, string> = { name, pdf_url: pdfUrl };
  if (extras.company)     fields.company      = extras.company;
  if (extras.role)        fields.role         = extras.role;
  if (extras.industry)    fields.industry     = extras.industry;
  if (extras.companySize) fields.company_size = extras.companySize;

  const res = await fetch(ML_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ email, fields, groups: [MAILERLITE_GROUP_ID], status: 'active' }),
  });

  if (res.ok) { console.log('MailerLite: subscriber created ✓'); return; }

  const errText = await res.text();
  console.error(`MailerLite error (${res.status}):`, errText);

  if (res.status === 422) {
    console.log('MailerLite: retrying with minimal fields…');
    const res2 = await fetch(ML_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, fields: { name }, groups: [MAILERLITE_GROUP_ID], status: 'active' }),
    });
    if (res2.ok) {
      console.log('MailerLite: subscriber created (minimal). Check custom field names in MailerLite → Subscribers → Fields.');
    } else {
      console.error('MailerLite retry failed:', res2.status, await res2.text());
    }
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    name, email, score, maxScore, fullReport,
    company, role, industry, companySize,
  } = req.body as {
    name: string; email: string; score: number; maxScore: number; fullReport: string;
    company?: string; role?: string; industry?: string; companySize?: string;
  };

  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const pct       = Math.round((score / maxScore) * 100);
  const tier      = pct > 75 ? 'Leader' : pct > 40 ? 'Adopter' : 'Explorer';
  const tierColor = tier === 'Leader' ? '#16a34a' : tier === 'Adopter' ? '#2563eb' : '#d97706';
  const date      = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const sections  = parseReport(fullReport || '');
  const logoSrc   = getLogoSrc();

  // 1. Generate PDF → Vercel Blob
  let pdfUrl = '';
  try {
    const buffer = await renderToBuffer(
      buildPdf({ name, score, maxScore, tier, tierColor, date, sections, company, role, industry, companySize, logoSrc }) as any
    );
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { url } = await put(`reports/${Date.now()}-${slug}.pdf`, buffer, {
      access: 'public', contentType: 'application/pdf',
    });
    pdfUrl = url;
    console.log('PDF generated:', pdfUrl);
  } catch (err) {
    console.error('PDF/Blob error:', err);
  }

  // 2. MailerLite + GHL in parallel
  await Promise.allSettled([
    addToMailerLite(email, name, pdfUrl, { company, role, industry, companySize }),
    fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email, company, role, industry, companySize,
        customFields: { aiReadinessScore: score, maxScore, scorePercentage: pct, tier, assessmentDate: date, pdfUrl },
        tags: ['AI Assessment Completed', `AI Tier: ${tier}`],
      }),
    }).catch(err => console.error('GHL error:', err)),
  ]);

  return res.status(200).json({ success: true, pdfUrl });
}
