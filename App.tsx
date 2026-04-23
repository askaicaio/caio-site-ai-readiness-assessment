import React, { useState, useCallback } from 'react';
import { SURVEY_QUESTIONS, MAX_SCORE } from './constants';
import { Answers, Question } from './types';
import { ProgressBar } from './components/ProgressBar';
import { QuestionCard } from './components/QuestionCard';
import { Results } from './components/Results';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);

  const handleAnswerChange = useCallback((id: string, value: string) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
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
    let totalScore = 0;
    SURVEY_QUESTIONS.forEach(question => {
      if (question.type === 'radio') {
        const answer = answers[question.id];
        if (answer) {
          const option = question.options?.find(opt => opt.text === answer);
          if (option) {
            totalScore += option.score;
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
  };
  
  const handleRestart = () => {
    setCurrentStep(0);
    setAnswers({});
    setShowResults(false);
    setScore(0);
  }

  const currentQuestion: Question = SURVEY_QUESTIONS[currentStep];

  const renderHeader = () => (
    <div className="text-center mb-8 max-w-3xl mx-auto">
      <img src="/logo.png" alt="ChiefAIOfficer.com in partnership with Scaling Up" className="mx-auto mb-6 h-12 w-auto" />
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">
        Practical AI Assessment
      </h1>
      <p className="mt-4 text-lg text-gray-300">
        This brief assessment helps us tailor the session to your organization's AI journey.
      </p>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4 sm:p-6 transition-colors duration-500">
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <main className="w-full">
        {showResults ? (
          <Results score={score} maxScore={MAX_SCORE} answers={answers} onRestart={handleRestart} />
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
    </div>
  );
};

export default App;
