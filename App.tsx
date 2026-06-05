import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { SURVEY_QUESTIONS, MAX_SCORE } from './constants';
import { Answers, Question } from './types';
import { ProgressBar } from './components/ProgressBar';
import { QuestionCard } from './components/QuestionCard';
import { Results } from './components/Results';
import { captureAttributionFromUrl, pingQuizVisit } from './services/attribution';
import { track } from './services/analytics';

// Two flavors of the assessment live in the same app, differentiated only by
// URL path. /scaling-up is the partner edition (different GHL routing, direct
// Resend confirmation email — no MailerLite). Everything else is the default
// CAIO edition.
export type QuizSource = 'caio' | 'scaling-up';
const detectSource = (): QuizSource =>
  typeof window !== 'undefined' && window.location.pathname.startsWith('/scaling-up')
    ? 'scaling-up'
    : 'caio';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const source: QuizSource = useMemo(detectSource, []);
  const isScalingUp = source === 'scaling-up';

  // Capture UTM attribution once on mount and (if utm_source is present)
  // ping motherboard so we count the click. The capture persists in
  // sessionStorage so Results.tsx can pick it up at completion time.
  // Also fires the funnel-top PostHog events.
  useEffect(() => {
    const attribution = captureAttributionFromUrl();
    track('quiz_landing_viewed', { source, utm_source: attribution.utmSource, utm_campaign: attribution.utmCampaign });
    track('quiz_started', { source });
    if (attribution.utmSource) {
      void pingQuizVisit(attribution);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnswerChange = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
    track('quiz_question_answered', { questionId: id, source });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleNext = () => {
    if (currentStep < SURVEY_QUESTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const calculateScore = useCallback(() => {
    // Weighted sum: each selected option's score is multiplied by the
    // question's weight (1x, 2x, or 3x). Questions without an explicit
    // weight default to 1. See constants.ts for the rubric rationale.
    let totalScore = 0;
    SURVEY_QUESTIONS.forEach(question => {
      if (question.type === 'radio') {
        const answer = answers[question.id];
        if (answer) {
          const option = question.options?.find(opt => opt.text === answer);
          if (option) {
            const weight = question.weight ?? 1;
            totalScore += option.score * weight;
          }
        }
      }
    });
    return totalScore;
  }, [answers]);


  const handleSubmit = () => {
    const finalScore = calculateScore();
    setScore(finalScore);
    setShowResults(true);
    const pct = MAX_SCORE > 0 ? (finalScore / MAX_SCORE) * 100 : 0;
    const tier = pct > 75 ? 'Leader' : pct > 40 ? 'Adopter' : 'Explorer';
    track('quiz_completed', { source, score: finalScore, maxScore: MAX_SCORE, tier, pct: Math.round(pct) });
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResults(false);
    setScore(0);
    track('quiz_restarted', { source });
  }

  const currentQuestion: Question = SURVEY_QUESTIONS[currentStep];

  const renderHeader = () => (
    <div className="text-center mb-12 max-w-3xl mx-auto">
      <img
        src="/logo.png"
        alt="ChiefAIOfficer.com in partnership with Scaling Up"
        className="mx-auto mb-10 h-9 sm:h-10 w-auto opacity-90"
      />
      {isScalingUp && (
        <div className="inline-flex items-center gap-2 mb-6 px-3.5 py-1.5 rounded-full border border-indigo-400/25 bg-indigo-400/[0.06]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-indigo-400" style={{ boxShadow: '0 0 10px rgba(129,140,248,0.7)' }}></span>
          <span className="kicker text-indigo-200">For the Scaling Up Community</span>
        </div>
      )}
      <h1 className="display-1">
        {isScalingUp ? 'AI Readiness Assessment' : 'Practical AI Assessment'}
      </h1>
      <p className="lead mt-5 max-w-xl mx-auto">
        {isScalingUp ? (
          <>
            An <span className="accent-italic">exclusive</span> 3-minute diagnostic for Scaling Up members. Get a personalised report — and a clear next step — instantly.
          </>
        ) : (
          <>A 3-minute diagnostic of where your organisation actually stands on AI — mapped to the businesses pulling ahead.</>
        )}
      </p>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-16">
      <main className="w-full">
        {showResults ? (
          <Results score={score} maxScore={MAX_SCORE} answers={answers} onRestart={handleRestart} source={source} />
        ) : (
          <div className="w-full max-w-2xl mx-auto">
            {renderHeader()}
            <ProgressBar current={currentStep} total={SURVEY_QUESTIONS.length} />
            <QuestionCard
              key={currentQuestion.id}
              question={currentQuestion}
              value={answers[currentQuestion.id] || ''}
              onChange={handleAnswerChange}
              onNext={handleNext}
              onPrev={handlePrev}
              onSubmit={handleSubmit}
              isFirst={currentStep === 0}
              isLast={currentStep === SURVEY_QUESTIONS.length - 1}
              questionNumber={currentStep + 1}
              totalQuestions={SURVEY_QUESTIONS.length}
            />
          </div>
        )}
      </main>
      <Analytics />
    </div>
  );
};

export default App;
