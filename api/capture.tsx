import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { renderToBuffer } from '@react-pdf/renderer';
import { put } from '@vercel/blob';

export const config = { maxDuration: 30 };

const MAILERLITE_GROUP_ID = '185917251382150276';
const GHL_WEBHOOK_URL = 'https://services.leadconnectorhq.com/hooks/FgaFLGYrbGZSBVprTkhR/webhook-trigger/elWtYyahvdVemgjf2SBn';

// ─── Colours ────────────────────────────────────────────────────────────────
const INDIGO  = '#4f46e5';
const NAVY    = '#1e1b4b';
const TEXT    = '#374151';
const MUTED   = '#6b7280';
const SOFT    = '#f8fafc';

// ─── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page:             { fontFamily: 'Helvetica', fontSize: 10, color: TEXT, backgroundColor: '#ffffff', paddingBottom: 72 },

  /* Header */
  headerBg:         { backgroundColor: NAVY, paddingTop: 34, paddingBottom: 28, paddingHorizontal: 50 },
  headerBrand:      { color: '#ffffff', fontSize: 20, fontFamily: 'Helvetica-Bold' },
  headerPartner:    { color: '#a5b4fc', fontSize: 8.5, marginTop: 3 },
  headerRule:       { borderBottom: '1 solid #312e81', marginTop: 16, marginBottom: 16 },
  headerTitle:      { color: '#e0e7ff', fontSize: 15, fontFamily: 'Helvetica-Bold' },
  headerMeta:       { color: '#a5b4fc', fontSize: 9, marginTop: 5 },

  /* Body */
  body:             { paddingHorizontal: 50, paddingTop: 26 },

  /* Meta cards */
  metaRow:          { flexDirection: 'row', gap: 10, marginBottom: 22 },
  metaCard:         { flex: 1, backgroundColor: SOFT, padding: '14 16', borderRadius: 6 },
  metaLabel:        { color: MUTED, fontSize: 7, textTransform: 'uppercase' },
  metaValue:        { color: NAVY, fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 4 },

  /* Score card */
  scoreCard:        { backgroundColor: SOFT, borderRadius: 8, padding: '20 24', marginBottom: 26, borderLeft: 4, borderLeftColor: INDIGO },
  scoreRow:         { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 16 },
  scoreNum:         { fontSize: 54, fontFamily: 'Helvetica-Bold', color: NAVY, lineHeight: 1 },
  scoreSlash:       { fontSize: 24, color: MUTED, marginBottom: 9, marginLeft: 3, marginRight: 2 },
  scoreMaxNum:      { fontSize: 24, color: MUTED, marginBottom: 9 },
  scoreMeta:        { marginLeft: 22, paddingBottom: 4, flex: 1 },
  scoreMetaLabel:   { fontSize: 7.5, color: MUTED, textTransform: 'uppercase' },
  scorePct:         { fontSize: 28, color: INDIGO, fontFamily: 'Helvetica-Bold', marginTop: 3 },
  scoreTierLabel:   { fontSize: 9, color: MUTED, marginTop: 5 },

  /* Progress bar */
  barTrack:         { height: 8, backgroundColor: '#e5e7eb', borderRadius: 4 },
  barFill:          { height: 8, borderRadius: 4 },
  barCaption:       { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  barCaptionText:   { fontSize: 6.5, color: MUTED },

  /* Sections */
  section:          { marginBottom: 20 },
  sectionHead:      { backgroundColor: INDIGO, padding: '9 14', borderTopLeftRadius: 5, borderTopRightRadius: 5 },
  sectionTitle:     { color: '#ffffff', fontSize: 11, fontFamily: 'Helvetica-Bold' },
  sectionBody:      { backgroundColor: '#fafbff', padding: '14 16', borderBottomLeftRadius: 5, borderBottomRightRadius: 5, borderLeft: '1 solid #e0e7ff', borderRight: '1 solid #e0e7ff', borderBottom: '1 solid #e0e7ff' },
  para:             { fontSize: 10, color: TEXT, lineHeight: 1.65, marginBottom: 5 },
  listRow:          { flexDirection: 'row', marginBottom: 7 },
  listBullet:       { fontSize: 10, color: INDIGO, fontFamily: 'Helvetica-Bold', marginRight: 8, minWidth: 18 },
  listText:         { fontSize: 10, color: TEXT, lineHeight: 1.55, flex: 1 },

  /* Footer */
  footer:           { position: 'absolute', bottom: 24, left: 50, right: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTop: '1 solid #e5e7eb', paddingTop: 10 },
  footerText:       { fontSize: 7.5, color: MUTED },
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
    if (nm)               { flush(); blocks.push({ type: 'numbered', num: nm[1], text: clean(nm[2]) }); continue; }
    if (/^[-*]\s/.test(t)) { flush(); blocks.push({ type: 'bullet',   text: clean(t.replace(/^[-*]\s+/, '')) }); continue; }
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

const ReportDocument = ({ name, score, maxScore, tier, tierColor, date, sections }: DocProps) => {
  const pct = Math.round((score / maxScore) * 100);
  return (
    <Document title={`AI Readiness Report — ${name}`} author="ChiefAIOfficer.com">
      <Page size="A4" style={s.page}>

        {/* ── Header ── */}
        <View style={s.headerBg}>
          <Text style={s.headerBrand}>ChiefAIOfficer.com</Text>
          <Text style={s.headerPartner}>In partnership with Scaling Up</Text>
          <View style={s.headerRule} />
          <Text style={s.headerTitle}>AI Readiness Assessment Report</Text>
          <Text style={s.headerMeta}>Prepared for {name}  ·  {date}</Text>
        </View>

        <View style={s.body}>

          {/* ── Meta row ── */}
          <View style={s.metaRow}>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Prepared For</Text>
              <Text style={s.metaValue}>{name}</Text>
            </View>
            <View style={s.metaCard}>
              <Text style={s.metaLabel}>Date</Text>
              <Text style={s.metaValue}>{date}</Text>
            </View>
            <View style={[s.metaCard, { backgroundColor: tierColor }]}>
              <Text style={[s.metaLabel, { color: 'rgba(255,255,255,0.8)' }]}>AI Readiness Tier</Text>
              <Text style={[s.metaValue, { color: '#ffffff' }]}>{tier}</Text>
            </View>
          </View>

          {/* ── Score card ── */}
          <View style={s.scoreCard}>
            <View style={s.scoreRow}>
              <Text style={s.scoreNum}>{score}</Text>
              <Text style={s.scoreSlash}>/</Text>
              <Text style={s.scoreMaxNum}>{maxScore}</Text>
              <View style={s.scoreMeta}>
                <Text style={s.scoreMetaLabel}>Overall Score</Text>
                <Text style={s.scorePct}>{pct}%</Text>
                <Text style={s.scoreTierLabel}>{tier} — AI Readiness Tier</Text>
              </View>
            </View>
            {/* Progress bar */}
            <View style={s.barTrack}>
              <View style={[s.barFill, { width: `${pct}%`, backgroundColor: tierColor }]} />
            </View>
            <View style={s.barCaption}>
              <Text style={s.barCaptionText}>0%</Text>
              <Text style={s.barCaptionText}>Explorer  ·  Adopter  ·  Leader</Text>
              <Text style={s.barCaptionText}>100%</Text>
            </View>
          </View>

          {/* ── Sections ── */}
          {sections.map((sec, i) => (
            <View key={i} style={s.section} wrap={false}>
              <View style={s.sectionHead}>
                <Text style={s.sectionTitle}>{sec.title}</Text>
              </View>
              <View style={s.sectionBody}>
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
            </View>
          ))}

        </View>

        {/* ── Footer ── */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>ChiefAIOfficer.com  ·  In partnership with Scaling Up  ·  Confidential</Text>
          <Text style={s.footerText} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

      </Page>
    </Document>
  );
};

// ─── MailerLite helper ────────────────────────────────────────────────────────
async function addToMailerLite(email: string, name: string, pdfUrl: string) {
  const ML_URL = 'https://connect.mailerlite.com/api/subscribers';
  const headers = {
    'Authorization': `Bearer ${process.env.MAILERLITE_API_KEY}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  // First attempt — with pdf_url field
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
    console.log('MailerLite: subscriber created with pdf_url');
    return;
  }

  const errText = await res.text();
  console.error(`MailerLite error (${res.status}):`, errText);

  // 422 usually means the pdf_url custom field doesn't exist yet in MailerLite.
  // Retry without it so the subscriber is still added to the group.
  if (res.status === 422) {
    console.log('MailerLite: retrying without pdf_url field…');
    const res2 = await fetch(ML_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email,
        fields: { name },
        groups: [MAILERLITE_GROUP_ID],
        status: 'active',
      }),
    });
    if (res2.ok) {
      console.log('MailerLite: subscriber created (without pdf_url). Create the pdf_url field in MailerLite → Subscribers → Fields.');
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
      <ReportDocument name={name} score={score} maxScore={maxScore}
        tier={tier} tierColor={tierColor} date={date} sections={sections} />
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

  // 2. MailerLite + GHL in parallel (MailerLite has fallback logic inside)
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
