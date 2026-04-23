import Anthropic from '@anthropic-ai/sdk';
import { SURVEY_QUESTIONS } from '../constants';
import type { Answers, Question } from '../types';

export const runtime = 'edge';

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let score: number, maxScore: number, answers: Answers;
  try {
    ({ score, maxScore, answers } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const relevantAnswers: { question: Question; answer: string }[] = [];
  for (const question of SURVEY_QUESTIONS) {
    if (question.type === 'radio' && answers[question.id]) {
      const answerText = answers[question.id];
      const option = question.options?.find(o => o.text === answerText);
      if (option) relevantAnswers.push({ question, answer: answerText });
    }
  }

  const prompt = `You are an expert AI strategy consultant and certified Chief AI Officer providing feedback on an "AI Readiness Assessment".

A user has completed a survey and received a score of ${score} out of a possible ${maxScore}.

Here are their answers to the key questions:

${relevantAnswers.map(item => `- ${item.question.text}\n  - Answer: ${item.answer}`).join('\n')}

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

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const messageStream = client.messages.stream({
          model: 'claude-opus-4-7',
          max_tokens: 2048,
          messages: [{ role: 'user', content: prompt }],
        });

        for await (const chunk of messageStream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`)
            );
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Failed to generate assessment' })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
