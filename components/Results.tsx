import React, { useState } from 'react';
import { getAIAssessment } from '../services/claudeService';
import { readAttribution } from '../services/attribution';
import { Answers } from '../types';

interface ResultsProps {
  score: number;
  maxScore: number;
  answers: Answers;
  onRestart: () => void;
  /**
   * Which edition of the assessment this submission came from.
   * Drives backend behaviour in /api/capture (which GHL webhook, whether
   * MailerLite is used, whether Resend sends the confirmation email).
   */
  source?: 'caio' | 'scaling-up';
}

const ROLES = [
  'CEO / Founder',
  'C-Suite Executive (COO, CMO, CFO…)',
  'VP / Director',
  'Manager / Team Lead',
  'IT / Technology Lead',
  'Consultant / Advisor',
  'Other',
];

const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Financial Services',
  'Retail / E-commerce',
  'Manufacturing',
  'Professional Services',
  'Education',
  'Non-Profit',
  'Government',
  'Other',
];

const COMPANY_SIZES = [
  '1–10 employees',
  '11–50 employees',
  '51–200 employees',
  '201–1,000 employees',
  '1,000+ employees',
];

const PRIMARY_GOALS = [
  'Cut costs and increase efficiency',
  'Increase team productivity',
  'Build AI-powered products or services',
  'Stay ahead of competitors',
  'Comply with AI regulations',
  'Improve customer experience',
  'Other',
];

const BIGGEST_CHALLENGES = [
  'Not sure where to start',
  'Upskilling our team',
  'AI governance & policy',
  'Justifying budget / proving ROI',
  'Integrating AI with existing systems',
  'Getting executive buy-in',
  'Data quality & readiness',
  'Other',
];

// ─── Tier config ──────────────────────────────────────────────────────────────
function getTierConfig(percentage: number) {
  if (percentage > 75) return {
    tier: 'Leader',
    color: 'text-green-400',
    stroke: '#4ade80',
    badge: 'bg-green-900/50 border-green-600 text-green-300',
    description: 'Your organisation is operating at the frontier of AI adoption. You have strong foundations, active use cases, and strategic intent. The focus now is on scaling, governing, and compounding your advantage — before competitors close the gap.',
  };
  if (percentage > 40) return {
    tier: 'Adopter',
    color: 'text-blue-400',
    stroke: '#60a5fa',
    badge: 'bg-blue-900/50 border-blue-600 text-blue-300',
    description: 'You\'re making meaningful progress with AI but there are critical gaps holding back real business impact. The difference between an Adopter and a Leader is strategy, governance, and execution — all of which can be addressed with the right roadmap.',
  };
  return {
    tier: 'Explorer',
    color: 'text-yellow-400',
    stroke: '#facc15',
    badge: 'bg-yellow-900/50 border-yellow-600 text-yellow-300',
    description: 'Your organisation is at the starting line of its AI journey. This is actually an advantage: you can avoid the costly mistakes early adopters made and build AI into your strategy the right way from the ground up. The time to act is now.',
  };
}

