import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';

export const config = { maxDuration: 60 };
import { SURVEY_QUESTIONS } from '../constants';
import type { Answers, Question } from '../types';

const client = new Anthropic();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { score, maxScore, answers } = req.body as {
    score: number;
    maxScore: number;
    answers: Answers;
  };

  const relevantAnswers: { question: Question; answer: string }[] = [];
  for (const question of SURVEY_QUESTIONS) {
    if (question.type === 'radio' && answers[question.id]) {
      const answerText = answers[question.id];
      const option = question.options?.find(o => o.text === answerText);
      if (option) {
        relevantAnswers.push({ question, answer: answerText });
      }
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

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const result = message.content[0].type === 'text' ? message.content[0].text : '';
    return res.status(200).json({ result });
  } catch (error) {
    console.error('Error generating AI assessment:', error);
    return res.status(500).json({ error: 'Failed to generate assessment. Please try again later.' });
  }
}
