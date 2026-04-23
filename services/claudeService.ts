import { Answers } from '../types';

export async function getAIAssessment(
  score: number,
  maxScore: number,
  answers: Answers
): Promise<string> {
  const response = await fetch('/api/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, maxScore, answers }),
  });

  if (!response.ok) {
    throw new Error('Failed to generate assessment. Please try again.');
  }

  const data = await response.json();
  return data.result;
}
