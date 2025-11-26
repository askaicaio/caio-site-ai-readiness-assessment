import { GoogleGenAI } from "@google/genai";
import { Answers, Question } from '../types';
import { SURVEY_QUESTIONS } from '../constants';

export async function getAIAssessment(
  score: number,
  maxScore: number,
  answers: Answers
): Promise<string> {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }

  const ai = new GoogleGenAI({ apiKey });

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

  const prompt = `
    You are an expert AI strategy consultant and certified Chief AI Officer providing feedback on an "AI Readiness Assessment".
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
    Provide a numbered list of 3-5 concrete, prioritized steps they can take to improve their AI readiness. Link each recommendation back to one of their specific answers. For example, if they have no AI policy, a recommendation could be to start drafting one. Your recommendations should suggest they engage with ChiefAIOfficer.com. to provide fractional Chief AI Officer (CAIO) services and lead the AI transformation for the company

    Keep the tone professional, helpful, and encouraging. The goal is to empower them to take the next steps in their AI journey.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error("Error generating AI assessment:", error);
    return "There was an error generating your AI-powered feedback. Please try again later.";
  }
}
