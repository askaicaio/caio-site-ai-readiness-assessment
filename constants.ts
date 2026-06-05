import { Question } from './types';

// ─── SCORING RUBRIC ─────────────────────────────────────────────────────────
//
// Each radio option scores 0-3 points (0 = dangerous/absent, 1 = minimal /
// risky, 2 = developing, 3 = best-practice). Each question carries a relative
// weight (1×, 2×, or 3×) reflecting how strongly it discriminates between the
// Explorer / Adopter / Leader tiers. The final score is:
//
//     score      = Σ ( optionScore × questionWeight )
//     maxScore   = Σ ( 3            × questionWeight )    // 81
//     percentage = (score / maxScore) × 100
//
// Weights (rationale):
//   3× — Critical maturity signals (governance ownership, written policy, ROI
//        measurement, data security in public AI tools, tool governance / SSO,
//        integration into core systems). These are what separate Leaders from
//        Adopters in any organisation we've worked with.
//   2× — Operational maturity signals (standardised prompts, manager review,
//        hallucination mitigation). High value but downstream of leadership.
//   1× — Baseline / meta questions (self-report of effectiveness, who trained
//        the team, training frequency). Useful context, but they don't predict
//        outcomes the way governance and integration do.
//
// Tier thresholds (unchanged, percentage-based):
//   Explorer: 0-40%   |   Adopter: 41-75%   |   Leader: 76-100%
// ────────────────────────────────────────────────────────────────────────────

export const SURVEY_QUESTIONS: Question[] = [
  {
    id: 'q6',
    text: 'Is your team using AI at work effectively?',
    type: 'radio',
    required: true,
    weight: 1, // self-report meta — the rest of the quiz is the real measurement
    options: [
      { text: 'Yes', score: 3 },
      { text: 'Maybe', score: 2 },
      { text: "I don't know", score: 1 },
      { text: 'No', score: 0 },
    ],
  },
  {
    id: 'q7',
    text: 'Who trained your team on how to use AI?',
    type: 'radio',
    required: true,
    weight: 1, // useful context; weak predictor of outcomes
    options: [
      { text: 'An expert', score: 3 },
      { text: 'Me', score: 2 },
      { text: 'They are self-taught', score: 1 },
      { text: 'Social media (TikTok, Instagram, Facebook)', score: 0 },
    ],
  },
  {
    id: 'q8',
    text: 'Who owns AI strategy, governance, and results in your company?',
    type: 'radio',
    required: true,
    weight: 3, // CRITICAL — named ownership is THE signal of a mature org
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
    type: 'radio',
    required: true,
    weight: 3, // CRITICAL — risk and maturity signal
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
    type: 'radio',
    required: true,
    weight: 3, // CRITICAL — measurement is what separates Leaders
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
    type: 'radio',
    required: true,
    weight: 3, // CRITICAL — direct security exposure
    options: [
      { text: 'Never', score: 3 },
      { text: 'Rarely, with controls in place', score: 2 },
      { text: 'Sometimes', score: 1 },
      { text: 'Often / Unknown', score: 0 },
    ],
  },
  {
    id: 'q12',
    text: 'How standardised are your AI prompts and workflows across roles?',
    type: 'radio',
    required: true,
    weight: 2, // HIGH — strong operational maturity signal
    options: [
      { text: 'Documented playbooks and templates', score: 3 },
      { text: 'Shared examples but not standardised', score: 2 },
      { text: 'Everyone does their own thing', score: 1 },
      { text: 'No idea / Not documented', score: 0 },
    ],
  },
  {
    id: 'q13',
    text: 'Do managers review AI-generated outputs for accuracy, bias, and compliance?',
    type: 'radio',
    required: true,
    weight: 2, // HIGH — quality + compliance signal
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
    type: 'radio',
    required: true,
    weight: 3, // CRITICAL — shadow IT crisis if mishandled
    options: [
      { text: 'Centralised admin with SSO and regular reviews', score: 3 },
      { text: 'Mix of approved and ad-hoc tools', score: 2 },
      { text: 'Individuals sign up freely', score: 1 },
      { text: "We don't know who's using what", score: 0 },
    ],
  },
  {
    id: 'q15',
    text: 'How frequently is your team formally trained or upskilled on AI tools and use cases?',
    type: 'radio',
    required: true,
    weight: 1, // Important but downstream of leadership decisions
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
    type: 'radio',
    required: true,
    weight: 3, // CRITICAL — the Leader-defining behaviour
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
    type: 'radio',
    required: true,
    weight: 2, // HIGH — quality and governance signal
    options: [
      { text: 'Playbooks, escalation paths, and audit logs', score: 3 },
      { text: 'Spot-checks on key workflows', score: 2 },
      { text: 'Ad hoc fixes by users', score: 1 },
      { text: 'We trust the tools / Not addressed', score: 0 },
    ],
  },
];

// Weighted max: Σ ( max_option_score × question_weight )
// With current weights: 27 weight-units × 3 max-points = 81
export const MAX_SCORE = SURVEY_QUESTIONS.filter(q => q.type === 'radio').reduce((acc, q) => {
  const maxOptionScore = Math.max(...(q.options?.map(o => o.score) || [0]));
  const weight = q.weight ?? 1;
  return acc + (maxOptionScore * weight);
}, 0);
