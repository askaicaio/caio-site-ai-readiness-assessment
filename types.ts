
export interface Option {
  text: string;
  score: number;
}

export interface Question {
  id: string;
  text: string;
  type: 'text' | 'radio';
  required: boolean;
  options?: Option[];
  description?: string;
  /**
   * Relative weight of this question in the overall AI Readiness Score.
   * Defaults to 1 if omitted. Higher weights for questions that more strongly
   * discriminate between Explorer / Adopter / Leader tiers (e.g. governance,
   * policy, data security, integration). See constants.ts for the rationale
   * behind each value.
   */
  weight?: number;
}

export type Answers = {
  [key: string]: string;
};
