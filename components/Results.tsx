import React, { useState, useEffect } from 'react';
import { getAIAssessment } from '../services/claudeService';
import { Answers } from '../types';

interface ResultsProps {
  score: number;
  maxScore: number;
  answers: Answers;
  onRestart: () => void;
}

const ScoreGauge: React.FC<{ score: number; maxScore: number }> = ({ score, maxScore }) => {
    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const circumference = 2 * Math.PI * 55; // 2 * pi * r
    const strokeDashoffset = circumference - (percentage / 100) * circumference;

    let tier = 'Explorer';
    let color = 'text-yellow-400';
    if (percentage > 75) {
        tier = 'Leader';
        color = 'text-green-400';
    } else if (percentage > 40) {
        tier = 'Adopter';
        color = 'text-blue-400';
    }

    return (
        <div className="relative flex flex-col items-center justify-center">
            <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="55" strokeWidth="10" className="text-gray-700" stroke="currentColor" fill="transparent" />
                <circle
                    cx="60"
                    cy="60"
                    r="55"
                    strokeWidth="10"
                    className={`${color} transition-all duration-1000 ease-out`}
                    stroke="currentColor"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                />
            </svg>
            <div className="absolute flex flex-col items-center">
                <span className="text-4xl font-extrabold text-white">{score}</span>
                <span className="text-sm text-gray-400">out of {maxScore}</span>
            </div>
            <div className={`mt-4 text-2xl font-bold ${color}`}>{tier}</div>
        </div>
    );
};

const LoadingSpinner: React.FC<{text?: string}> = ({text = "Generating your analysis..."}) => (
    <div className="flex flex-col justify-center items-center p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500 mb-4"></div>
        <p className="text-gray-300">{text}</p>
    </div>
);

const ReportRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
    if (!markdown) return null;

    // Split into sections by the markdown header. Filter out any empty strings.
    const sections = markdown.split('### ').filter(s => s.trim());

    return (
        <div className="space-y-6">
            {sections.map((section, index) => {
                const lines = section.trim().split('\n');
                const title = lines[0];
                const contentLines = lines.slice(1).filter(l => l.trim());
                const content = contentLines.join('\n');
                
                const isNumberedList = /^\s*\d+\./m.test(content);

                return (
                    <div key={index}>
                        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
                        {isNumberedList ? (
                            <ol className="list-decimal list-inside space-y-2 pl-2 text-gray-300">
                                {contentLines.map((item, i) => (
                                    <li key={i} dangerouslySetInnerHTML={{ __html: item.replace(/^\s*\d+\.\s*/, '').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                                ))}
                            </ol>
                        ) : (
                            <p className="text-gray-300" dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br />') }} />
                        )}
                    </div>
                );
            })}
        </div>
    );
};


export const Results: React.FC<ResultsProps> = ({ score, maxScore, answers, onRestart }) => {
  const [fullReport, setFullReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [showForm, setShowForm] = useState<boolean>(false);
  const [reportUnlocked, setReportUnlocked] = useState<boolean>(false);
  const [pdfUrl, setPdfUrl] = useState<string>('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await getAIAssessment(score, maxScore, answers, (text) => {
          setFullReport(text);
          setIsLoading(false);
        });
        setFullReport(result);
      } catch (e: any) {
        setError(e.message || "An unexpected error occurred while generating your report.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAssessment();
  }, [score, maxScore, answers]);

  const handleUnlockReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, score, maxScore, fullReport }),
      });
      const data = await res.json();
      if (data.pdfUrl) setPdfUrl(data.pdfUrl);
    } catch (error) {
      console.error('Capture error:', error);
    } finally {
      setReportUnlocked(true);
      setIsSubmitting(false);
    }
  };

  
  const getTeaser = (report: string) => {
      if (!report) return '';
      const sections = report.split('###');
      // The first element is empty string before the first '###', the second is the first section.
      return sections.length > 1 ? `### ${sections[1]}`.trim() : report;
  };
  
  const renderContent = () => {
      if (isLoading) {
          return <LoadingSpinner />;
      }
      if (error) {
          return <p className="text-red-400 mt-4 text-center">{error}</p>;
      }
      if (reportUnlocked) {
           return (
            <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 rounded-lg px-4 py-3 animate-fade-in">
                    <span className="text-green-400 text-lg">✓</span>
                    <p className="text-green-300 text-sm">Thanks, <strong>{name}</strong>! Your report is below and a copy is on its way to <strong>{email}</strong>.</p>
                </div>
                {pdfUrl && (
                    <a
                        href={pdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition shadow-lg shadow-indigo-600/20 animate-fade-in"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                        </svg>
                        Download Your Report (PDF)
                    </a>
                )}
                <div className="text-left bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                    <h3 className="text-2xl font-bold text-white mb-4">Your Personalized Feedback</h3>
                    <ReportRenderer markdown={fullReport} />
                </div>
            </div>
           );
      }

      return (
         <>
            <div className="mt-8 text-left bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-xl font-bold text-white mb-2">Your Analysis Preview</h3>
                 <ReportRenderer markdown={getTeaser(fullReport)} />
            </div>

            {!showForm ? (
                <div className="mt-8 text-center">
                    <button
                        onClick={() => setShowForm(true)}
                        className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 transition shadow-lg shadow-indigo-600/20"
                    >
                        Read My Full Report
                    </button>
                </div>
            ) : (
                <div className="mt-8 p-6 rounded-lg border border-dashed border-indigo-500 bg-indigo-900/20 animate-fade-in">
                    <h3 className="text-2xl font-bold text-white text-center">Unlock Your Full Report</h3>
                    <p className="text-gray-400 mt-2 text-center">Enter your details to view your actionable recommendations.</p>
                    
                    <form onSubmit={handleUnlockReport} className="mt-6 space-y-4 max-w-md mx-auto">
                        <div>
                            <label htmlFor="name" className="sr-only">Full Name</label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                autoComplete="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                className="block w-full bg-gray-800 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="Full Name"
                            />
                        </div>
                        <div>
                            <label htmlFor="email" className="sr-only">Email Address</label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="block w-full bg-gray-800 border border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                placeholder="Email Address"
                            />
                        </div>
                        <div className="flex justify-center pt-2">
                            <button
                                type="submit"
                                disabled={!name || !email || isSubmitting}
                                className="w-full sm:w-auto px-8 py-3 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/20"
                            >
                                {isSubmitting ? 'Generating your PDF...' : 'Get My Full Report & PDF'}
                            </button>
                        </div>
                    </form>

                </div>
            )}
        </>
      );
  }

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Your AI Readiness Score</h2>
          <p className="text-gray-400 mt-2">You've completed the assessment. Here's how you scored.</p>
          <div className="my-8">
            <ScoreGauge score={score} maxScore={maxScore} />
          </div>
        </div>

        {renderContent()}

        <div className="mt-10 border-t border-gray-700 pt-6 text-center">
          <button
            onClick={onRestart}
            className="text-indigo-400 hover:text-indigo-300 transition"
          >
            Take the assessment again
          </button>
        </div>
      </div>
    </div>
  );
};