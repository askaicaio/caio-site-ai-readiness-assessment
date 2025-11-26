
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
}

export type Answers = {
  [key: string]: string;
};
