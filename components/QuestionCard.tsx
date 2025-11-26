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

    // Automatically advance after a short delay to show the selection feedback
    setTimeout(() => {
      if (isLast) {
        onSubmit();
      } else {
        onNext();
      }
    }, 300);
  };

  const renderInput = () => {
    switch (question.type) {
      case 'text':
        return (
          <input
            type={question.id === 'email' ? 'email' : 'text'}
            value={value || ''}
            onChange={(e) => onChange(question.id, e.target.value)}
            className="mt-4 w-full bg-gray-800 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
            placeholder={`Your ${question.text.toLowerCase()}`}
          />
        );
      case 'radio':
        return (
          <div className="mt-4 space-y-3">
            {question.options?.map((option, index) => (
              <label
                key={index}
                className={`flex items-center p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                  value === option.text
                    ? 'bg-indigo-900/50 border-indigo-500'
                    : 'bg-gray-800 border-gray-700 hover:bg-gray-700'
                }`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.text}
                  checked={value === option.text}
                  onChange={() => handleRadioChange(option.text)}
                  className="hidden"
                />
                <span className="flex-1 text-gray-200">{option.text}</span>
                <div className={`w-5 h-5 rounded-full border-2 ${value === option.text ? 'border-indigo-400 bg-indigo-500' : 'border-gray-500'}`}></div>
              </label>
            ))}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl w-full max-w-2xl animate-fade-in">
      <div className="flex justify-between items-center text-sm text-gray-400">
        <span>Question {questionNumber} of {totalQuestions}</span>
        {question.required && <span className="text-red-400">* Required</span>}
      </div>
      <h2 className="text-2xl font-bold mt-4 text-gray-100">{question.text}</h2>
      {question.description && <p className="text-gray-400 mt-1">{question.description}</p>}
      
      <div className="mt-6">{renderInput()}</div>

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={onPrev}
          disabled={isFirst}
          className="px-6 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          Back
        </button>
        {question.type !== 'radio' && (
          isLast ? (
            <button
              onClick={onSubmit}
              disabled={!isAnswered}
              className="px-8 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/20"
            >
              Submit
            </button>
          ) : (
            <button
              onClick={onNext}
              disabled={!isAnswered}
              className="px-8 py-2 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/20"
            >
              Next
            </button>
          )
        )}
      </div>
    </div>
  );
};