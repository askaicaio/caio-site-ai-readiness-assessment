import React from 'react';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import { put } from '@vercel/blob';

export const config = { maxDuration: 30 };

const MAILERLITE_GROUP_ID = '185917251382150276';
const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/FgaFLGYrbGZSBVprTkhR/webhook-trigger/elWtYyahvdVemgjf2SBn';

// ─── Colours ────────────────────────────────────────────────────────────────
const INDIGO = '#4f46e5';
const NAVY   = '#1e1b4b';
const TEXT   = '#374151';
const MUTED  = '#6b7280';
const SOFT   = '#f8fafc';

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:           { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: '#ffffff', paddingBottom: 72 },

  headerBg:       { backgroundColor: NAVY, paddingTop: 34, paddingBottom: 28, paddingHorizontal: 50 },
  headerBrand:    { color: '#ffffff', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  headerPartner:  { color: '#a5b4fc', fontSize: 8.5, marginTop: 3 },
  headerRule:     { borderBottom: '1 solid #312e81', marginTop: 16, marginBottom: 16 },
  headerTitle:    { color: '#e0e7ff', fontSize: 15, fontFamily: 'Helvetica-Bold' },
  headerMeta:     { color: '#a5b4fc', fontSize: 9, marginTop: 5 },

  body:           { paddingHorizontal: 50, paddingTop: 26 },

  metaRow:        { flexDirection: 'row', gap: 10, marginBottom: 22 },
  metaCard:       { flex: 1, backgroundColor: SOFT, padding: '14 16', borderRadius: 6 },
  metaLabel:      { color: MUTED, fontSize: 7, textTransform: 'uppercase' },
  metaValue:      { color: NAVY, fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 4 },

  scoreCard:      { backgroundColor: SOFT, borderRadius: 8, padding: '20 24', marginBottom: 26, borderLeft: 4, borderLeftColor: INDIGO },
  scoreRow:       { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  scoreNum:       { fontSize: 54, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1 },
  scoreSlash:     { fontSize: 24, color: MUTED, marginBottom: 9, marginLeft: 3, marginRight: 2 },
  scoreMaxNum:    { fontSize: 24, color: MUTED, marginBottom: 9 },
  scoreMeta:      { marginLeft: 22, paddingBottom: 4, flex: 1 },
  scoreMetaLabel: { fontSize: 7.5, color: MUTED, textTransform: 'uppercase' },
  scorePct:       { fontSize: 28, color: INDIGO, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  scoreTierLabel: { fontSize: 9, color: MUTED, marginTop: 5 },

  barTrack:       { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 },
  barFill:        { height: 8, borderRadius: 4 },
  barCaption:     { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  barCaptionText: { fontSize: 6.5, color: MUTED },

  section:        { marginBottom: 20 },
  sectionHead:    { backgroundColor: INDIGO, padding: '9 14', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  sectionTitle:   { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  sectionBody:    { backgroundColor: '#fafbff', padding: '14 16', borderBottomLeftRadius: 5, borderBottomRightRadius: 5, borderLeft: '1 solid #e0e7ff', borderRight: '1 solid #e0e7ff', borderBottom: '1 solid #e0e7ff' },
  para:           { fontSize: 10, color: TEXT, lineHeight: 1.65, marginBottom: 5 },
  listRow:        { flexDirection: 'row', marginBottom: 7 },
  listBullet:     { fontSize: 10, color: INDIGO, fontFamily: 'Helvetica-Bold', marginRight: 8, minWidth: 18 },
  listText:       { fontSize: 10, color: TEXT, lineHeight: 1.55, flex: 1 },

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

// ─── PDF builder (React.createElement — no JSX so this compiles as CJS) ─────
interface DocProps {
  name: string; score: number; maxScore: number;
  tier: string; tierColor: string; date: string;
  sections: { title: string; blocks: Block[] }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const e = React.createElement;

function buildPdf({ name, score, maxScore, tier, tierColor, date, sections }: DocProps) {
  const pct = Math.round((score / maxScore) * 100);

  const blockEl = (b: Block, j: number) => {
    if (b.type === 'numbered') return e(View as any, { key: j, style: s.listRow },
      e(Text as any, { style: s.listBullet }, `${b.num}.`),
      e(Text as any, { style: s.listText  }, b.text),
    );
    if (b.type === 'bullet') return e(View as any, { key: j, style: s.listRow },
      e(Text as any, { style: s.listBullet }, '•'),
      e(Text as any, { style: s.listText  }, b.text),
    );
    return e(Text as any, { key: j, style: s.para }, b.text);
  };

  return e(Document as any, { title: `AI Readiness Report — ${name}`, author: 'ChiefAIOfficer.com' },
    e(Page as any, { size: 'A4', style: s.page },

      // ── Header ──────────────────────────────────────────────────────────
      e(View as any, { style: s.headerBg },
        e(Text as any, { style: s.headerBrand   }, 'ChiefAIOfficer.com'),
        e(Text as any, { style: s.headerPartner }, 'In partnership with Scaling Up'),
        e(View as any, { style: s.headerRule }),
        e(Text as any, { style: s.headerTitle   }, 'AI Readiness Assessment Report'),
        e(Text as any, { style: s.headerMeta    }, `Prepared for ${name}  ·  ${date}`),
      ),

      // ── Body ────────────────────────────────────────────────────────────
      e(View as any, { style: s.body },

        // Meta row
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
          // Progress bar
          e(View as any, { style: s.barTrack },
            e(View as any, { style: [s.barFill, { width: `${pct}%`, backgroundColor: tierColor }] }),
          ),
          e(View as any, { style: s.barCaption },
            e(Text as any, { style: s.barCaptionText }, '0%'),
            e(Text as any, { style: s.barCaptionText }, 'Explorer  ·  Adopter  ·  Leader'),
            e(Text as any, { style: s.barCaptionText }, '100%'),
          ),
        ),

        // Report sections
        ...sections.map((sec, i) =>
          e(View as any, { key: i, style: s.section, wrap: false },
            e(View as any, { style: s.sectionHead },
              e(Text as any, { style: s.sectionTitle }, sec.title),
            ),
            e(View as any, { style: s.sectionBody },
              ...sec.blocks.map(blockEl),
            ),
          ),
        ),
      ),

      // ── Footer (fixed — repeats every page) ─────────────────────────────
      e(View as any, { style: s.footer, fixed: true },
        e(Text as any, { style: s.footerText }, 'ChiefAIOfficer.com  ·  In partnership with Scaling Up  ·  Confidential'),
        e(Text as any, { style: s.footerText, render: ({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} of ${totalPages}` }),
      ),
    ),
  );
}

// ─── MailerLite helper ────────────────────────────────────────────────────────
async function addToMailerLite(email: string, name: string, pdfUrl: string) {
  const ML_URL = 'https://connect.mailerlite.com/api/subscribers';
  const headers = {
    'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  const res = await fetch(ML_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      email,
      fields: { name, pdf_url: pdfUrl },
      groups: [MAILERLITE_GROUP_ID],
      status: 'active',
    }),
  });

  if (res.ok) {
    console.log('MailerLite: subscriber created with pdf_url ✓');
    return;
  }

  const errText = await res.text();
  console.error(`MailerLite error (${res.status}):`, errText);

  // 422 can mean the pdf_url field doesn't exist yet — retry without it
  // so the subscriber still lands in the group and the automation fires.
  if (res.status === 422) {
    console.log('MailerLite: retrying without pdf_url…');
    const res2 = await fetch(ML_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({ email, fields: { name }, groups: [MAILERLITE_GROUP_ID], status: 'active' }),
    });
    if (res2.ok) {
      console.log('MailerLite: subscriber created without pdf_url. Add the pdf_url field under Subscribers → Fields.');
    } else {
      console.error('MailerLite retry failed:', res2.status, await res2.text());
    }
  }
}

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, score, maxScore, fullReport } = req.body as {
    name: string; email: string; score: number; maxScore: number; fullReport: string;
  };

  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const pct       = Math.round((score / maxScore) * 100);
  const tier      = pct > 75 ? 'Leader' : pct > 40 ? 'Adopter' : 'Explorer';
  const tierColor = tier === 'Leader' ? '#16a34a' : tier === 'Adopter' ? '#2563eb' : '#d97706';
  const date      = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const sections  = parseReport(fullReport || '');

  // 1. Generate PDF → Vercel Blob
  let pdfUrl = '';
  try {
    const buffer = await renderToBuffer(
      buildPdf({ name, score, maxScore, tier, tierColor, date, sections }) as any
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
    addToMailerLite(email, name, pdfUrl),
    fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name, email,
        customFields: { aiReadinessScore: score, maxScore, scorePercentage: pct, tier, assessmentDate: date, pdfUrl },
        tags: ['AI Assessment Completed', `AI Tier: ${tier}`],
      }),
    }).catch(err => console.error('GHL error:', err)),
  ]);

  return res.status(200).json({ success: true, pdfUrl });
}