// ─── Score gauge ──────────────────────────────────────────────────────────────
const ScoreGauge: React.FC<{ score: number; maxScore: number }> = ({ score, maxScore }) => {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const circumference = 2 * Math.PI * 55;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const { tier, color, stroke } = getTierConfig(percentage);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-40 h-40">
        <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="55" strokeWidth="10" className="text-gray-700" stroke="currentColor" fill="transparent" />
          <circle
            cx="60" cy="60" r="55" strokeWidth="10"
            stroke={stroke} fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        {/* Centering trick: only the score number lives inside the centred container,
            so its visual centre lands on the circle's geometric centre.
            "out of N" is absolutely positioned just below via top-full so it
            doesn't shift the score upward. */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="block text-4xl font-extrabold text-white leading-none text-center">{score}</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 whitespace-nowrap text-xs text-gray-400 leading-none">out of {maxScore}</span>
        </div>
      </div>
      <div className={`mt-4 text-2xl font-bold ${color}`}>{tier}</div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const inputCls = 'block w-full bg-gray-800 border border-gray-600 rounded-md p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition placeholder-gray-500';
const selectCls = `${inputCls} appearance-none`;

const ReportRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  if (!markdown) return null;
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

// ─── Streaming progress indicator ────────────────────────────────────────────
const GeneratingIndicator: React.FC<{ streamedText: string }> = ({ streamedText }) => (
  <div className="mt-8 space-y-6 animate-fade-in">
    <div className="flex items-center gap-3 bg-indigo-900/30 border border-indigo-700 rounded-lg px-4 py-3">
      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-indigo-400 flex-shrink-0" />
      <p className="text-indigo-300 text-sm font-medium">
        {streamedText ? 'Crafting your personalised assessment…' : 'Analysing your responses…'}
      </p>
    </div>
    {streamedText && (
      <div className="text-left bg-gray-900/50 p-6 rounded-lg border border-gray-700">
        <ReportRenderer markdown={streamedText} />
        <span className="inline-block w-2 h-4 bg-indigo-400 animate-pulse ml-1 align-middle" />
      </div>
    )}
  </div>
);

// ─── Main component ───────────────────────────────────────────────────────────
type Phase = 'form' | 'generating' | 'complete';

export const Results: React.FC<ResultsProps> = ({ score, maxScore, answers, onRestart, source = 'caio' }) => {
  const [phase, setPhase] = useState<Phase>('form');
  const [streamedReport, setStreamedReport] = useState('');
  const [pdfUrl, setPdfUrl]               = useState('');
  const [error, setError]                 = useState('');

  // Contact fields
  const [name, setName]                   = useState('');
  const [email, setEmail]                 = useState('');
  const [company, setCompany]             = useState('');
  const [role, setRole]                   = useState('');
  const [industry, setIndustry]           = useState('');
  const [companySize, setCompanySize]     = useState('');

  // Personalisation fields
  const [primaryGoals, setPrimaryGoals]       = useState<string[]>([]);
  const [biggestChallenge, setBiggestChallenge] = useState('');
  const [aiTools, setAiTools]                 = useState('');

  const togglePrimaryGoal = (goal: string) => {
    setPrimaryGoals(prev => prev.includes(goal) ? prev.filter(g => g !== goal) : [...prev, goal]);
  };

  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const { tier, badge, description } = getTierConfig(percentage);

  const handleUnlockReport = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!name || !email) return;

    setPhase('generating');
    setError('');

    const context = {
      company, role, industry, companySize,
      primaryGoal: primaryGoals.join(', '),
      biggestChallenge,
      aiTools,
    };

    let fullReport = '';
    try {
      fullReport = await getAIAssessment(score, maxScore, answers, (text) => {
        setStreamedReport(text);
      }, context);
      setStreamedReport(fullReport);
    } catch (e: any) {
      setError(e.message || 'Failed to generate your report. Please try again.');
      setPhase('form');
      return;
    }

    // Capture lead + generate PDF
    try {
      const attribution = readAttribution();
      const res = await fetch('/api/capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, score, maxScore, fullReport,
          company, role, industry, companySize,
          // Forward attribution captured on entry (utm_source, utm_campaign, etc).
          // Surfaces on the GHL contact + motherboard campaign so we can tell
          // which marketing channel/email actually delivered the lead.
          attribution,
          // Which edition the submission came from. The backend uses this to
          // pick the right GHL webhook, skip MailerLite for partner editions,
          // and send the confirmation email directly via Resend instead.
          source,
        }),
      });
      const data = await res.json();
      if (data.pdfUrl) setPdfUrl(data.pdfUrl);
    } catch (err) {
      console.error('Capture error:', err);
    }

    setPhase('complete');
  };

  const renderContent = () => {
    if (phase === 'generating') {
      return <GeneratingIndicator streamedText={streamedReport} />;
    }

    if (phase === 'complete') {
      return (
        <div className="mt-8 space-y-4 animate-fade-in">
          <div className="flex items-center gap-3 bg-green-900/30 border border-green-700 rounded-lg px-4 py-3">
            <span className="text-green-400 text-lg flex-shrink-0">✓</span>
            <p className="text-green-300 text-sm">
              Thanks, <strong>{name}</strong>! Your report is below and a copy is on its way to <strong>{email}</strong>.
            </p>
          </div>

          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-3 px-6 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition shadow-lg shadow-indigo-600/20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Download Your Report (PDF)
            </a>
          )}

          <div className="text-left bg-gray-900/50 p-6 rounded-lg border border-gray-700">
            <h3 className="text-2xl font-bold text-white mb-4">Your Personalised Assessment</h3>
            <ReportRenderer markdown={streamedReport} />
          </div>
        </div>
      );
    }

    // Phase: 'form'
    return (
      <div className="mt-8 p-6 rounded-lg border border-dashed border-indigo-500 bg-indigo-900/20 animate-fade-in">
        <h3 className="text-2xl font-bold text-white text-center">Unlock Your Results</h3>
        <p className="text-gray-400 mt-2 text-center text-sm">
          Your AI Readiness Score, tier, and a personalised PDF report — emailed to you instantly.
        </p>

        {error && (
          <div className="mt-4 px-4 py-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleUnlockReport} className="mt-6 max-w-lg mx-auto">

          {/* ═══ TIER 1: Quick report (only required fields) ═══ */}
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs text-gray-400 mb-1">Full Name <span className="text-indigo-400">*</span></label>
              <input
                type="text" id="name" name="name" autoComplete="name" required
                value={name} onChange={e => setName(e.target.value)}
                className={inputCls} placeholder="Jane Smith"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs text-gray-400 mb-1">Work Email <span className="text-indigo-400">*</span></label>
              <input
                type="email" id="email" name="email" autoComplete="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                className={inputCls} placeholder="jane@acmecorp.com"
              />
            </div>
            <button
              type="submit"
              disabled={!name || !email}
              className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/20"
            >
              Generate My Report
            </button>
          </div>

          {/* ═══ Divider ═══ */}
          <div className="my-8 flex items-center gap-3">
            <div className="flex-1 border-t border-gray-700" />
            <span className="text-[10px] text-gray-500 uppercase tracking-widest whitespace-nowrap">Or get a more personalised report</span>
            <div className="flex-1 border-t border-gray-700" />
          </div>

          {/* ═══ TIER 2: Comprehensive report (all optional) ═══ */}
          <div className="space-y-4">
            <p className="text-xs text-gray-400 -mt-1">
              Share a bit more about your context and we'll generate a deeply tailored report with industry-specific recommendations. All fields below are optional.
            </p>

            {/* Row: Role (its own row) */}
            <div>
              <label htmlFor="role" className="block text-xs text-gray-400 mb-1">Your Role</label>
              <select id="role" value={role} onChange={e => setRole(e.target.value)} className={selectCls}>
                <option value="">Select your role…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Row: Company + Industry + Company Size (3 across) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label htmlFor="company" className="block text-xs text-gray-400 mb-1">Company</label>
                <input
                  type="text" id="company" name="organization" autoComplete="organization"
                  value={company} onChange={e => setCompany(e.target.value)}
                  className={inputCls} placeholder="Acme Corp"
                />
              </div>
              <div>
                <label htmlFor="industry" className="block text-xs text-gray-400 mb-1">Industry</label>
                <select id="industry" value={industry} onChange={e => setIndustry(e.target.value)} className={selectCls}>
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="companySize" className="block text-xs text-gray-400 mb-1">Company Size</label>
                <select id="companySize" value={companySize} onChange={e => setCompanySize(e.target.value)} className={selectCls}>
                  <option value="">Select size…</option>
                  {COMPANY_SIZES.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                </select>
              </div>
            </div>

            {/* Primary Goals — multi-select */}
            <div>
              <label className="block text-xs text-gray-400 mb-2">
                What are your primary AI goals right now? <span className="text-gray-500">(select all that apply)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRIMARY_GOALS.map(g => {
                  const checked = primaryGoals.includes(g);
                  return (
                    <label
                      key={g}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md border cursor-pointer transition text-sm ${
                        checked
                          ? 'bg-indigo-900/40 border-indigo-500 text-white'
                          : 'bg-gray-800 border-gray-600 text-gray-200 hover:border-gray-500'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePrimaryGoal(g)}
                        className="w-4 h-4 accent-indigo-500 flex-shrink-0"
                      />
                      <span>{g}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Biggest Challenge */}
            <div>
              <label htmlFor="biggestChallenge" className="block text-xs text-gray-400 mb-1">What's your biggest challenge with AI right now?</label>
              <select id="biggestChallenge" value={biggestChallenge} onChange={e => setBiggestChallenge(e.target.value)} className={selectCls}>
                <option value="">Select a challenge…</option>
                {BIGGEST_CHALLENGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* AI Tools */}
            <div>
              <label htmlFor="aiTools" className="block text-xs text-gray-400 mb-1">AI tools you're currently using (if any)</label>
              <textarea
                id="aiTools"
                value={aiTools}
                onChange={e => setAiTools(e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
                placeholder="e.g. ChatGPT, Copilot, Midjourney, custom LLM…"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={!name || !email}
                className="w-full py-3 px-6 bg-indigo-600 text-white font-semibold rounded-md hover:bg-indigo-500 disabled:bg-indigo-800 disabled:text-gray-400 disabled:cursor-not-allowed transition shadow-lg shadow-indigo-600/20"
              >
                Generate My Personalised Report
              </button>
            </div>
          </div>

          <p className="text-center text-xs text-gray-500 mt-4">
            No spam. Just your report and one follow-up from our team.
          </p>
        </form>
      </div>
    );
  };

  // Score + tier are gated until the lead submits the email form. This
  // lifts conversion (people can't peek + bounce) and matches typical
  // lead-magnet best practice. In phase='form' we show a generic
  // completion headline; the actual score gauge + tier reveal only
  // appear once we're past the form (generating or complete).
  const scoreUnlocked = phase !== 'form';

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 animate-fade-in">
      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl p-6 sm:p-8 shadow-2xl">

        {/* Header — copy + visual change depending on whether the score has been unlocked */}
        <div className="text-center">
          {scoreUnlocked ? (
            <>
              <h2 className="text-3xl font-bold text-white">Your AI Readiness Score</h2>
              <p className="text-gray-400 mt-2">You've completed the assessment. Here's where you stand.</p>
              <div className="my-8">
                <ScoreGauge score={score} maxScore={maxScore} />
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-indigo-500/20 ring-2 ring-indigo-500/40">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-5 text-3xl font-bold text-white">Assessment complete</h2>
              <p className="text-gray-400 mt-2 max-w-md mx-auto">
                Enter your details below to unlock your AI Readiness Score, tier, and a personalised report delivered straight to your inbox.
              </p>
            </>
          )}
        </div>

        {/* Tier description — also gated until unlock */}
        {scoreUnlocked && (
          <div className={`rounded-lg border px-5 py-4 text-sm leading-relaxed ${badge}`}>
            <span className="font-semibold block mb-1">{tier} — What this means</span>
            {description}
          </div>
        )}

        {renderContent()}

        <div className="mt-10 border-t border-gray-700 pt-6 text-center">
          <button onClick={onRestart} className="text-indigo-400 hover:text-indigo-300 transition text-sm">
            Take the assessment again
          </button>
        </div>
      </div>
    </div>
  );
};
