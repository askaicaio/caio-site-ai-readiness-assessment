import React, { useState } from 'react';
import { getAIAssessment } from '../services/claudeService';
import { readAttribution } from '../services/attribution';
import { track, identify } from '../services/analytics';
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
// Palette is restrained — refined emerald / indigo / amber instead of bright
// Tailwind defaults. `accent` is the strong colour for the gauge stroke and
// tier pill; `accentSoft` is used for the tier description's left border.
function getTierConfig(percentage: number) {
  if (percentage > 75) return {
    tier: 'Leader',
    accent: '#34d399',      // emerald-400
    accentSoft: 'rgba(52,211,153,0.35)',
    pillBg: 'rgba(52,211,153,0.12)',
    pillText: '#a7f3d0',
    description: 'Your organisation is operating at the frontier of AI adoption. You have strong foundations, active use cases, and strategic intent. The focus now is on scaling, governing, and compounding your advantage — before competitors close the gap.',
  };
  if (percentage > 40) return {
    tier: 'Adopter',
    accent: '#818cf8',      // indigo-400 — aligns with brand
    accentSoft: 'rgba(129,140,248,0.35)',
    pillBg: 'rgba(129,140,248,0.12)',
    pillText: '#c7d2fe',
    description: 'You\'re making meaningful progress with AI but there are critical gaps holding back real business impact. The difference between an Adopter and a Leader is strategy, governance, and execution — all of which can be addressed with the right roadmap.',
  };
  return {
    tier: 'Explorer',
    accent: '#fbbf24',      // amber-400 — warmer than the previous yellow
    accentSoft: 'rgba(251,191,36,0.35)',
    pillBg: 'rgba(251,191,36,0.12)',
    pillText: '#fde68a',
    description: 'Your organisation is at the starting line of its AI journey. This is actually an advantage: you can avoid the costly mistakes early adopters made and build AI into your strategy the right way from the ground up. The time to act is now.',
  };
}

