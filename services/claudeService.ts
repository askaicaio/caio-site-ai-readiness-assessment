import { Answers } from '../types';
import { SURVEY_QUESTIONS } from '../constants';

interface ReportContext {
  company?: string;
  role?: string;
  industry?: string;
  companySize?: string;
  primaryGoal?: string;
  biggestChallenge?: string;
  aiTools?: string;
}

export async function getAIAssessment(
  score: number,
  maxScore: number,
  answers: Answers,
  onChunk?: (text: string) => void,
  context?: ReportContext,
): Promise<string> {
  const relevantAnswers = SURVEY_QUESTIONS
    .filter(q => q.type === 'radio' && answers[q.id])
    .flatMap(q => {
      const answerText = answers[q.id];
      const option = q.options?.find(o => o.text === answerText);
      return option ? [{ questionText: q.text, answer: answerText }] : [];
    });

  const response = await fetch('/api/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, maxScore, relevantAnswers, context }),
  });

  if (!response.ok) throw new Error('Failed to generate assessment. Please try again.');
  if (!response.body) throw new Error('No response body received.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') return fullText;
      try {
        const parsed = JSON.parse(data);
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) {
          fullText += parsed.text;
          onChunk?.(fullText);
        }
      } catch (e) {
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return fullText;
}
