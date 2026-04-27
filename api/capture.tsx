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
  page:          { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: '#fff', paddingBottom: 60 },
  headerBg:      { backgroundColor: NAVY, padding: '28 50' },
  headerBrand:   { color: '#fff', fontSize: 18, fontFamily: 'Helvetica-Bold' },
  headerPartner: { color: '#a5b4fc', fontSize: 8, marginTop: 2 },
  headerTitle:   { color: '#e0e7ff', fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 14 },
  body:          { paddingHorizontal: 50, paddingTop: 28 },
  metaRow:       { flexDirection: 'row', gap: 12, marginBottom: 20 },
  metaCard:      { flex: 1, backgroundColor: SOFT, padding: '12 14', borderRadius: 6 },
  metaLabel:     { color: MUTED, fontSize: 7, textTransform: 'uppercase' },
  metaValue:     { color: NAVY, fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  scoreRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: SOFT, borderRadius: 6, padding: '16 20', marginBottom: 24, borderLeft: 3, borderLeftColor: INDIGO },
  scoreNum:      { fontSize: 38, fontFamily: 'Helvetica-Bold', color: NAVY },
  scoreMax:      { fontSize: 18, color: MUTED, marginTop: 12, marginLeft: 3 },
  scoreMeta:     { marginLeft: 16 },
  scoreLabel:    { fontSize: 9, color: MUTED },
  scoreTier:     { fontSize: 10, color: INDIGO, marginTop: 3 },
  section:       { marginBottom: 20 },
  sectionHead:   { backgroundColor: INDIGO, padding: '7 12', borderRadius: 4, marginBottom: 10 },
  sectionTitle:  { color: '#fff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  para:          { fontSize: 10, color: TEXT, lineHeight: 1.6, marginBottom: 5 },
  listRow:       { flexDirection: 'row', marginBottom: 5 },
  listBullet:    { fontSize: 10, color: INDIGO, fontFamily: 'Helvetica-Bold', marginRight: 8, minWidth: 16 },
  listText:      { fontSize: 10, color: TEXT, lineHeight: 1.5, flex: 1 },
  footer:        { position: 'absolute', bottom: 24, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', borderTop: '1 solid #e5e7eb', paddingTop: 10 },
  footerText:    { fontSize: 7.5, color: MUTED },
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
    if (nm)            { flush(); blocks.push({ type: 'numbered', num: nm[1], text: clean(nm[2]) }); continue; }
    if (/^[-*]\s/.test(t)) { flush(); blocks.push({ type: 'bullet', text: clean(t.replace(/^[-*]\s+/, '')) }); continue; }
    buf.push(t);
  }
  flush();
  return blocks;
}

function parseReport(md: string) {
  return md.split(/(?=### )/).filter(s => s.trim()).map(s => {
    const lines = s.split('\n');
    return { title: lines[0].replace(/^### /, '').trim(), blocks: parseSection(lines.slice(1).join('\n')) };
  });
}

// ─── PDF Document ────────────────────────────────────────────────────────────
interface DocProps {
  name: string; score: number; maxScore: number;
  tier: string; tierColor: string; date: string;
  sections: { title: string; blocks: Block[] }[];
}

const ReportDocument = ({ name, score, maxScore, tier, tierColor, date, sections }: DocProps) => (
  <Document title={`AI Readiness Report — ${name}`} author="ChiefAIOfficer.com">
    <Page size="A4" style={s.page}>

      {/* Header */}
      <View style={s.headerBg}>
        <Text style={s.headerBrand}>ChiefAIOfficer.com</Text>
        <Text style={s.headerPartner}>In partnership with Scaling Up</Text>
        <Text style={s.headerTitle}>AI Readiness Assessment Report</Text>
      </View>

      <View style={s.body}>

        {/* Meta row */}
        <View style={s.metaRow}>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Prepared for</Text>
            <Text style={s.metaValue}>{name}</Text>
          </View>
          <View style={s.metaCard}>
            <Text style={s.metaLabel}>Date</Text>
            <Text style={s.metaValue}>{date}</Text>
          </View>
          <View style={[s.metaCard, { backgroundColor: tierColor }]}>
            <Text style={[s.metaLabel, { color: 'rgba(255,255,255,0.75)' }]}>AI Readiness Tier</Text>
            <Text style={[s.metaValue, { color: '#fff' }]}>{tier}</Text>
          </View>
        </View>

        {/* Score bar */}
        <View style={s.scoreRow}>
          <Text style={s.scoreNum}>{score}</Text>
          <Text style={s.scoreMax}>/{maxScore}</Text>
          <View style={s.scoreMeta}>
            <Text style={s.scoreLabel}>Overall Score</Text>
            <Text style={s.scoreTier}>{Math.round((score / maxScore) * 100)}% — {tier}</Text>
          </View>
        </View>

        {/* Sections */}
        {sections.map((sec, i) => (
          <View key={i} style={s.section} wrap={false}>
            <View style={s.sectionHead}>
              <Text style={s.sectionTitle}>{sec.title}</Text>
            </View>
            {sec.blocks.map((b, j) => {
              if (b.type === 'numbered') return (
                <View key={j} style={s.listRow}>
                  <Text style={s.listBullet}>{b.num}.</Text>
                  <Text style={s.listText}>{b.text}</Text>
                </View>
              );
              if (b.type === 'bullet') return (
                <View key={j} style={s.listRow}>
                  <Text style={s.listBullet}>•</Text>
                  <Text style={s.listText}>{b.text}</Text>
                </View>
              );
              return <Text key={j} style={s.para}>{b.text}</Text>;
            })}
          </View>
        ))}

      </View>

      {/* Footer */}
      <View style={s.footer} fixed>
        <Text style={s.footerText}>ChiefAIOfficer.com | In partnership with Scaling Up</Text>
        <Text style={s.footerText}>Confidential</Text>
      </View>

    </Page>
  </Document>
);

// ─── Handler ─────────────────────────────────────────────────────────────────
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { name, email, score, maxScore, fullReport } = req.body as {
    name: string; email: string; score: number; maxScore: number; fullReport: string;
  };

  if (!name || !email) return res.status(400).json({ error: 'Name and email required' });

  const pct     = Math.round((score / maxScore) * 100);
  const tier     = pct > 75 ? 'Leader' : pct > 40 ? 'Adopter' : 'Explorer';
  const tierColor = tier === 'Leader' ? '#16a34a' : tier === 'Adopter' ? '#2563eb' : '#d97706';
  const date     = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const sections = parseReport(fullReport || '');

  // Generate PDF → upload to Blob
  let pdfUrl = '';
  try {
    const buffer = await renderToBuffer(
      <ReportDocument name={name} score={score} maxScore={maxScore}
        tier={tier} tierColor={tierColor} date={date} sections={sections} />
    );
    const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const { url } = await put(`reports/${Date.now()}-${slug}.pdf`, buffer, {
      access: 'public', contentType: 'application/pdf',
    });
    pdfUrl = url;
  } catch (err) {
    console.error('PDF/Blob error:', err);
  }

  // MailerLite + GHL (parallel, non-blocking)
  await Promise.allSettled([
    fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`, 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ email, fields: { name }, groups: [MAILERLITE_GROUP_ID], status: 'active' }),
    }),
    fetch(GHL_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, customFields: { aiReadinessScore: score, maxScore, scorePercentage: pct, tier, assessmentDate: date, pdfUrl }, tags: ['AI Assessment Completed', `AI Tier: ${tier}`] }),
    }),
  ]);

  return res.status(200).json({ success: true, pdfUrl });
}
