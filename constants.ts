import { Question } from './types';

export const SURVEY_QUESTIONS: Question[] = [
  {
    id: 'q6',
    text: 'Is your team using AI at work effectively?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Yes', score: 3 },
      { text: 'No', score: 0 },
      { text: 'Maybe', score: 2 },
      { text: "I don't know", score: 1 },
    ],
  },
  {
    id: 'q7',
    text: 'Who trained your team on how to use AI?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Me', score: 2 },
      { text: 'An expert', score: 3 },
      { text: 'Social Media (Tik Tok, Instagram, Facebook)', score: 0 },
      { text: 'They are Self Taught', score: 1 },
    ],
  },
  {
    id: 'q8',
    text: 'Who owns AI strategy, governance, and results in your company?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Named leader or committee', score: 3 },
      { text: 'Shared informally across managers', score: 2 },
      { text: 'Individual enthusiasts', score: 1 },
      { text: 'No clear owner / Not sure', score: 0 },
    ],
  },
  {
    id: 'q9',
    text: 'Do you have a written AI use policy that covers data privacy, approved tools, and prohibited use?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Yes, up-to-date and enforced', score: 3 },
      { text: 'Draft exists but not enforced', score: 2 },
      { text: 'In progress', score: 1 },
      { text: 'No / Not sure', score: 0 },
    ],
  },
  {
    id: 'q10',
    text: 'Do you track ROI (time saved, error rates, revenue impact) from AI initiatives?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Yes, measured and reported', score: 3 },
      { text: 'Some tracking, mostly anecdotal', score: 2 },
      { text: 'Not yet, plan to', score: 1 },
      { text: 'Unsure / No', score: 0 },
    ],
  },
  {
    id: 'q11',
    text: 'Are employees pasting customer or proprietary data into public AI tools?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Never', score: 3 },
      { text: 'Rarely, with controls in place', score: 2 },
      { text: 'Sometimes', score: 1 },
      { text: 'Often / Unknown', score: 0 },
    ],
  },
  {
    id: 'q12',
    text: 'How standardized are your AI prompts and workflows across roles?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Documented playbooks and templates', score: 3 },
      { text: 'Shared examples but not standardized', score: 2 },
      { text: 'Everyone does their own thing', score: 1 },
      { text: 'No idea / Not documented', score: 0 },
    ],
  },
  {
    id: 'q13',
    text: 'Do managers review AI-generated outputs for accuracy, bias, and compliance?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Always', score: 3 },
      { text: 'Often', score: 2 },
      { text: 'Sometimes', score: 1 },
      { text: 'Rarely / Never', score: 0 },
    ],
  },
  {
    id: 'q14',
    text: 'What best describes your AI tool governance (access, approvals, SSO, offboarding)?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Centralized admin with SSO and regular reviews', score: 3 },
      { text: 'Mix of approved and ad-hoc tools', score: 2 },
      { text: 'Individuals sign up freely', score: 1 },
      { text: "We don't know who's using what", score: 0 },
    ],
  },
  {
    id: 'q15',
    text: 'How frequently is your team formally trained or upskilled on AI tools and use cases?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Monthly', score: 3 },
      { text: 'Quarterly', score: 2 },
      { text: 'Annually / once', score: 1 },
      { text: 'Never', score: 0 },
    ],
  },
  {
    id: 'q16',
    text: 'Have you integrated AI into core systems (CRM, helpdesk, ERP) with SOPs and guardrails?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Yes, integrated and documented', score: 3 },
      { text: 'Pilots in select teams', score: 2 },
      { text: 'Manual copy-paste between tools', score: 1 },
      { text: 'Not yet', score: 0 },
    ],
  },
  {
    id: 'q17',
    text: 'How do you mitigate hallucinations and risky outputs?',
    description: "Mark only one oval.",
    type: 'radio',
    required: true,
    options: [
      { text: 'Playbooks, escalation paths, and audit logs', score: 3 },
      { text: 'Spot-checks on key workflows', score: 2 },
      { text: 'Ad hoc fixes by users', score: 1 },
      { text: 'We trust the tools / Not addressed', score: 0 },
    ],
  },
];

export const MAX_SCORE = SURVEY_QUESTIONS.filter(q => q.type === 'radio').reduce((acc, q) => {
    const maxOptionScore = Math.max(...(q.options?.map(o => o.score) || [0]));
    return acc + maxOptionScore;
}, 0);
