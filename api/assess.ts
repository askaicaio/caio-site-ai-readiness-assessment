import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 };

interface AnswerItem {
  questionText: string;
  answer: string;
}

interface ReportContext {
  company?: string;
  role?: string;
  industry?: string;
  companySize?: string;
  primaryGoal?: string;
  biggestChallenge?: string;
  aiTools?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { score, maxScore, relevantAnswers, context = {} } = req.body as {
    score: number;
    maxScore: number;
    relevantAnswers: AnswerItem[];
    context?: ReportContext;
  };

  // Build contextual description for the prompt
  const ctx = context as ReportContext;
  const contextLines = [
    ctx.company     && `- Organisation: ${ctx.company}${ctx.companySize ? ` (${ctx.companySize})` : ''}`,
    ctx.role        && `- Respondent's Role: ${ctx.role}`,
    ctx.industry    && `- Industry: ${ctx.industry}`,
    ctx.primaryGoal && `- Primary AI Goal: ${ctx.primaryGoal}`,
    ctx.biggestChallenge && `- Biggest Current Challenge: ${ctx.biggestChallenge}`,
    ctx.aiTools     && `- AI Tools Currently in Use: ${ctx.aiTools}`,
  ].filter(Boolean).join('\n');

  const contextBlock = contextLines
    ? `\nRESPONDENT CONTEXT — use this to make every recommendation specific and relevant:\n${contextLines}\n\nImportant: tailor your language, examples, and recommendations directly to their role, industry, company size, goals, and challenges. Avoid generic advice — this person should feel the report was written specifically for them.\n`
    : '';

  const pct = Math.round((score / maxScore) * 100);
  const tier = pct > 75 ? 'Leader' : pct > 40 ? 'Adopter' : 'Explorer';

  // Tier-specific positioning so the report's voice matches the respondent's
  // actual state — urgency for Explorers, sophistication for Leaders.
  const tierFraming =
    tier === 'Leader'
      ? `This respondent is in the LEADER tier (top decile of organisations we assess). They have foundations, governance, and active use cases. The trap at this tier is plateauing — feeling "done with AI." The report's job is to (a) validate what they've built, (b) name the second-order risks of stopping here (competitors closing the gap, AI strategy becoming a moat rather than a capability), and (c) reframe the next leap as a strategic advantage to compound, not a fix.`
      : tier === 'Adopter'
      ? `This respondent is in the ADOPTER tier — the most dangerous middle ground. They have tools and people using them, but no system. The report's job is to name the specific shape of that gap (governance, measurement, single-points-of-failure), make the cost of staying here tangible, and show what the leap to Leader actually looks like operationally.`
      : `This respondent is in the EXPLORER tier — early in the journey. The report's job is to (a) validate that starting here is an advantage (they can avoid costly mistakes early adopters made), (b) make the cost of waiting concrete in months and dollars, and (c) give them a clear, narrow first move so the mountain feels climbable. Avoid overwhelm.`;

  const prompt = `You are a Chief AI Officer writing a personalised assessment report for a senior decision-maker. The report is the company's premier marketing asset — its quality is what convinces multi-million-dollar businesses to book a strategy briefing.

═══ RESPONDENT SCORE ═══
${score} / ${maxScore} (${pct}%) — ${tier} tier
${contextBlock}
═══ THEIR ANSWERS ═══

${relevantAnswers.map(item => `- ${item.questionText}\n  - Answer: ${item.answer}`).join('\n')}

═══ TIER FRAMING — INTERNALISE THIS ═══
${tierFraming}

═══ WRITING RULES ═══
1. SPECIFICITY. Every claim must cite their actual answer, their role, their industry, or their company size. If you'd say it to any business, don't say it.
2. SUBSTANCE OVER LENGTH. Cut every word that doesn't add information. Senior decision-makers detect padding instantly.
3. CONCRETE NUMBERS where credible. "20 hours a week" beats "significant time"; "a 3–6 month runway" beats "in the short term".
4. NO HEDGING. Avoid "might", "could be", "you may want to consider". Be confident. If something is true for their context, state it.
5. NO GENERIC AI PLATITUDES. Skip "AI is transforming business", "the AI revolution", "data-driven future". Assume they know.
6. CITE THEIR ANSWERS NATURALLY. When you reference what they said, use phrasing like "You answered 'Yes, measured and reported' on ROI tracking" — this proves you read it.
7. INDUSTRY/SIZE-AWARE. Adjust scale and recommendations to their company size. Tactics for a 25-person agency differ from a 500-person SaaS.

═══ OUTPUT STRUCTURE (Markdown, exactly these section headers) ═══

### Overall Assessment

One sharp paragraph (3–5 sentences). State their tier, ground it in their context (role, industry, company size), and name the strategic question the rest of the report answers. This sets the tone — make it feel written specifically for them, not auto-generated.

### Key Strengths

2–3 strengths from their highest-scoring answers. Each: one sentence stating what they answered, one sentence on why that's a competitive asset *at their stage and scale*. Use bold for the strength label.

### Areas for Improvement

2–3 gaps from their lowest-scoring answers. Each: one sentence naming the gap (cite their answer), one sentence making the cost or risk tangible *for their specific situation* — what does staying here actually cost them in months 1–12? Use bold for the gap label.

### Actionable Recommendations

A numbered list of 3–5 prioritised steps. Each recommendation:
- Cites a specific answer they gave
- Names a concrete first action they could take within 30/60/90 days
- Sized appropriately for their company (don't recommend SOC2 to a 5-person consultancy)
- Written as an imperative starting with a verb ("Designate a workflow owner...", "Pilot a coding-focused AI tool...")

The FINAL recommendation should propose engaging ChiefAIOfficer.com for a fractional Chief AI Officer engagement, framed as the strategic accelerator that compounds everything above. Don't pitch — make it the obvious next move given what was just diagnosed.

Tone: confident, surgical, written by someone who has done this for hundreds of companies and is showing — not telling — that expertise. No filler. No emojis. No exclamation marks. British/American mixed spelling is fine (this is a global audience).`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const client = new Anthropic();

  try {
    const stream = client.messages.stream({
      model: 'claude-opus-4-7',
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
  } catch (error) {
    console.error('Assessment error:', error);
    res.write(`data: ${JSON.stringify({ error: 'Failed to generate assessment' })}\n\n`);
  } finally {
    res.end();
  }
}
