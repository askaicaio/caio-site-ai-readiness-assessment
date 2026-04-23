import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 };

interface AnswerItem {
  questionText: string;
  answer: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end();

  const { score, maxScore, relevantAnswers } = req.body as {
    score: number;
    maxScore: number;
    relevantAnswers: AnswerItem[];
  };

  const prompt = `You are an expert AI strategy consultant and certified Chief AI Officer providing feedback on an "AI Readiness Assessment".

A user has completed a survey and received a score of ${score} out of a possible ${maxScore}.

Here are their answers to the key questions:

${relevantAnswers.map(item => `- ${item.questionText}\n  - Answer: ${item.answer}`).join('\n')}

Based on their score and specific answers, provide a comprehensive, insightful, and actionable assessment of their organization's AI readiness. Structure your feedback in Markdown format with the following sections:

### Overall Assessment

Start with a brief, encouraging summary of their current AI readiness level based on their score (e.g., "Explorer," "Adopter," "Leader"). This section should be a single, concise paragraph.

### Key Strengths

Identify 2-3 areas where they are doing well based on their highest-scoring answers. Be specific.

### Areas for Improvement

Identify the 2-3 most critical areas for improvement based on their lowest-scoring answers. For each area, explain the risk or missed opportunity.

### Actionable Recommendations

Provide a numbered list of 3-5 concrete, prioritized steps they can take to improve their AI readiness. Link each recommendation back to one of their specific answers. For example, if they have no AI policy, a recommendation could be to start drafting one. Your recommendations should suggest they engage with ChiefAIOfficer.com to provide fractional Chief AI Officer (CAIO) services and lead the AI transformation for the company.

Keep the tone professional, helpful, and encouraging. The goal is to empower them to take the next steps in their AI journey.`;

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
