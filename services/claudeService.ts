import { Answers } from '../types';

export async function getAIAssessment(
  score: number,
  maxScore: number,
  answers: Answers,
  onChunk?: (text: string) => void
): Promise<string> {
  const response = await fetch('/api/assess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ score, maxScore, answers }),
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
