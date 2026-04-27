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
const INDIGO  = '#4f46e5';
const NAVY    = '#1e1b4b';
const TEXT    = '#374151';
const MUTED   = '#6b7280';
const SOFT    = '#f8fafc';
const GREEN   = '#16a34a';
const AMBER   = '#b45309';
const BLUE    = '#1d4ed8';

function sectionAccent(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('strength') || t.includes('win') || t.includes('success')) return GREEN;
  if (t.includes('improv') || t.includes('gap') || t.includes('risk') || t.includes('challenge') || t.includes('weakness')) return AMBER;
  if (t.includes('recommend') || t.includes('action') || t.includes('next') || t.includes('priorit') || t.includes('step')) return BLUE;
  return INDIGO;
}

function getLogoSrc(): string {
  try {
    const p = path.join(process.cwd(), 'public', 'logo.png');
    if (fs.existsSync(p)) return `data:image/png;base64,${fs.readFileSync(p).toString('base64')}`;
  } catch { /* fall through */ }
  return 'https://assessment.chiefaiofficer.com/logo.png';
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // ── Cover page ──────────────────────────────────────────────────────────────
  coverPage:       { backgroundColor: NAVY, paddingTop: 56, paddingBottom: 40, paddingHorizontal: 60 },
  coverLogo:       { width: 200, marginBottom: 36 },
  coverBrand:      { color: '#ffffff', fontSize: 22, fontFamily: 'Helvetica-Bold' },
  coverPartner:    { color: '#a5b4fc', fontSize: 9.5, marginTop: 4, marginBottom: 36 },
  coverRule:       { borderBottom: '1 solid #3730a3', marginBottom: 36 },
  coverTitle:      { color: '#ffffff', fontSize: 30, fontFamily: 'Helvetica-Bold', lineHeight: 1.2, marginBottom: 12 },
  coverPrepared:   { color: '#e0e7ff', fontSize: 12, marginBottom: 4 },
  coverSubMeta:    { color: '#a5b4fc', fontSize: 10, marginBottom: 4 },
  coverDate:       { color: '#6366f1', fontSize: 9.5, marginBottom: 40 },
  coverScoreBox:   { backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 10, padding: '26 32', marginBottom: 40 },
  coverScoreRow:   { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 22 },
  coverScoreNum:   { fontSize: 64, fontFamily: 'Helvetica-Bold', color: '#ffffff', lineHeight: 1 },
  coverScoreSlash: { fontSize: 28, color: '#6366f1', marginBottom: 10, marginLeft: 4 },
  coverScoreMeta:  { marginLeft: 28, paddingBottom: 6, flex: 1 },
  coverScoreLabel: { fontSize: 7.5, color: '#a5b4fc', textTransform: 'uppercase', letterSpacing: 0.8 },
  coverScorePct:   { fontSize: 32, fontFamily: 'Helvetica-Bold', color: '#ffffff', marginTop: 4, marginBottom: 8 },
  coverTierPill:   { borderRadius: 20, paddingTop: 5, paddingBottom: 5, paddingLeft: 14, paddingRight: 14, alignSelf: 'flex-start' },
  coverTierText:   { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  coverBarTrack:   { height: 6, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 3 },
  coverBarFill:    { height: 6, borderRadius: 3 },
  coverBarTickRow: { position: 'relative', height: 5, marginTop: 0 },
  coverBarTick:    { position: 'absolute', width: 1, height: 5, backgroundColor: 'rgba(255,255,255,0.35)' },
  coverBarLabelRow:{ position: 'relative', height: 22, marginTop: 4 },
  coverBarPct:     { fontSize: 6.5, color: '#a5b4fc', fontFamily: 'Helvetica-Bold' },
  coverBarTierLbl: { fontSize: 7.5, color: '#e0e7ff', marginTop: 1 },
  coverFooterRow:  { flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #312e81', paddingTop: 14 },
  coverFooterText: { color: '#4338ca', fontSize: 8.5 },

  // ── Report page ─────────────────────────────────────────────────────────────
  reportPage:      { backgroundColor: '#ffffff', paddingBottom: 56 },
  miniHeader:      { backgroundColor: NAVY, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniHeaderLogo:  { width: 100 },
  miniHeaderBrand: { color: '#ffffff', fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  miniHeaderRight: { color: '#6366f1', fontSize: 8 },

  body:            { paddingHorizontal: 50, paddingTop: 22 },

  // Compact meta strip
  metaStrip:       { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metaChip:        { flex: 1, backgroundColor: SOFT, padding: '10 14', borderRadius: 5 },
  metaChipLabel:   { color: MUTED, fontSize: 6.5, textTransform: 'uppercase' },
  metaChipValue:   { color: NAVY, fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 3 },

  // Second meta row for context fields
  metaStrip2:      { flexDirection: 'row', gap: 10, marginBottom: 20 },
  metaChipSm:      { flex: 1, backgroundColor: '#f1f5ff', padding: '8 12', borderRadius: 5 },
  metaChipSmLabel: { color: MUTED, fontSize: 6, textTransform: 'uppercase' },
  metaChipSmValue: { color: '#374151', fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 2 },

  // Score card
  scoreCard:       { backgroundColor: SOFT, borderRadius: 8, padding: '18 22', marginBottom: 24, borderLeft: 4, borderLeftColor: INDIGO },
  scoreRow:        { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 14 },
  scoreNum:        { fontSize: 50, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1 },
  scoreSlash:      { fontSize: 22, color: MUTED, marginBottom: 8, marginLeft: 3, marginRight: 2 },
  scoreMaxNum:     { fontSize: 22, color: MUTED, marginBottom: 8 },
  scoreMeta:       { marginLeft: 20, paddingBottom: 2, flex: 1 },
  scoreMetaLabel:  { fontSize: 7, color: MUTED, textTransform: 'uppercase' },
  scorePct:        { fontSize: 26, color: INDIGO, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  scoreTierLabel:  { fontSize: 9, color: MUTED, marginTop: 4 },
  barTrack:        { height: 7, backgroundColor: '#e5e7eb', borderRadius: 4 },
  barFill:         { height: 7, borderRadius: 4 },
  barTickRow:      { position: 'relative', height: 5, marginTop: 0 },
  barTick:         { position: 'absolute', width: 1, height: 5, backgroundColor: '#9ca3af' },
  barLabelRow:     { position: 'relative', height: 22, marginTop: 4 },
  barPct:          { fontSize: 6.5, color: MUTED, fontFamily: 'Helvetica-Bold' },
  barTierLbl:      { fontSize: 7.5, color: NAVY, marginTop: 1 },

  // Sections — McKinsey style (numbered, left accent, no card box)
  section:         { marginBottom: 22 },
  sectionNum:      { fontSize: 7.5, color: MUTED, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, paddingBottom: 8, borderBottom: '1 solid #e5e7eb' },
  sectionTitleBar: { width: 4, borderRadius: 2, marginRight: 10, alignSelf: 'stretch', minHeight: 20 },
  sectionTitleText:{ fontSize: 13, fontFamily: 'Helvetica-Bold', color: NAVY },
  sectionContent:  { paddingLeft: 14 },
  para:            { fontSize: 10, color: TEXT, lineHeight: 1.7, marginBottom: 6 },
  listRow:         { flexDirection: 'row', marginBottom: 7 },
  listBullet:      { fontSize: 10, fontFamily: 'Helvetica-Bold', marginRight: 10, minWidth: 18 },
  listText:        { fontSize: 10, color: TEXT, lineHeight: 1.6, flex: 1 },

  // CTA block
  ctaSection:      { marginTop: 20, backgroundColor: NAVY, borderRadius: 8, padding: '22 26' },
  ctaTitle:        { color: '#e0e7ff', fontSize: 13, fontFamily: 'Helvetica-Bold', marginBottom: 8 },
  ctaBody:         { color: '#a5b4fc', fontSize: 9.5, lineHeight: 1.65, marginBottom: 18 },
  ctaBtn:          { backgroundColor: INDIGO, borderRadius: 5, paddingTop: 10, paddingBottom: 10, paddingLeft: 20, paddingRight: 20, alignSelf: 'flex-start' },
  ctaBtnText:      { color: '#ffffff', fontSize: 10, fontFamily: 'Helvetica-Bold' },

  // Footer
  footer:          { position: 'absolute', bottom: 18, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTop: '1 solid #e5e7eb', paddingTop: 8 },
  footerText:      { fontSize: 7.5, color: MUTED },
});

// ─── Markdown parser ─────────────────────────────────────────────────────────
type Block = { type: 'paragraph' | 'numbered' | 'bullet'; text: string; num?: string };

function clean(text: string) {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // [text](url) → text
    .replace(/\*\*(.*?)\*\*/g, '$1')            // **bold** → bold
    .replace(/\*(.*?)\*/g, '$1')                // *italic* → italic
    .trim();
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
  return md.split(/(?=### )/).filter(c => c.trim()).map(c => {
    const lines = c.split('\n');
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

  const logoEl = (w: number) =>
    logoSrc
      ? e(Image as any, { src: logoSrc, style: { width: w } })
      : e(Text as any, { style: { ...s.miniHeaderBrand, fontSize: w < 120 ? 9 : 14 } }, 'ChiefAIOfficer.com');

  // ── Context meta chips (row 2) ────────────────────────────────────────────
  const ctxFields = [
    company     && { label: 'Company',      value: company },
    role        && { label: 'Role',         value: role },
    industry    && { label: 'Industry',     value: industry },
    companySize && { label: 'Company Size', value: companySize },
  ].filter(Boolean) as { label: string; value: string }[];

  const ctxRowEl = ctxFields.length > 0
    ? e(View as any, { style: s.metaStrip2 },
        ...ctxFields.map(({ label, value }) =>
          e(View as any, { style: s.metaChipSm },
            e(Text as any, { style: s.metaChipSmLabel }, label),
            e(Text as any, { style: s.metaChipSmValue }, value),
          )
        )
      )
    : null;

  // ── Section renderer ──────────────────────────────────────────────────────
  const sectionEls = sections.map((sec, i) => {
    const accent = sectionAccent(sec.title);
    const num    = String(i + 1).padStart(2, '0');

    const blockEls = sec.blocks
      .filter(b => b.text && b.text.trim())
      .map((b, j) => {
        if (b.type === 'numbered') return e(View as any, { key: j, style: s.listRow, wrap: false },
          e(Text as any, { style: [s.listBullet, { color: accent }] }, `${b.num}.`),
          e(Text as any, { style: s.listText }, b.text),
        );
        if (b.type === 'bullet') return e(View as any, { key: j, style: s.listRow, wrap: false },
          e(Text as any, { style: [s.listBullet, { color: accent }] }, '•'),
          e(Text as any, { style: s.listText }, b.text),
        );
        return e(Text as any, { key: j, style: s.para }, b.text);
      });

    return e(View as any, { key: i, style: s.section },
      // Section header — kept together so the title never orphans at the bottom of a page
      e(View as any, { wrap: false },
        e(Text as any, { style: s.sectionNum }, `${num}  /  ${sec.title.toUpperCase()}`),
        e(View as any, { style: s.sectionTitleRow },
          e(View as any, { style: [s.sectionTitleBar, { backgroundColor: accent }] }),
          e(Text as any, { style: s.sectionTitleText }, sec.title),
        ),
      ),
      e(View as any, { style: s.sectionContent }, ...blockEls),
    );
  });

  // ── CTA block ─────────────────────────────────────────────────────────────
  const ctaEl = e(View as any, { style: s.ctaSection },
    e(Text as any, { style: s.ctaTitle }, 'Ready to Accelerate Your AI Journey?'),
    e(Text as any, { style: s.ctaBody },
      "Your report outlines the priorities — but knowing what to do and knowing how to do it are two different things. Book a complimentary AI Strategy Briefing with a fractional Chief AI Officer from ChiefAIOfficer.com and get a clear, actionable path forward for your organisation."
    ),
    e(Link as any, { src: BOOKING_URL, style: { textDecoration: 'none' } },
      e(View as any, { style: s.ctaBtn },
        e(Text as any, { style: s.ctaBtnText }, 'Book Your Free AI Strategy Briefing'),
      )
    ),
  );

  // ── Cover page content header text ───────────────────────────────────────
  const subMeta = [role, industry, companySize].filter(Boolean).join('  ·  ');

  return e(Document as any, { title: `AI Readiness Report — ${name}`, author: 'ChiefAIOfficer.com' },

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 1 — COVER
    // ════════════════════════════════════════════════════════════════════════
    e(Page as any, { size: 'A4', style: s.coverPage },
      // Brand / logo
      logoSrc
        ? e(Image as any, { src: logoSrc, style: s.coverLogo })
        : e(View as any, {},
            e(Text as any, { style: s.coverBrand }, 'ChiefAIOfficer.com'),
            e(Text as any, { style: s.coverPartner }, 'In partnership with Scaling Up'),
          ),

      e(View as any, { style: s.coverRule }),

      // Title block
      e(Text as any, { style: s.coverTitle }, 'AI Readiness\nAssessment Report'),
      e(Text as any, { style: s.coverPrepared }, `Prepared exclusively for ${name}${company ? ` at ${company}` : ''}`),
      subMeta ? e(Text as any, { style: s.coverSubMeta }, subMeta) : null,
      e(Text as any, { style: s.coverDate }, date),

      // Score box
      e(View as any, { style: s.coverScoreBox },
        e(View as any, { style: s.coverScoreRow },
          e(Text as any, { style: s.coverScoreNum }, String(score)),
          e(Text as any, { style: s.coverScoreSlash }, `/${maxScore}`),
          e(View as any, { style: s.coverScoreMeta },
            e(Text as any, { style: s.coverScoreLabel }, 'Overall Score'),
            e(Text as any, { style: s.coverScorePct }, `${pct}%`),
            e(View as any, { style: [s.coverTierPill, { backgroundColor: tierColor }] },
              e(Text as any, { style: s.coverTierText }, tier),
            ),
          ),
        ),
        // Bar
        e(View as any, { style: s.coverBarTrack },
          e(View as any, { style: [s.coverBarFill, { width: `${pct}%`, backgroundColor: tierColor }] }),
        ),
        // Tick marks at 0%, 40%, 75%, 100%
        e(View as any, { style: s.coverBarTickRow },
          e(View as any, { style: [s.coverBarTick, { left: 0 }] }),
          e(View as any, { style: [s.coverBarTick, { left: '40%' }] }),
          e(View as any, { style: [s.coverBarTick, { left: '75%' }] }),
          e(View as any, { style: [s.coverBarTick, { right: 0 }] }),
        ),
        // Labels anchored to ticks (each tier label sits at the start of its range)
        e(View as any, { style: s.coverBarLabelRow },
          e(View as any, { style: { position: 'absolute', left: 0 } },
            e(Text as any, { style: s.coverBarPct }, '0%'),
            e(Text as any, { style: s.coverBarTierLbl }, 'Explorer'),
          ),
          e(View as any, { style: { position: 'absolute', left: '40%' } },
            e(Text as any, { style: s.coverBarPct }, '40%'),
            e(Text as any, { style: s.coverBarTierLbl }, 'Adopter'),
          ),
          e(View as any, { style: { position: 'absolute', left: '75%' } },
            e(Text as any, { style: s.coverBarPct }, '75%'),
            e(Text as any, { style: s.coverBarTierLbl }, 'Leader'),
          ),
          e(View as any, { style: { position: 'absolute', right: 0 } },
            e(Text as any, { style: [s.coverBarPct, { textAlign: 'right' }] }, '100%'),
          ),
        ),
      ),

      // Cover footer
      e(View as any, { style: s.coverFooterRow },
        e(Text as any, { style: s.coverFooterText }, 'Confidential & Proprietary'),
        e(Text as any, { style: s.coverFooterText }, 'assessment.chiefaiofficer.com'),
      ),
    ),

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 2+ — REPORT CONTENT
    // ════════════════════════════════════════════════════════════════════════
    e(Page as any, { size: 'A4', style: s.reportPage },

      // Fixed mini-header on every report page
      e(View as any, { style: s.miniHeader, fixed: true },
        logoEl(90),
        e(Text as any, { style: s.miniHeaderRight }, 'AI Readiness Assessment  ·  Confidential'),
      ),

      // Body
      e(View as any, { style: s.body },

        // Meta strip — name | date | tier
        e(View as any, { style: s.metaStrip },
          e(View as any, { style: s.metaChip },
            e(Text as any, { style: s.metaChipLabel }, 'Prepared For'),
            e(Text as any, { style: s.metaChipValue }, name),
          ),
          e(View as any, { style: s.metaChip },
            e(Text as any, { style: s.metaChipLabel }, 'Date'),
            e(Text as any, { style: s.metaChipValue }, date),
          ),
          e(View as any, { style: [s.metaChip, { backgroundColor: tierColor }] },
            e(Text as any, { style: [s.metaChipLabel, { color: 'rgba(255,255,255,0.8)' }] }, 'AI Readiness Tier'),
            e(Text as any, { style: [s.metaChipValue, { color: '#ffffff' }] }, tier),
          ),
        ),

        // Context strip (company / role / industry / size)
        ...(ctxRowEl ? [ctxRowEl] : []),

        // Score card
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
          // Tick marks
          e(View as any, { style: s.barTickRow },
            e(View as any, { style: [s.barTick, { left: 0 }] }),
            e(View as any, { style: [s.barTick, { left: '40%' }] }),
            e(View as any, { style: [s.barTick, { left: '75%' }] }),
            e(View as any, { style: [s.barTick, { right: 0 }] }),
          ),
          // Labels anchored to ticks
          e(View as any, { style: s.barLabelRow },
            e(View as any, { style: { position: 'absolute', left: 0 } },
              e(Text as any, { style: s.barPct }, '0%'),
              e(Text as any, { style: s.barTierLbl }, 'Explorer'),
            ),
            e(View as any, { style: { position: 'absolute', left: '40%' } },
              e(Text as any, { style: s.barPct }, '40%'),
              e(Text as any, { style: s.barTierLbl }, 'Adopter'),
            ),
            e(View as any, { style: { position: 'absolute', left: '75%' } },
              e(Text as any, { style: s.barPct }, '75%'),
              e(Text as any, { style: s.barTierLbl }, 'Leader'),
            ),
            e(View as any, { style: { position: 'absolute', right: 0 } },
              e(Text as any, { style: [s.barPct, { textAlign: 'right' }] }, '100%'),
            ),
          ),
        ),

        // Report sections
        ...sectionEls,

        // CTA
        ctaEl,
      ),

      // Fixed footer on every report page
      e(View as any, { style: s.footer, fixed: true },
        e(Text as any, { style: s.footerText }, 'ChiefAIOfficer.com  ·  In partnership with Scaling Up  ·  Confidential'),
        e(Text as any, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber - 1} of ${totalPages - 1}` }),
      ),
    ),
  );
}

// ─── MailerLite helper ────────────────────────────────────────────────────────
async function addToMailerLite(
  email: string, name: string, pdfUrl: string,
  extras: { company?: string; role?: string; industry?: string; companySize?: string }
) {
  const apiKey = process.env.MAILERLITE_API_KEY;
  console.log('[ML] starting; key present:', !!apiKey, 'key length:', (apiKey || '').length, 'group:', MAILERLITE_GROUP_ID);

  if (!apiKey) {
    console.error('[ML] ABORT — MAILERLITE_API_KEY env var is missing in Vercel.');
    return;
  }

  const ML_URL = 'https://connect.mailerlite.com/api/subscribers';
  const headers = {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const fields: Record<string, string> = { name };
  if (pdfUrl)             fields.pdf_url      = pdfUrl;
  if (extras.company)     fields.company      = extras.company;
  if (extras.role)        fields.role         = extras.role;
  if (extras.industry)    fields.industry     = extras.industry;
  if (extras.companySize) fields.company_size = extras.companySize;

  const payload = { email, fields, groups: [MAILERLITE_GROUP_ID], status: 'active' };
  console.log('[ML] POST', ML_URL, 'payload:', JSON.stringify(payload));

  let res: Response;
  try {
    res = await fetch(ML_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
  } catch (err) {
    console.error('[ML] fetch threw:', err);
    return;
  }

  const bodyText = await res.text();
  console.log(`[ML] response ${res.status} ${res.statusText}:`, bodyText.slice(0, 500));

  if (res.ok) {
    console.log('[ML] ✓ subscriber created with all fields');
    return;
  }

  // 422 = validation error (likely a custom field doesn't exist). Retry minimal.
  if (res.status === 422) {
    console.log('[ML] 422 — retrying with name-only fields');
    const minimal = { email, fields: { name }, groups: [MAILERLITE_GROUP_ID], status: 'active' };
    const res2 = await fetch(ML_URL, { method: 'POST', headers, body: JSON.stringify(minimal) });
    const body2 = await res2.text();
    console.log(`[ML] retry response ${res2.status}:`, body2.slice(0, 500));
    if (res2.ok) {
      console.log('[ML] ✓ subscriber created (minimal fields). Some custom fields missing — check MailerLite admin.');
      return;
    }
  }

  // 401/403 = auth issue. Surface clearly.
  if (res.status === 401 || res.status === 403) {
    console.error('[ML] AUTH FAILED. Verify MAILERLITE_API_KEY is a valid token from https://dashboard.mailerlite.com/integrations/api');
  }

  // Any other failure: try without the groups array — at least create the subscriber so we know the key works
  console.log('[ML] last-ditch retry without groups');
  const noGroups = { email, fields: { name }, status: 'active' };
  const res3 = await fetch(ML_URL, { method: 'POST', headers, body: JSON.stringify(noGroups) });
  const body3 = await res3.text();
  console.log(`[ML] no-groups response ${res3.status}:`, body3.slice(0, 500));
  if (res3.ok) {
    console.error('[ML] subscriber created WITHOUT group — group ID', MAILERLITE_GROUP_ID, 'is likely wrong or inaccessible to this key.');
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, score, maxScore, fullReport, company, role, industry, companySize } = req.body as {
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
