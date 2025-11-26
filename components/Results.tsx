import React, { useState, useEffect } from 'react';
import { getAIAssessment } from '../services/geminiService';
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
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAssessment = async () => {
      setIsLoading(true);
      setError('');
      try {
        const result = await getAIAssessment(score, maxScore, answers);
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
      // Prepare data for GHL
      const contactData = {
        name,
        email,
        // Custom fields for GHL
        customFields: {
          aiReadinessScore: score,
          maxScore: maxScore,
          assessmentDate: new Date().toISOString(),
          scorePercentage: Math.round((score / maxScore) * 100)
        },
        // Optional: Add tags in GHL
        tags: ['AI Assessment Completed']
      };

      // Send to GHL webhook
      const response = await fetch('https://services.leadconnectorhq.com/hooks/FgaFLGYrbGZSBVprTkhR/webhook-trigger/elWtYyahvdVemgjf2SBn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactData),
      });

      if (response.ok) {
        console.log('✅ Contact added to GHL successfully!');
        setReportUnlocked(true);
      } else {
        console.error('⚠️ Failed to add contact to GHL, but unlocking report anyway');
        setReportUnlocked(true);
      }
    } catch (error) {
      console.error('❌ Error sending to GHL:', error);
      setReportUnlocked(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestStatus('loading');
    try {
      const testData = {
        name: "Test Webhook",
        email: "test@example.com",
        customFields: {
          aiReadinessScore: Math.round(maxScore / 2),
          maxScore: maxScore,
          assessmentDate: new Date().toISOString(),
          scorePercentage: 50,
        },
        tags: ['AI Assessment Completed', 'TEST_DATA']
      };

      const response = await fetch('https://services.leadconnectorhq.com/hooks/FgaFLGYrbGZSBVprTkhR/webhook-trigger/elWtYyahvdVemgjf2SBn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
      });

      if (response.ok) {
        setTestStatus('success');
      } else {
        setTestStatus('error');
      }
    } catch (error) {
      console.error('❌ Error sending test webhook:', error);
      setTestStatus('error');
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
            <div className="mt-8 text-left bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                <h3 className="text-2xl font-bold text-white mb-4">Your Personalized Feedback</h3>
                <ReportRenderer markdown={fullReport} />
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
                                {isSubmitting ? 'Unlocking...' : 'Get My Full Report'}
                            </button>
                        </div>
                    </form>

                    <div className="text-center my-4 border-t border-gray-700 py-4 max-w-md mx-auto mt-8">
                        <p className="text-sm text-gray-400 mb-2">Need to verify your webhook? Send a test request.</p>
                        <button
                            type="button"
                            onClick={handleTestWebhook}
                            disabled={testStatus === 'loading'}
                            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait transition text-sm font-semibold"
                        >
                            {testStatus === 'loading' ? 'Sending...' : 'Send Test Webhook'}
                        </button>
                        {testStatus === 'success' && <p className="text-green-400 text-sm mt-2 animate-fade-in">✅ Test webhook sent successfully!</p>}
                        {testStatus === 'error' && <p className="text-red-400 text-sm mt-2 animate-fade-in">❌ Failed to send test webhook. Check console for details.</p>}
                    </div>
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