// ─── Score gauge ──────────────────────────────────────────────────────────────
const ScoreGauge: React.FC<{ score: number; maxScore: number }> = ({ score, maxScore }) => {
  const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const circumference = 2 * Math.PI * 55;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const { tier, accent, pillBg, pillText } = getTierConfig(percentage);

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative w-44 h-44">
        <svg className="w-44 h-44 transform -rotate-90" viewBox="0 0 120 120">
          {/* Track */}
          <circle cx="60" cy="60" r="55" strokeWidth="8" stroke="rgba(255,255,255,0.07)" fill="transparent" />
          {/* Progress */}
          <circle
            cx="60" cy="60" r="55" strokeWidth="8"
            stroke={accent} fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transition: 'stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1)',
              filter: `drop-shadow(0 0 8px ${accent}55)`,
            }}
          />
        </svg>
        {/* Centred score number; "out of N" absolutely positioned beneath it
            so it doesn't shift the score upward. */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className="block text-[44px] font-semibold text-white leading-none text-center tabular tracking-tight">{score}</span>
          <span className="absolute left-1/2 -translate-x-1/2 top-full mt-2 whitespace-nowrap text-[11px] text-slate-400 leading-none tracking-wider uppercase">out of {maxScore}</span>
        </div>
      </div>
      {/* Tier pill */}
      <div
        className="mt-5 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border"
        style={{
          background: pillBg,
          borderColor: `${accent}40`,
          color: pillText,
        }}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
        <span className="kicker">{tier} Tier</span>
      </div>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Tight, consistent labels for every form field. Optional `required` shows a
// subtle indigo dot; `as` lets us swap to a non-label element when the label
// isn't tied to a single input (e.g. the multi-select goals group).
const FieldLabel: React.FC<{
  htmlFor?: string; required?: boolean; as?: 'label' | 'div'; children: React.ReactNode;
}> = ({ htmlFor, required, as = 'label', children }) => {
  const cls = 'flex items-center text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 mb-2';
  return as === 'label'
    ? <label htmlFor={htmlFor} className={cls}>
        <span>{children}</span>
        {required && <span className="ml-1.5 inline-block w-1 h-1 rounded-full bg-indigo-400" aria-hidden="true" />}
      </label>
    : <div className={cls}>{children}</div>;
};

// Both inputs and selects share the .input-premium styling defined in
// index.html. Selects get appearance-none + an inline SVG chevron so they
// stop looking like browser defaults.
const inputCls = 'input-premium block w-full';
const selectCls =
  `${inputCls} appearance-none pr-10 bg-no-repeat bg-[right_0.85rem_center] bg-[length:14px_14px] cursor-pointer ` +
  // chevron — light slate, embedded inline so we don't need an asset
  `bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")]`;

const ReportRenderer: React.FC<{ markdown: string }> = ({ markdown }) => {
  if (!markdown) return null;
  const sections = markdown.split('### ').filter(s => s.trim());
  return (
    <div className="space-y-7">
      {sections.map((section, index) => {
        const lines = section.trim().split('\n');
        const title = lines[0];
        const contentLines = lines.slice(1).filter(l => l.trim());
        const content = contentLines.join('\n');
        const isNumberedList = /^\s*\d+\./m.test(content);
        return (
          <div key={index}>
            <h3 className="text-[17px] font-semibold text-white mb-3 tracking-tight">{title}</h3>
            {isNumberedList ? (
              <ol className="space-y-2.5 text-[14.5px] leading-relaxed text-slate-300">
                {contentLines.map((item, i) => {
                  const cleanItem = item.replace(/^\s*\d+\.\s*/, '');
                  const num = (item.match(/^\s*(\d+)\./) || [])[1] || String(i + 1);
                  return (
                    <li key={i} className="flex gap-3">
                      <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-indigo-500/15 text-indigo-300 text-[11px] font-semibold tabular mt-0.5">{num}</span>
                      <span className="flex-1" dangerouslySetInnerHTML={{ __html: cleanItem.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>') }} />
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="text-[14.5px] leading-relaxed text-slate-300"
                 dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>').replace(/\n/g, '<br />') }} />
            )}
          </div>
        );
      })}
    </div>
  );
};

// ─── Streaming progress indicator ────────────────────────────────────────────
const GeneratingIndicator: React.FC<{ streamedText: string }> = ({ streamedText }) => (
  <div className="mt-8 space-y-5 animate-fade-in">
    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-indigo-400/20 bg-indigo-400/[0.06]">
      <span className="relative flex h-2 w-2 flex-shrink-0">
        <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-70 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-400" />
      </span>
      <p className="text-[13px] font-medium text-indigo-200 tracking-wide">
        {streamedText ? 'Crafting your personalised assessment…' : 'Analysing your responses…'}
      </p>
    </div>
    {streamedText && (
      <div
        className="text-left p-7 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <ReportRenderer markdown={streamedText} />
        <span className="inline-block w-[2px] h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
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
  const { tier, accent, accentSoft, description } = getTierConfig(percentage);

  const handleUnlockReport = async (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!name || !email) return;

    setPhase('generating');
    setError('');

    const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
    const tier = percentage > 75 ? 'Leader' : percentage > 40 ? 'Adopter' : 'Explorer';

    // Identify the user in PostHog and fire form-submit event before we kick
    // off the long-running report generation, so the event lands even if the
    // user navigates away while it streams.
    identify(email, { name, company, role, industry, companySize, source });
    track('quiz_form_submitted', {
      source, tier, score, maxScore,
      hasCompany: !!company, hasRole: !!role, hasIndustry: !!industry,
      hasCompanySize: !!companySize, hasPrimaryGoals: primaryGoals.length > 0,
      hasChallenge: !!biggestChallenge, hasAiTools: !!aiTools,
    });

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
      if (data.pdfUrl) {
        setPdfUrl(data.pdfUrl);
        track('quiz_report_delivered', { source, tier, hasPdf: true });
      }
    } catch (err) {
      console.error('Capture error:', err);
      track('quiz_report_delivered', { source, tier, hasPdf: false, error: true });
    }

    setPhase('complete');
  };

  const renderContent = () => {
    if (phase === 'generating') {
      return <GeneratingIndicator streamedText={streamedReport} />;
    }

    if (phase === 'complete') {
      return (
        <div className="mt-8 space-y-5 animate-fade-in">
          {/* Success confirmation — refined, subtler */}
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06]">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-400/15 mt-px flex-shrink-0">
              <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <p className="text-[13px] leading-relaxed text-emerald-100/90">
              Thanks, <span className="text-white font-medium">{name}</span>. Your report is below and a copy is on its way to <span className="text-white font-medium">{email}</span>.
            </p>
          </div>

          {/* Download CTA */}
          {pdfUrl && (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('quiz_report_downloaded', { source, tier })}
              className="btn-primary flex items-center justify-center gap-2 w-full"
            >
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <span>Download Your Report (PDF)</span>
            </a>
          )}

          {/* Report container */}
          <div
            className="text-left p-7 sm:p-8 rounded-2xl"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="mb-6 pb-5 border-b border-white/[0.06]">
              <span className="kicker text-slate-500">Your Personalised Assessment</span>
              <h3 className="display-2 mt-2">AI Readiness Report</h3>
            </div>
            <ReportRenderer markdown={streamedReport} />
          </div>

          {/* Next-step CTA — prominent booking ask after the user has read their report */}
          <div
            className="text-left p-7 sm:p-8 rounded-2xl relative overflow-hidden"
            style={{
              background:
                'linear-gradient(135deg, rgba(99,102,241,0.12), rgba(99,102,241,0.04))',
              border: '1px solid rgba(129,140,248,0.25)',
            }}
          >
            <div
              aria-hidden="true"
              className="absolute -top-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
              style={{ background: 'radial-gradient(circle, rgba(129,140,248,0.18), transparent 70%)' }}
            />
            <span className="kicker text-indigo-300 relative">Your Next Step</span>
            <h3 className="display-2 mt-2.5 relative">
              Turn this report into a <span className="accent-italic">plan</span>.
            </h3>
            <p className="lead mt-3 mb-6 max-w-md text-[15px] relative">
              Your AI Readiness Report tells you <em>where you stand</em>. A 30-minute Strategy Briefing with our team tells you <em>exactly what to do about it</em> — tailored to your business. Complimentary.
            </p>
            <a
              href="https://api.leadconnectorhq.com/widget/bookings/b2b-executive-briefing"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => track('quiz_booking_clicked', { source, tier })}
              className="btn-primary inline-flex items-center gap-2 relative"
            >
              <span>Book Your AI Strategy Briefing</span>
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </div>
      );
    }

    // Phase: 'form'
    return (
      <div className="mt-10 animate-fade-in">
        {/* Section heading */}
        <div className="text-center mb-7">
          <span className="kicker text-slate-500">Get Your Report</span>
          <h3 className="display-2 mt-2.5">Unlock your results</h3>
          <p className="lead mt-3 max-w-md mx-auto text-[15px]">
            Your AI Readiness Score, tier, and a personalised PDF report — emailed to you instantly.
          </p>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] text-[13px] text-rose-200">
            {error}
          </div>
        )}

        <form onSubmit={handleUnlockReport} className="max-w-xl mx-auto">

          {/* ═══ TIER 1: Quick report (only required fields) ═══ */}
          <div className="space-y-4">
            <FieldLabel htmlFor="name" required>Full Name</FieldLabel>
            <input
              type="text" id="name" name="name" autoComplete="name" required
              value={name} onChange={e => setName(e.target.value)}
              className={inputCls} placeholder="Jane Smith"
            />

            <FieldLabel htmlFor="email" required>Work Email</FieldLabel>
            <input
              type="email" id="email" name="email" autoComplete="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              className={inputCls} placeholder="jane@acmecorp.com"
            />

            <button
              type="submit"
              disabled={!name || !email}
              className="btn-primary w-full mt-1"
            >
              Generate My Report
            </button>
          </div>

          {/* ═══ Divider ═══ */}
          <div className="my-10 flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.08]" />
            <span className="kicker text-slate-500 whitespace-nowrap">Or — go deeper</span>
            <div className="flex-1 h-px bg-white/[0.08]" />
          </div>

          {/* ═══ TIER 2: Comprehensive report (all optional) ═══ */}
          <div className="space-y-5">
            <p className="text-[13.5px] leading-relaxed text-slate-400 text-center">
              Share a bit more about your context and we'll generate a deeply tailored report with industry-specific recommendations. <span className="text-slate-500">All fields below are optional.</span>
            </p>

            {/* Row: Role (its own row) */}
            <div>
              <FieldLabel htmlFor="role">Your Role</FieldLabel>
              <select id="role" value={role} onChange={e => setRole(e.target.value)} className={selectCls}>
                <option value="">Select your role…</option>
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Row: Company + Industry + Company Size (3 across) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <FieldLabel htmlFor="company">Company</FieldLabel>
                <input
                  type="text" id="company" name="organization" autoComplete="organization"
                  value={company} onChange={e => setCompany(e.target.value)}
                  className={inputCls} placeholder="Acme Corp"
                />
              </div>
              <div>
                <FieldLabel htmlFor="industry">Industry</FieldLabel>
                <select id="industry" value={industry} onChange={e => setIndustry(e.target.value)} className={selectCls}>
                  <option value="">Select industry…</option>
                  {INDUSTRIES.map(ind => <option key={ind} value={ind}>{ind}</option>)}
                </select>
              </div>
              <div>
                <FieldLabel htmlFor="companySize">Company Size</FieldLabel>
                <select id="companySize" value={companySize} onChange={e => setCompanySize(e.target.value)} className={selectCls}>
                  <option value="">Select size…</option>
                  {COMPANY_SIZES.map(sz => <option key={sz} value={sz}>{sz}</option>)}
                </select>
              </div>
            </div>

            {/* Primary Goals — multi-select using the option-card aesthetic */}
            <div>
              <FieldLabel as="div">
                <span>Primary AI goals right now</span>
                <span className="ml-2 text-slate-500 normal-case tracking-normal font-normal text-[11px]">select all that apply</span>
              </FieldLabel>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                {PRIMARY_GOALS.map(g => {
                  const checked = primaryGoals.includes(g);
                  return (
                    <label key={g} className={`option-card flex items-center gap-3 px-4 py-3 ${checked ? 'is-selected' : ''}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePrimaryGoal(g)}
                        className="sr-only"
                      />
                      <span className={`flex-shrink-0 w-[16px] h-[16px] rounded-[5px] border transition-all flex items-center justify-center ${
                        checked ? 'bg-indigo-500/30 border-indigo-300' : 'border-white/20'
                      }`}>
                        {checked && (
                          <svg className="w-2.5 h-2.5 text-indigo-200" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </span>
                      <span className={`text-[14px] ${checked ? 'text-white font-medium' : 'text-slate-300'}`}>{g}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Biggest Challenge */}
            <div>
              <FieldLabel htmlFor="biggestChallenge">Your biggest challenge with AI right now</FieldLabel>
              <select id="biggestChallenge" value={biggestChallenge} onChange={e => setBiggestChallenge(e.target.value)} className={selectCls}>
                <option value="">Select a challenge…</option>
                {BIGGEST_CHALLENGES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* AI Tools */}
            <div>
              <FieldLabel htmlFor="aiTools">AI tools you're currently using (if any)</FieldLabel>
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
                className="btn-primary w-full"
              >
                Generate My Personalised Report
              </button>
            </div>
          </div>

          <p className="text-center text-[11.5px] text-slate-500 mt-5 leading-relaxed">
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
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 animate-fade-in">
      <div className="card-premium p-7 sm:p-10">

        {/* Header — copy + visual change depending on whether the score has been unlocked */}
        <div className="text-center">
          {scoreUnlocked ? (
            <>
              <span className="kicker text-slate-500">Your AI Readiness</span>
              <h2 className="display-2 mt-2.5">Here's where you stand</h2>
              <div className="my-9">
                <ScoreGauge score={score} maxScore={maxScore} />
              </div>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-400/15 ring-1 ring-indigo-400/30">
                <svg className="h-6 w-6 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="kicker text-slate-500 block mt-6">Assessment Complete</span>
              <h2 className="display-2 mt-2.5">You've finished.</h2>
              <p className="lead mt-3 max-w-md mx-auto text-[15.5px]">
                Enter your details below to unlock your AI Readiness Score, tier, and a personalised report delivered straight to your inbox.
              </p>
            </>
          )}
        </div>

        {/* Tier description — refined callout with a left accent bar */}
        {scoreUnlocked && (
          <div
            className="mt-2 rounded-xl px-5 py-4 text-[14px] leading-relaxed text-slate-300"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: `3px solid ${accent}`,
            }}
          >
            <span className="kicker block mb-1.5" style={{ color: accentSoft.replace(/0\.35\)$/, '0.85)') }}>
              What being a {tier} means
            </span>
            {description}
          </div>
        )}

        {renderContent()}

        <div className="mt-10 pt-6 text-center border-t border-white/[0.06]">
          <button
            onClick={onRestart}
            className="text-[13px] text-slate-400 hover:text-white transition-colors"
          >
            Take the assessment again →
          </button>
        </div>
      </div>
    </div>
  );
};
