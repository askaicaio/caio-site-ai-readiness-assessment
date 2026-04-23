export const config = { runtime: 'edge' };

interface AnswerItem {
  questionText: string;
  answer: string;
}

export default async function handler(req: Request): Promise<Response> {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let score: number, maxScore: number, relevantAnswers: AnswerItem[];
  try {
    ({ score, maxScore, relevantAnswers } = await req.json());
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  try {
    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-7',
        max_tokens: 2048,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const transformStream = new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        const text = decoder.decode(chunk, { stream: true });
        const lines = text.split('\n');
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const data = line.slice(6).trim();
          if (data === '[DONE]') {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            return;
          }
          try {
            const parsed = JSON.parse(data);
            if (
              parsed.type === 'content_block_delta' &&
              parsed.delta?.type === 'text_delta' &&
              parsed.delta?.text
            ) {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
              );
            }
          } catch {}
        }
      },
      flush(controller) {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      },
    });

    return new Response(anthropicRes.body!.pipeThrough(transformStream), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
