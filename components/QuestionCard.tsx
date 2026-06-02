import React from 'react';
import { Question } from '../types';

interface QuestionCardProps {
  question: Question;
  value: string;
  onChange: (id: string, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onSubmit: () => void;
  isFirst: boolean;
  isLast: boolean;
  questionNumber: number;
  totalQuestions: number;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  value,
  onChange,
  onNext,
  onPrev,
  onSubmit,
  isFirst,
  isLast,
  questionNumber,
  totalQuestions,
}) => {
  const isAnswered = question.required ? !!value : true;

  const handleRadioChange = (newValue: string) => {
    onChange(question.id, newValue);
    // Brief pause so the selection state is visible before we advance.
    setTimeout(() => {
      if (isLast) onSubmit();
      else onNext();
    }, 320);
  };

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type={question.id === 'email' ? 'email' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(question.id, e.target.value)}
            className="input-premium mt-5 w-full"
            placeholder={`Your ${question.text.toLowerCase()}`}
          />
        );

      case 'radio':
        return (
          <div className="mt-6 space-y-2.5" role="radiogroup" aria-label={question.text}>
            {question.options?.map((option, index) => {
              const selected = value === option.text;
              return (
                <label
                  key={index}
                  className={`option-card flex items-center gap-4 px-5 py-4 ${selected ? 'is-selected' : ''}`}
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.text}
                    checked={selected}
                    onChange={() => handleRadioChange(option.text)}
                    className="sr-only"
                  />
                  <span
                    className={`flex-1 text-[15px] leading-snug transition-colors ${
                      selected ? 'text-white font-medium' : 'text-slate-300'
                    }`}
                  >
                    {option.text}
                  </span>
                  <span className="indicator" aria-hidden="true" />
                </label>
              );
            })}
          </div>
        );

      default:
        return null;
    }
  };

  // Replace the legacy "Mark only one oval." Google-Forms-ism with something
  // that actually helps the respondent — and only when the question doesn't
  // already carry its own description.
  const showHelper =
    question.type === 'radio' && !question.description;

  return (
    <div className="card-premium p-7 sm:p-10 w-full max-w-2xl mx-auto animate-fade-in">
      {/* Header row — numbered kicker + Required indicator */}
      <div className="flex justify-between items-center mb-6">
        <span className="kicker text-slate-500 tabular">
          Question {String(questionNumber).padStart(2, '0')}
          <span className="text-slate-600"> / {String(totalQuestions).padStart(2, '0')}</span>
        </span>
        {question.required && (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            <span className="inline-block w-1 h-1 rounded-full bg-rose-400" />
            Required
          </span>
        )}
      </div>

      {/* Question */}
      <h2 className="text-[22px] sm:text-[26px] font-semibold leading-tight tracking-tight text-white">
        {question.text}
      </h2>
      {question.description && (
        <p className="mt-3 text-[15px] leading-relaxed text-slate-400">
          {question.description}
        </p>
      )}
      {showHelper && (
        <p className="mt-3 text-[13px] text-slate-500">
          Choose the option that best describes your situation.
        </p>
      )}

      <div className="mt-2">{renderInput()}</div>

      {/* Navigation */}
      <div className="mt-10 flex justify-between items-center">
        <button onClick={onPrev} disabled={isFirst} className="btn-ghost inline-flex items-center gap-1.5">
          <span aria-hidden="true">←</span>
          <span>Back</span>
        </button>

        {/* Radio questions auto-advance on selection, so we only show a forward
            button for text inputs. */}
        {question.type !== 'radio' && (
          isLast ? (
            <button onClick={onSubmit} disabled={!isAnswered} className="btn-primary">
              See My Results
            </button>
          ) : (
            <button onClick={onNext} disabled={!isAnswered} className="btn-primary inline-flex items-center gap-1.5">
              <span>Continue</span>
              <span aria-hidden="true">→</span>
            </button>
          )
        )}
      </div>
    </div>
  );
};
