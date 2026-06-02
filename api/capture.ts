import React from 'react';
import fs from 'fs';
import path from 'path';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Document, Page, Text, View, StyleSheet, Image, Link, Svg, Defs, RadialGradient, Stop, Rect } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import { put } from '@vercel/blob';
import { Resend } from 'resend';

export const config = { maxDuration: 30 };

const MAILERLITE_GROUP_ID = '185917251382150276';
// Tier-specific groups. Each quiz-taker is added to their tier group on top of
// the master group above. The tier group is what the per-tier welcome
// automations trigger on ("when subscriber joins group"). Resolved (or created
// if missing) by name at runtime — see resolveGroupIdByName() — so no extra IDs
// need to be hard-coded. The names here MUST match the group names in MailerLite.
const MAILERLITE_TIER_GROUPS: Record<string, string> = {
  Explorer: 'AI Readiness - Explorer',
  Adopter:  'AI Readiness - Adopter',
  Leader:   'AI Readiness - Leader',
};
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
  coverPage:       { backgroundColor: NAVY },
  coverBgWrap:     { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coverContent:    { paddingTop: 56, paddingBottom: 40, paddingHorizontal: 60 },
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
  // paddingTop reserves space for the absolute mini-header so content NEVER
  // overlaps it on continuation pages. Mini-header height ≈ 60pt + breathing.
  reportPage:      { backgroundColor: '#ffffff', paddingTop: 78, paddingBottom: 56 },
  miniHeader:      { position: 'absolute', top: 0, left: 0, right: 0, backgroundColor: NAVY, paddingTop: 10, paddingBottom: 10, paddingHorizontal: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  miniHeaderLogo:  { width: 130 },
  miniHeaderBrand: { color: '#ffffff', fontSize: 9.5, fontFamily: 'Helvetica-Bold' },
  miniHeaderRight: { color: '#6366f1', fontSize: 8 },

  body:            { paddingHorizontal: 50 },

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

  // Soft radial-gradient background for the cover (purple/indigo glows).
  // Wrapped in a position:absolute View so the page-flow layout engine doesn't
  // treat the SVG's intrinsic 595×842 box as a flow block (which was pushing
  // the cover content onto a second page).
  const coverBg = e(View as any, { style: s.coverBgWrap },
    e(Svg as any, { width: 595, height: 842, viewBox: '0 0 595 842' },
      e(Defs as any, null,
        e(RadialGradient as any, { id: 'glowTR', cx: '85%', cy: '12%', r: '55%' },
          e(Stop as any, { offset: '0%',   stopColor: '#6366f1', stopOpacity: 0.55 }),
          e(Stop as any, { offset: '60%',  stopColor: '#4338ca', stopOpacity: 0.12 }),
          e(Stop as any, { offset: '100%', stopColor: '#1e1b4b', stopOpacity: 0 }),
        ),
        e(RadialGradient as any, { id: 'glowBL', cx: '12%', cy: '92%', r: '58%' },
          e(Stop as any, { offset: '0%',   stopColor: '#4338ca', stopOpacity: 0.45 }),
          e(Stop as any, { offset: '100%', stopColor: '#1e1b4b', stopOpacity: 0 }),
        ),
        e(RadialGradient as any, { id: 'glowMid', cx: '50%', cy: '50%', r: '70%' },
          e(Stop as any, { offset: '0%',   stopColor: '#312e81', stopOpacity: 0.25 }),
          e(Stop as any, { offset: '100%', stopColor: '#1e1b4b', stopOpacity: 0 }),
        ),
      ),
      e(Rect as any, { x: 0, y: 0, width: 595, height: 842, fill: 'url(#glowMid)' }),
      e(Rect as any, { x: 0, y: 0, width: 595, height: 842, fill: 'url(#glowTR)' }),
      e(Rect as any, { x: 0, y: 0, width: 595, height: 842, fill: 'url(#glowBL)' }),
    ),
  );

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
      // Layered radial gradients behind everything
      coverBg,

      // Cover content — inside its own padded View so the gradient can extend
      // edge-to-edge of the page
      e(View as any, { style: s.coverContent },
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
      ), // /coverContent
    ),

    // ════════════════════════════════════════════════════════════════════════
    // PAGE 2+ — REPORT CONTENT
    // ════════════════════════════════════════════════════════════════════════
    e(Page as any, { size: 'A4', style: s.reportPage },

      // Fixed mini-header on every report page (absolute-positioned so it
      // doesn't overlap content; reportPage.paddingTop reserves the space)
      e(View as any, { style: s.miniHeader, fixed: true },
        logoEl(130),
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

// ─── MailerLite group helpers ──────────────────────────────────────────────────
type MlHeaders = Record<string, string>;

// Assign an existing subscriber to a group (idempotent — re-assigning is a no-op).
async function assignToGroup(subscriberId: string, groupId: string, headers: MlHeaders) {
  const url = `https://connect.mailerlite.com/api/subscribers/${subscriberId}/groups/${groupId}`;
  try {
    const res = await fetch(url, { method: 'POST', headers });
    const body = await res.text();
    if (res.ok) {
      console.log(`[ML] ✓ subscriber ${subscriberId} assigned to group ${groupId}`);
    } else {
      console.error(`[ML] assign group ${groupId} → ${res.status}:`, body.slice(0, 300));
    }
  } catch (err) {
    console.error(`[ML] assign group ${groupId} threw:`, err);
  }
}

// Resolve a group's ID by its name, creating the group if it doesn't exist yet.
// Lets us key off human-readable tier names instead of hard-coding more IDs.
async function resolveGroupIdByName(name: string, headers: MlHeaders): Promise<string | undefined> {
  // 1. Look for an existing group with this exact name.
  try {
    const res = await fetch('https://connect.mailerlite.com/api/groups?limit=100', { headers });
    const body = await res.text();
    if (res.ok) {
      const groups: any[] = JSON.parse(body)?.data || [];
      const match = groups.find(g => g?.name === name);
      if (match?.id) {
        console.log(`[ML] group "${name}" found: ${match.id}`);
        return String(match.id);
      }
    } else {
      console.error(`[ML] group list → ${res.status}:`, body.slice(0, 300));
    }
  } catch (err) {
    console.error('[ML] group list threw:', err);
  }
  // 2. Not found — create it.
  try {
    const res = await fetch('https://connect.mailerlite.com/api/groups', {
      method: 'POST', headers, body: JSON.stringify({ name }),
    });
    const body = await res.text();
    if (res.ok) {
      const id = JSON.parse(body)?.data?.id;
      console.log(`[ML] group "${name}" created: ${id}`);
      return id ? String(id) : undefined;
    }
    console.error(`[ML] group create "${name}" → ${res.status}:`, body.slice(0, 300));
  } catch (err) {
    console.error(`[ML] group create "${name}" threw:`, err);
  }
  return undefined;
}

// ─── MailerLite helper ────────────────────────────────────────────────────────
// Two-step approach:
//   1. POST /api/subscribers      → create or upsert the subscriber (+ fields)
//   2. POST /api/subscribers/{id}/groups/{groupId} → EXPLICITLY assign to group(s)
// Step 2 is necessary because the `groups` array in step 1 is unreliable for
// existing subscribers (MailerLite quirk — only honoured on first creation).
// We assign to the master group AND the tier-specific group; the tier group is
// what each per-tier welcome automation triggers on.
async function addToMailerLite(
  email: string, name: string, pdfUrl: string,
  extras: { company?: string; role?: string; industry?: string; companySize?: string; tier?: string }
) {
  const apiKey = process.env.MAILERLITE_API_KEY;
  console.log('[ML] starting; key present:', !!apiKey, 'key length:', (apiKey || '').length, 'group:', MAILERLITE_GROUP_ID);

  if (!apiKey) {
    console.error('[ML] ABORT — MAILERLITE_API_KEY env var is missing in Vercel.');
    return;
  }

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

  // ── Step 1: Create or update the subscriber ─────────────────────────────
  const SUB_URL = 'https://connect.mailerlite.com/api/subscribers';
  const payload = { email, fields, groups: [MAILERLITE_GROUP_ID], status: 'active' };
  console.log('[ML] POST', SUB_URL, 'payload:', JSON.stringify(payload));

  let subscriberId: string | undefined;
  try {
    const res = await fetch(SUB_URL, { method: 'POST', headers, body: JSON.stringify(payload) });
    const bodyText = await res.text();
    console.log(`[ML] POST /subscribers → ${res.status}:`, bodyText.slice(0, 1500));

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        console.error('[ML] AUTH FAILED. Regenerate key at https://dashboard.mailerlite.com/integrations/api and update MAILERLITE_API_KEY in Vercel env vars.');
        return;
      }
      // 422 = a custom field doesn't exist in the MailerLite account. Retry with name only.
      if (res.status === 422) {
        console.log('[ML] 422 — retrying with name-only fields (custom field missing)');
        const minimal = { email, fields: { name }, groups: [MAILERLITE_GROUP_ID], status: 'active' };
        const res2 = await fetch(SUB_URL, { method: 'POST', headers, body: JSON.stringify(minimal) });
        const body2 = await res2.text();
        console.log(`[ML] retry response ${res2.status}:`, body2.slice(0, 800));
        if (!res2.ok) return;
        subscriberId = JSON.parse(body2)?.data?.id;
      } else {
        return;
      }
    } else {
      const parsed = JSON.parse(bodyText);
      subscriberId = parsed?.data?.id;
      const groupsInResp = (parsed?.data?.groups || []).map((g: any) =>
        typeof g === 'object' ? `${g.id}(${g.name})` : g
      );
      console.log(`[ML] parsed: subscriberId=${subscriberId}, groups in response=`, JSON.stringify(groupsInResp));
    }
  } catch (err) {
    console.error('[ML] subscribe call threw:', err);
    return;
  }

  if (!subscriberId) {
    console.error('[ML] no subscriber id returned — cannot explicitly assign group.');
    return;
  }

  // ── Step 2: EXPLICITLY assign the subscriber to the group(s) ───────────
  // This is the key fix — the upsert above silently ignores the groups[]
  // array when updating an existing subscriber. Without this call the
  // subscriber gets created/updated but never lands in the group.

  // 2a. Master group — catch-all list of every quiz lead.
  await assignToGroup(subscriberId, MAILERLITE_GROUP_ID, headers);

  // 2b. Tier group — drives the per-tier welcome automation. Resolved by name
  //     (created on first use) so we don't have to hard-code three more IDs.
  const tierGroupName = extras.tier ? MAILERLITE_TIER_GROUPS[extras.tier] : undefined;
  if (tierGroupName) {
    const tierGroupId = await resolveGroupIdByName(tierGroupName, headers);
    if (tierGroupId) {
      await assignToGroup(subscriberId, tierGroupId, headers);
    } else {
      console.error(`[ML] could not resolve/create tier group "${tierGroupName}" — subscriber not tiered.`);
    }
  } else if (extras.tier) {
    console.error(`[ML] unknown tier "${extras.tier}" — no matching group name.`);
  }
}

// ─── Resend (Scaling Up confirmation email) ─────────────────────────────────
// The /scaling-up edition bypasses MailerLite and sends a single branded
// confirmation email directly via Resend, with the score, tier, report link,
// and the AI Strategy Briefing CTA. Anna wants Dani/Kathryn to own follow-up
// from inside GHL — this email is just the immediate "here's your report"
// touch, not a nurture sequence.
async function sendScalingUpConfirmation(args: {
  to: string; name: string; score: number; maxScore: number;
  tier: string; pdfUrl: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.error('[Resend] RESEND_API_KEY not set — skipping confirmation email.');
    return;
  }
  const from = process.env.RESEND_FROM_EMAIL
    || 'ChiefAIOfficer.com <assessment@chiefaiofficer.com>';

  const pct = Math.round((args.score / args.maxScore) * 100);
  const firstName = (args.name.trim().split(/\s+/)[0]) || args.name;
  const tierColor =
    args.tier === 'Leader'  ? '#16a34a' :
    args.tier === 'Adopter' ? '#2563eb' : '#d97706';
  const tierBlurb =
    args.tier === 'Leader'
      ? "You're operating at the frontier of AI adoption. The focus now is on compounding your advantage — before competitors close the gap."
      : args.tier === 'Adopter'
      ? "You're making meaningful progress with AI, but there are critical gaps holding back real business impact. The right roadmap can close them quickly."
      : "You're at the starting line of your AI journey — which is actually an advantage. You can avoid the costly mistakes early adopters made and build AI the right way.";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Your AI Readiness Results Are In</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1f2937;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f3f4f6;">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);">
        <tr><td style="padding:22px 32px;background:#1e1b4b;text-align:center;">
          <div style="color:#a5b4fc;font-size:11px;letter-spacing:2px;font-weight:600;text-transform:uppercase;">ChiefAIOfficer.com &nbsp;·&nbsp; In partnership with Scaling Up</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 14px;font-size:22px;font-weight:700;color:#1e1b4b;line-height:1.3;">Your AI Readiness Report is ready</h1>
          <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">Hi ${escapeHtml(firstName)},</p>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">Thanks for taking the assessment. Here's exactly where you stand:</p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#eef2ff;border:1px solid #c7d2fe;border-radius:10px;margin:0 0 24px;">
            <tr><td style="padding:24px;text-align:center;">
              <div style="font-size:11px;color:#4f46e5;letter-spacing:1.5px;font-weight:700;text-transform:uppercase;margin-bottom:8px;">Your Score</div>
              <div style="font-size:42px;font-weight:800;color:#1e1b4b;line-height:1;margin-bottom:4px;">${args.score}<span style="font-size:20px;color:#6b7280;font-weight:500;">/${args.maxScore}</span></div>
              <div style="font-size:12px;color:#6b7280;margin:6px 0 12px;">${pct}% &nbsp;·&nbsp; AI Readiness</div>
              <div style="display:inline-block;background:${tierColor};color:#ffffff;padding:7px 18px;border-radius:999px;font-size:13px;font-weight:600;letter-spacing:0.5px;">${escapeHtml(args.tier)} tier</div>
            </td></tr>
          </table>

          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#374151;">${escapeHtml(tierBlurb)}</p>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr><td align="center" style="padding-bottom:6px;">
              <a href="${args.pdfUrl}" style="display:inline-block;padding:14px 30px;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;font-size:15px;">View Your Full Report (PDF)</a>
            </td></tr>
          </table>

          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:32px 0 0;">
            <tr><td style="border-top:1px solid #e5e7eb;padding-top:28px;">
              <h2 style="margin:0 0 12px;font-size:18px;font-weight:700;color:#1e1b4b;">Ready to act on it?</h2>
              <p style="margin:0 0 22px;font-size:15px;line-height:1.6;color:#374151;">Your report outlines the priorities. The fastest next step is a complimentary <b>AI Strategy Briefing</b> — a 30-minute call where we look at your specific business and show you what building a real AI system would look like.</p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td align="center">
                  <a href="${BOOKING_URL}" style="display:inline-block;padding:14px 30px;background:#1e1b4b;color:#ffffff;text-decoration:none;font-weight:600;border-radius:8px;font-size:15px;">Book Your AI Strategy Briefing</a>
                </td></tr>
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb;text-align:center;">
          <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.5;">ChiefAIOfficer.com &nbsp;·&nbsp; In partnership with Scaling Up<br>You received this because you completed the AI Readiness Assessment.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  const text = [
    `Hi ${firstName},`,
    ``,
    `Your AI Readiness Report is ready.`,
    ``,
    `Your score: ${args.score}/${args.maxScore} (${pct}%) — ${args.tier} tier`,
    ``,
    tierBlurb,
    ``,
    `View your full report:`,
    args.pdfUrl,
    ``,
    `------------------------------------------------------------`,
    ``,
    `Ready to act on it?`,
    ``,
    `Your report outlines the priorities. The fastest next step is a complimentary AI Strategy Briefing — a 30-minute call where we look at your specific business and show you what building a real AI system would look like.`,
    ``,
    `Book your AI Strategy Briefing:`,
    BOOKING_URL,
    ``,
    `—`,
    `ChiefAIOfficer.com · In partnership with Scaling Up`,
  ].join('\n');

  try {
    const resend = new Resend(apiKey);
    const { data, error } = await resend.emails.send({
      from, to: args.to,
      subject: 'Your AI Readiness Results Are In',
      html, text,
    });
    if (error) {
      console.error('[Resend] send error:', error);
    } else {
      console.log(`[Resend] ✓ confirmation sent to ${args.to} (id=${data?.id ?? '?'})`);
    }
  } catch (err) {
    console.error('[Resend] threw:', err);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ─── Attribution helpers ────────────────────────────────────────────────────
// Every quiz completion gets a STANDARD tag so motherboard's "AI Readiness
// Quiz" campaign can pull all of them with one rule. On top of that we
// derive source / campaign / email-number tags from UTMs so GHL workflows
// can branch with simple "Has Tag" conditions instead of fiddling with
// custom-field comparisons.
//
// Tag scheme:
//   - ai-readiness-quiz-completed  → motherboard sync key (always)
//   - AI Assessment Completed      → legacy display tag (always)
//   - AI Tier: {Explorer|Adopter|Leader} → tier badge (always)
//   - source-{utm_source}          → e.g. source-caio (or 'source-organic' if no utm_source)
//   - campaign-{utm_campaign}      → e.g. campaign-scalingup-collab (only if utm_campaign present)
//   - email-{N}                    → e.g. email-1 (parsed from utm_content="email-1-...")
const STANDARD_QUIZ_TAG = 'ai-readiness-quiz-completed';

interface Attribution {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  utmTerm?: string;
  referer?: string;
  capturedAt?: string;
}

/** Convert a string into a GHL-safe tag fragment: lowercase, kebab-case, alphanumeric. */
function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build the full tag list for a quiz completion given the tier + attribution.
 * Mutates nothing; returns a fresh array each call.
 */
function buildTagsFor(tier: string, attribution?: Attribution): string[] {
  const tags: string[] = [
    STANDARD_QUIZ_TAG,
    'AI Assessment Completed',
    `AI Tier: ${tier}`,
  ];

  // Source tag (always present — 'source-organic' for direct/untracked traffic)
  const src = attribution?.utmSource?.trim();
  tags.push(src ? `source-${slugify(src)}` : 'source-organic');

  // Campaign tag (only when utm_campaign provided)
  const camp = attribution?.utmCampaign?.trim();
  if (camp) tags.push(`campaign-${slugify(camp)}`);

  // Email-N tag — parse the leading "email-N" from utm_content if present.
  // Convention: utm_content="email-1-hidden-truth" → tag "email-1".
  const content = attribution?.utmContent?.trim();
  if (content) {
    const m = content.match(/^email-(\d+)/i);
    if (m) tags.push(`email-${m[1]}`);
  }

  return tags;
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const {
    name, email, score, maxScore, fullReport,
    company, role, industry, companySize,
    attribution,
    source,
  } = req.body as {
    name: string; email: string; score: number; maxScore: number; fullReport: string;
    company?: string; role?: string; industry?: string; companySize?: string;
    attribution?: Attribution;
    // 'scaling-up' → partner edition (different GHL webhook, no MailerLite,
    // Resend confirmation email). Anything else → default CAIO flow.
    source?: 'caio' | 'scaling-up';
  };
  const isScalingUp = source === 'scaling-up';

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
    // Branded filename. Vercel Blob derives the browser's save-as filename from
    // the pathname's final segment (it appends a random suffix to the URL only,
    // not to the Content-Disposition name), so we make the pathname itself the
    // pretty, branded name. addRandomSuffix stays on (default) for unique URLs.
    const titleName = name.trim().replace(/\s+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/\s+/g, '-').replace(/[^A-Za-z0-9-]/g, '');
    const isoDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const downloadName = `ChiefAIOfficer-AI-Readiness-Report-${titleName || 'Respondent'}-${isoDate}`;
    const { url } = await put(`reports/${downloadName}.pdf`, buffer, {
      access: 'public',
      contentType: 'application/pdf',
    });
    pdfUrl = url;
    console.log('PDF generated:', pdfUrl);
  } catch (err) {
    console.error('PDF/Blob error:', err);
  }

  // Build tags from tier + attribution (see buildTagsFor for the full scheme).
  // Add a human-readable "Edition" tag so GHL workflows can branch on which
  // version of the assessment the lead came from, independent of UTMs.
  const tags = buildTagsFor(tier, attribution);
  tags.push(`Edition: ${isScalingUp ? 'Scaling Up' : 'CAIO'}`);

  const utmFields: Record<string, string | undefined> = {};
  if (attribution?.utmSource)   utmFields.utm_source   = attribution.utmSource;
  if (attribution?.utmMedium)   utmFields.utm_medium   = attribution.utmMedium;
  if (attribution?.utmCampaign) utmFields.utm_campaign = attribution.utmCampaign;
  if (attribution?.utmContent)  utmFields.utm_content  = attribution.utmContent;
  if (attribution?.utmTerm)     utmFields.utm_term     = attribution.utmTerm;
  if (attribution?.referer)     utmFields.referer      = attribution.referer;

  // ── Pick the GHL webhook ────────────────────────────────────────────────
  // Scaling Up submissions route to a different webhook so Anna's team
  // (Dani / Kathryn) get the assignment in GHL. If the dedicated env var
  // isn't set yet, we fall back to the default webhook with a warning rather
  // than silently dropping the lead.
  let ghlUrl = GHL_WEBHOOK_URL;
  if (isScalingUp) {
    const suUrl = process.env.SCALING_UP_GHL_WEBHOOK_URL;
    if (suUrl) {
      ghlUrl = suUrl;
    } else {
      console.warn('[SU] SCALING_UP_GHL_WEBHOOK_URL not set — falling back to default GHL webhook.');
    }
  }

  // ── Build the fan-out ───────────────────────────────────────────────────
  const ghlBody = {
    name, email, company, role, industry, companySize,
    customFields: {
      aiReadinessScore: score, maxScore, scorePercentage: pct, tier,
      assessmentDate: date, pdfUrl,
      edition: isScalingUp ? 'scaling-up' : 'caio',
      ...utmFields,
    },
    tags,
    edition: isScalingUp ? 'scaling-up' : 'caio',
    // Pass attribution at the top level too — some GHL workflow setups
    // read from the body root rather than customFields.
    ...utmFields,
  };

  const ghlPost = fetch(ghlUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ghlBody),
  }).catch(err => console.error('GHL error:', err));

  // Scaling Up: skip MailerLite, send the branded confirmation via Resend.
  // Default: existing MailerLite tier-group flow (which fires its own welcome
  // sequence — no Resend send needed).
  const emailSide = isScalingUp
    ? sendScalingUpConfirmation({ to: email, name, score, maxScore, tier, pdfUrl })
    : addToMailerLite(email, name, pdfUrl, { company, role, industry, companySize, tier });

  await Promise.allSettled([ghlPost, emailSide]);

  return res.status(200).json({ success: true, pdfUrl });
}
