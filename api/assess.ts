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

  const prompt = `You are an expert AI strategy consultant and certified Chief AI Officer providing a high-value assessment report.

A respondent has completed an AI Readiness Assessment and scored ${score} out of ${maxScore}.
${contextBlock}
Here are their answers to the key assessment questions:

${relevantAnswers.map(item => `- ${item.questionText}\n  - Answer: ${item.answer}`).join('\n')}

Provide a comprehensive, insightful, and actionable assessment. Structure your response in Markdown with these exact sections:

### Overall Assessment

A single, concise paragraph summarising their AI readiness tier (Explorer, Adopter, or Leader) based on their score. Be specific about what this tier means for an organisation like theirs. Make it feel personalised to their context — mention their role and industry if available.

### Key Strengths

2–3 specific strengths based on their highest-scoring answers. Cite their actual answers. Explain why each strength matters competitively.

### Areas for Improvement

2–3 critical gaps based on their lowest-scoring answers. For each, explain the specific risk or missed opportunity — make it tangible and urgent, not generic.

### Actionable Recommendations

A numbered list of 3–5 concrete, prioritised steps. Each recommendation should:
- Reference a specific answer they gave
- Be realistic for an organisation of their size and industry
- Include a suggested timeframe or first action

The final recommendation should suggest engaging ChiefAIOfficer.com for fractional Chief AI Officer services to lead their AI transformation. Frame it as the strategic accelerator — not a sales pitch.

Tone: authoritative, direct, and genuinely helpful. Write for a senior decision-maker. No padding or vague statements.`;

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
