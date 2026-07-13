import React from 'react';
import { SURVEY_QUESTIONS, MAX_SCORE } from '../constants';
import { Question } from '../types';

// ─── Small primitives ────────────────────────────────────────────────────────
const Section: React.FC<{
  num: string; kicker: string; title: string; children: React.ReactNode;
}> = ({ num, kicker, title, children }) => (
  <section className="mt-20 first:mt-0 scroll-mt-10" id={`s${num}`}>
    <div className="flex items-baseline gap-3 mb-1">
      <span className="kicker text-indigo-300 tabular">{num}</span>
      <span className="kicker text-slate-500">{kicker}</span>
    </div>
    <h2 className="display-2 mt-2 mb-6">{title}</h2>
    {children}
  </section>
);

const Pill: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.14em] px-2 py-0.5 rounded-full border"
    style={{
      background: `${color}1A`,
      borderColor: `${color}55`,
      color,
    }}
  >
    {children}
  </span>
);

const Check: React.FC<{ done?: boolean }> = ({ done = true }) => (
  <span
    className="inline-flex items-center justify-center w-5 h-5 rounded-full flex-shrink-0 mt-0.5"
    style={{
      background: done ? 'rgba(52,211,153,0.15)' : 'rgba(148,163,184,0.12)',
      border: `1px solid ${done ? 'rgba(52,211,153,0.5)' : 'rgba(148,163,184,0.35)'}`,
    }}
  >
    {done ? (
      <svg className="w-3 h-3 text-emerald-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ) : (
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
    )}
  </span>
);

const SubtleCard: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div
    className={`rounded-2xl p-6 sm:p-7 ${className}`}
    style={{
      background: 'rgba(255,255,255,0.025)',
      border: '1px solid rgba(255,255,255,0.07)',
    }}
  >
    {children}
  </div>
);

// ─── Weight palette (matches the rubric colour intent) ───────────────────────
const weightStyle = (w: number) => {
  if (w === 3) return { label: 'Critical · 3×', color: '#34d399' };  // emerald
  if (w === 2) return { label: 'High · 2×',     color: '#818cf8' };  // indigo
  return                  { label: 'Baseline · 1×', color: '#94a3b8' }; // slate
};

// ─── Rubric card ─────────────────────────────────────────────────────────────
const RubricCard: React.FC<{ q: Question; idx: number }> = ({ q, idx }) => {
  const w = q.weight ?? 1;
  const { label, color } = weightStyle(w);
  return (
    <SubtleCard className="!p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-baseline gap-2.5">
          <span className="kicker text-slate-500 tabular">Q{String(idx + 1).padStart(2, '0')}</span>
        </div>
        <Pill color={color}>{label}</Pill>
      </div>
      <p className="text-[14.5px] font-semibold text-white leading-snug mb-3">{q.text}</p>
      <div className="flex flex-wrap gap-1.5">
        {q.options?.map((opt) => {
          const isBest = opt.score === Math.max(...(q.options?.map(o => o.score) || [0]));
          const isWorst = opt.score === Math.min(...(q.options?.map(o => o.score) || [0]));
          const badgeColor = isBest ? '#34d399' : isWorst ? '#fb7185' : '#94a3b8';
          return (
            <span
              key={opt.text}
              className="inline-flex items-center gap-1.5 text-[12px] px-2.5 py-1 rounded-md border"
              style={{
                background: 'rgba(255,255,255,0.03)',
                borderColor: 'rgba(255,255,255,0.08)',
                color: '#cbd5e1',
              }}
            >
              <span className="text-slate-200">{opt.text}</span>
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold tabular"
                style={{ background: `${badgeColor}25`, color: badgeColor }}
              >
                {opt.score}
              </span>
            </span>
          );
        })}
      </div>
    </SubtleCard>
  );
};

// ─── Email mock ──────────────────────────────────────────────────────────────
const EmailMock: React.FC = () => (
  <div
    className="rounded-2xl overflow-hidden shadow-2xl mx-auto max-w-[560px]"
    style={{ border: '1px solid rgba(255,255,255,0.08)' }}
  >
    {/* Email header */}
    <div className="px-5 py-3 text-[12px] text-slate-400" style={{ background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <div><span className="text-slate-500">From:</span> <span className="text-slate-300">ChiefAIOfficer.com &lt;assessment@chiefaiofficer.com&gt;</span></div>
      <div><span className="text-slate-500">Subject:</span> <span className="text-white font-medium">Your AI Readiness Results Are In</span></div>
    </div>
    {/* Email body */}
    <div style={{ background: '#f3f4f6' }}>
      <div className="bg-[#1e1b4b] text-center px-8 py-5">
        <span className="text-[10px] text-indigo-200 tracking-[0.18em] font-semibold uppercase">
          ChiefAIOfficer.com · In partnership with Scaling Up
        </span>
      </div>
      <div className="px-8 py-8 bg-white">
        <h3 className="text-[20px] font-bold text-[#1e1b4b] mb-3">Your AI Readiness Report is ready</h3>
        <p className="text-[14px] text-slate-700 mb-4">Hi Jane,</p>
        <p className="text-[14px] text-slate-700 mb-5">Thanks for taking the assessment. Here's exactly where you stand:</p>
        <div className="rounded-lg p-5 text-center mb-5" style={{ background: '#eef2ff', border: '1px solid #c7d2fe' }}>
          <div className="text-[10px] font-bold text-indigo-600 tracking-[0.15em] uppercase mb-2">AI Readiness Score</div>
          <div className="text-[40px] font-extrabold text-[#1e1b4b] leading-none mb-3">
            67<span className="text-[20px] text-slate-500 font-medium ml-0.5">%</span>
          </div>
          <span className="inline-block px-4 py-1.5 rounded-full text-white text-[12px] font-semibold tracking-wide" style={{ background: '#2563eb' }}>
            Adopter Tier
          </span>
        </div>
        <p className="text-[14px] text-slate-700 mb-5 italic">
          [Tier-specific blurb — direct, ~1 paragraph]
        </p>
        <button className="w-full text-white font-semibold rounded-lg py-3 mb-7" style={{ background: '#4f46e5' }}>
          View Your Full Report (PDF)
        </button>
        <div className="border-t border-slate-200 pt-6">
          <h4 className="text-[16px] font-bold text-[#1e1b4b] mb-2">Ready to act on it?</h4>
          <p className="text-[13px] text-slate-700 mb-4">
            The fastest next step is a complimentary AI Strategy Briefing — a 30-minute call where we look at your specific business and show you what building a real AI system would look like.
          </p>
          <button className="w-full text-white font-semibold rounded-lg py-3" style={{ background: '#1e1b4b' }}>
            Book Your AI Strategy Briefing
          </button>
        </div>
      </div>
      <div className="bg-slate-50 px-8 py-4 text-center text-[11px] text-slate-500">
        ChiefAIOfficer.com · In partnership with Scaling Up
      </div>
    </div>
  </div>
);

// ─── Walkthrough step ────────────────────────────────────────────────────────
const Step: React.FC<{
  num: number; title: string; what: string; notes?: React.ReactNode;
}> = ({ num, title, what, notes }) => (
  <div className="flex gap-4 sm:gap-5">
    <div
      className="flex-shrink-0 w-10 h-10 rounded-full inline-flex items-center justify-center font-semibold text-[14px]"
      style={{
        background: 'rgba(99,102,241,0.15)',
        border: '1px solid rgba(129,140,248,0.4)',
        color: '#c7d2fe',
      }}
    >
      {num}
    </div>
    <div className="pb-8 border-l border-white/[0.06] -ml-[21px] pl-[34px] pt-1.5 flex-1 last:border-l-0">
      <h4 className="font-semibold text-[15.5px] text-white">{title}</h4>
      <p className="text-[14px] text-slate-400 mt-1.5 leading-relaxed">{what}</p>
      {notes && <div className="mt-3 text-[12.5px] text-slate-500">{notes}</div>}
    </div>
  </div>
);

// ─── Main review page ────────────────────────────────────────────────────────
export const Review: React.FC = () => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24 animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-16">
        <img
          src="/logo.png"
          alt="ChiefAIOfficer.com in partnership with Scaling Up"
          className="mx-auto mb-8 h-9 sm:h-10 w-auto opacity-90"
        />
        <span className="kicker text-slate-500">Internal Walkthrough · For Josh</span>
        <h1 className="display-1 mt-4">
          AI Readiness Quiz — <span className="accent-italic">review</span>
        </h1>
        <p className="lead mt-5 max-w-xl mx-auto">
          Everything that's been built, where it lives, and how to test it. Scroll top-to-bottom or jump using the section numbers.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          01 — Your feedback, status
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="01" kicker="Status" title="Your feedback — all three live">
        <SubtleCard>
          <ul className="space-y-5">
            <li className="flex gap-4">
              <Check />
              <div>
                <p className="text-white font-semibold">Score on a 0–100% scale</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  On-screen gauge, PDF cover, and report-page score card all show the percentage with the tier pill. Underlying scoring (1–4 pts per answer) is unchanged — only the display normalises. Section 04 details the new weighting. <span className="text-slate-300">Note:</span> the report-delivery email content lives in MailerLite templates — make sure they reference the percentage if you want consistency across surfaces.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <Check />
              <div>
                <p className="text-white font-semibold">No real-time streaming of the report</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  The typewriter effect is gone. Submitting now shows a calm "We're polishing your AI Readiness Report" card with a rotating status line for ~15–30 seconds, then the full polished report appears all at once.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <Check />
              <div>
                <p className="text-white font-semibold">Risk language up front</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  Every report now opens with a three-paragraph Overall Assessment: <span className="text-white">Context</span> → <span className="text-white">Risk</span> → <span className="text-white">Advantage</span>. The risk paragraph uses your exemplar voice — direct, timing-led, naming the second-order exposure (shadow AI, governance debt, complacency by tier). See section 05.
                </p>
              </div>
            </li>
          </ul>
        </SubtleCard>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          02 — Test it yourself
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="02" kicker="Try It" title="Take the quiz yourself">
        <p className="lead text-[15px] mb-6 max-w-2xl">
          Two editions live in parallel. They share the questions and the AI report engine, but route signups separately so each audience gets the right follow-up.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SubtleCard>
            <div className="flex items-center gap-2 mb-3">
              <Pill color="#818cf8">CAIO edition</Pill>
            </div>
            <p className="text-[13.5px] text-slate-400 leading-relaxed mb-5">
              The default ChiefAIOfficer.com flow. Routes signups to the master GHL webhook and adds the lead to the MailerLite tier group so the shared tier-aware welcome sequence delivers the report + nurture.
            </p>
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 w-full justify-center"
            >
              Open <span aria-hidden="true">→</span>
            </a>
          </SubtleCard>

          <SubtleCard>
            <div className="flex items-center gap-2 mb-3">
              <Pill color="#34d399">Scaling Up edition</Pill>
            </div>
            <p className="text-[13.5px] text-slate-400 leading-relaxed mb-5">
              The Scaling Up Community flow. Same quiz; routes to its own GHL webhook (Dani / Kathryn) and adds the lead to the MailerLite tier group so the shared tier-aware welcome sequence delivers the report + nurture. The <span className="font-mono text-slate-300">edition</span> tag lets downstream GHL workflows tell the two apart.
            </p>
            <a
              href="/scaling-up"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary inline-flex items-center gap-2 w-full justify-center"
            >
              Open <span aria-hidden="true">→</span>
            </a>
          </SubtleCard>
        </div>
        <p className="text-[12.5px] text-slate-500 mt-5">
          Tip: use a <span className="text-slate-300">+test1@gmail.com</span> address so you can run multiple end-to-end tests without colliding in MailerLite.
        </p>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          03 — Walkthrough
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="03" kicker="User Flow" title="What a respondent actually sees">
        <div className="space-y-0">
          <Step
            num={1}
            title="Landing"
            what="Branded header (ChiefAIOfficer × Scaling Up logo) + display headline + lead copy. The Scaling Up edition adds a 'For the Scaling Up Community' kicker badge."
          />
          <Step
            num={2}
            title="12 weighted questions"
            what="One question per screen, refined option cards with proper hover and selected states. Selecting an answer auto-advances after ~320ms. Progress bar above the card."
            notes={<>See <a href="#s04" className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2">section 04</a> for the full rubric.</>}
          />
          <Step
            num={3}
            title="Assessment complete — email gate"
            what="No score is shown here. Just an indigo check icon + 'You've finished.' + the email form. Score, tier, and report are gated behind the form."
            notes={<>Two paths in the form: <span className="text-slate-300">simple</span> (just name + email, button below) and <span className="text-slate-300">go deeper</span> (optional company, role, industry, goals, challenges — for sharper personalisation).</>}
          />
          <Step
            num={4}
            title="Generating — calm waiting state"
            what='A polished card with concentric pulsing dots and a rotating status line: "Analysing your responses…" → "Mapping your strategic risks…" → "Finalising the recommendations…". No partial text leakage.'
          />
          <Step
            num={5}
            title="Reveal — everything at once"
            what="Score gauge (percentage + tier pill), tier description callout, full personalised report (risk-led opening, strengths, gaps, recommendations), and a prominent booking CTA panel — all appear together when the report is ready."
          />
          <Step
            num={6}
            title="Confirmation email arrives"
            what="For both editions, MailerLite's tier-aware welcome sequence sends the report-delivery email (Email 1 in each tier group). Each email contains the PDF link and the AI Strategy Briefing CTA. The GHL webhook still fires for both editions so lead assignment / notifications can branch on the Edition tag."
          />
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          04 — Scoring rubric
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="04" kicker="Scoring" title="The full rubric">
        <SubtleCard className="mb-5">
          <p className="text-[14.5px] text-slate-300 leading-relaxed">
            Each option is scored <b className="text-white">0–3</b> (0 = absent/dangerous, 1 = minimal, 2 = developing, 3 = best-practice). Each question carries a <b className="text-white">weight</b> (1×, 2×, or 3×) reflecting how strongly it discriminates between Explorer / Adopter / Leader. Total weighted max is <b className="text-white">{MAX_SCORE}</b>, displayed as a percentage.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-5">
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.25)' }}>
              <div className="kicker text-emerald-300">Critical · 3×</div>
              <div className="text-[12.5px] text-slate-300 mt-2">Governance, policy, ROI, data security, tool admin, integration</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(129,140,248,0.08)', border: '1px solid rgba(129,140,248,0.25)' }}>
              <div className="kicker text-indigo-300">High · 2×</div>
              <div className="text-[12.5px] text-slate-300 mt-2">Standardisation, manager review, hallucination mitigation</div>
            </div>
            <div className="rounded-lg p-3 text-center" style={{ background: 'rgba(148,163,184,0.08)', border: '1px solid rgba(148,163,184,0.25)' }}>
              <div className="kicker text-slate-400">Baseline · 1×</div>
              <div className="text-[12.5px] text-slate-300 mt-2">Self-report effectiveness, who trained, training frequency</div>
            </div>
          </div>
        </SubtleCard>

        <div className="space-y-3">
          {SURVEY_QUESTIONS.map((q, i) => (
            <RubricCard key={q.id} q={q} idx={i} />
          ))}
        </div>

        <SubtleCard className="mt-5">
          <span className="kicker text-slate-500 block mb-2">Tier thresholds</span>
          <div className="flex flex-wrap gap-3 text-[13.5px] text-slate-300">
            <span><b className="text-amber-300">Explorer</b> · 0–40%</span>
            <span className="text-slate-600">|</span>
            <span><b className="text-indigo-300">Adopter</b> · 41–75%</span>
            <span className="text-slate-600">|</span>
            <span><b className="text-emerald-300">Leader</b> · 76–100%</span>
          </div>
          <p className="text-[12.5px] text-slate-500 mt-3 leading-relaxed">
            Validated against 8 archetypal respondent profiles — distribution lands cleanly across all three tiers. If you want to recalibrate (e.g. tighten Leader to 80%+), it's a one-line change.
          </p>
        </SubtleCard>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          05 — The AI report
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="05" kicker="The Report" title="How each personalised report is generated">
        <p className="lead text-[15px] mb-6 max-w-2xl">
          The report is generated in real-time by Claude (Anthropic) using a tightly constrained prompt. It uses the respondent's tier, role, industry, company size, primary goals, biggest challenge, AI tools in use, and their actual answers.
        </p>
        <SubtleCard>
          <span className="kicker text-slate-500 block mb-3">Section structure</span>
          <ol className="space-y-4 text-[14px] text-slate-300">
            <li>
              <span className="text-white font-semibold">### Overall Assessment</span>
              <p className="mt-1 text-slate-400 text-[13.5px] leading-relaxed">
                Three paragraphs in this exact order:<br/>
                <b className="text-slate-300">Context</b> → grounds the tier in their role, industry, size.<br/>
                <b className="text-slate-300">Risk</b> → direct, timing-led, names the second-order exposure (uses your exemplar voice).<br/>
                <b className="text-slate-300">Advantage</b> → the leverage they still hold; pivots into action.
              </p>
            </li>
            <li>
              <span className="text-white font-semibold">### Key Strengths</span>
              <p className="mt-1 text-slate-400 text-[13.5px] leading-relaxed">
                2–3 strengths from their highest-scoring answers. Each cites their actual answer + names why it's a competitive asset at their stage and scale.
              </p>
            </li>
            <li>
              <span className="text-white font-semibold">### Areas for Improvement</span>
              <p className="mt-1 text-slate-400 text-[13.5px] leading-relaxed">
                2–3 gaps from their lowest-scoring answers. Each makes the cost of staying there tangible for their specific situation.
              </p>
            </li>
            <li>
              <span className="text-white font-semibold">### Actionable Recommendations</span>
              <p className="mt-1 text-slate-400 text-[13.5px] leading-relaxed">
                3–5 prioritised next moves. Each starts with a verb, references one of their answers, includes a 30/60/90-day anchor, and is sized to their company. The final one frames CAIO as the strategic accelerator — not a pitch.
              </p>
            </li>
          </ol>
          <div className="mt-5 pt-5 border-t border-white/[0.06]">
            <span className="kicker text-slate-500 block mb-2">Writing rules baked into the prompt</span>
            <p className="text-[13px] text-slate-400 leading-relaxed">
              Specificity, substance over length, concrete numbers, no hedging, no AI platitudes, cite the respondent's answers naturally, industry/size-aware sizing. Written for senior decision-makers — no padding.
            </p>
          </div>
        </SubtleCard>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          06 — Email mock
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="06" kicker="Email" title="Confirmation email design">
        <p className="lead text-[15px] mb-6 max-w-2xl">
          Both editions deliver the report via the shared MailerLite welcome sequence (Email 1 = report delivery, then nurture). The <b className="text-slate-200">edition</b> field on each MailerLite subscriber + the <span className="font-mono text-slate-300">Edition:</span> tag on the GHL contact let you distinguish audiences. The mock below is representative of the polished tone — actual templates live in MailerLite.
        </p>
        <EmailMock />
        <p className="text-[12.5px] text-slate-500 mt-5 text-center">
          The italic "[Tier-specific blurb]" is replaced with a one-sentence tier description in the real send.
        </p>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          07 — Behind the scenes
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="07" kicker="Behind the Scenes" title="What happens on submit">
        <p className="lead text-[15px] mb-6 max-w-2xl">
          When the respondent presses "Generate My Report", the backend fans out to several systems in parallel. None blocks the user response.
        </p>
        <SubtleCard>
          <ol className="space-y-4 text-[14px] text-slate-300">
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-7 pt-0.5">01</span>
              <div>
                <span className="text-white font-semibold">Generate AI report</span> — streams from Claude server-side. Takes ~15–30s.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-7 pt-0.5">02</span>
              <div>
                <span className="text-white font-semibold">Render branded PDF</span> — via @react-pdf/renderer. Cover page (gradient + score + tier bar) + content pages with mini-header and footer.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-7 pt-0.5">03</span>
              <div>
                <span className="text-white font-semibold">Upload to Vercel Blob</span> — filename: <span className="text-slate-400">ChiefAIOfficer-AI-Readiness-Report-Jane-Smith-2026-06-08.pdf</span>.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-7 pt-0.5">04</span>
              <div>
                <span className="text-white font-semibold">Email — same path for both editions</span><br />
                <span className="text-slate-400 text-[13.5px]">
                  Both editions: added to MailerLite (master group + tier group); the shared tier-aware welcome sequence delivers the report-delivery email + nurture. The <span className="font-mono text-slate-300">edition</span> field on the subscriber (and the <span className="font-mono text-slate-300">Edition:</span> tag on the GHL contact) distinguish audiences downstream.
                </span>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-7 pt-0.5">05</span>
              <div>
                <span className="text-white font-semibold">GHL webhook</span> — branches by edition (CAIO inbox vs Dani/Kathryn). Includes full lead context + tier + UTM attribution + tags.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-7 pt-0.5">06</span>
              <div>
                <span className="text-white font-semibold">Motherboard ping</span> — server-side completion event with edition flag, for live signup monitoring.
              </div>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-7 pt-0.5">07</span>
              <div>
                <span className="text-white font-semibold">PostHog event + identify</span> — funnel events fire throughout the journey; <span className="text-slate-400">identify()</span> binds the lead's email to all subsequent events.
              </div>
            </li>
          </ol>
        </SubtleCard>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          08 — Tracking & integrations
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="08" kicker="Tracking" title="Tags, events, and integrations">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SubtleCard>
            <span className="kicker text-slate-500 block mb-3">Applied to every lead in GHL</span>
            <ul className="space-y-1.5 text-[13px]">
              <li className="font-mono text-emerald-300">ai-readiness-quiz-completed</li>
              <li className="font-mono text-emerald-300">AI Assessment Completed</li>
              <li className="font-mono text-indigo-300">AI Tier: Explorer | Adopter | Leader</li>
              <li className="font-mono text-indigo-300">Edition: CAIO | Scaling Up</li>
              <li className="font-mono text-slate-400">source-&lt;utm_source&gt;</li>
              <li className="font-mono text-slate-400">campaign-&lt;utm_campaign&gt; (if set)</li>
              <li className="font-mono text-slate-400">email-N (if set)</li>
            </ul>
          </SubtleCard>
          <SubtleCard>
            <span className="kicker text-slate-500 block mb-3">PostHog funnel events</span>
            <ul className="space-y-1.5 text-[13px] font-mono text-slate-300">
              <li>quiz_landing_viewed</li>
              <li>quiz_started</li>
              <li>quiz_question_answered</li>
              <li>quiz_completed</li>
              <li>quiz_form_submitted</li>
              <li>quiz_report_delivered</li>
              <li>quiz_report_downloaded</li>
              <li className="text-emerald-300">quiz_booking_clicked</li>
              <li>quiz_restarted</li>
            </ul>
          </SubtleCard>
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          09 — Open items
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="09" kicker="Over to You" title="Open items + questions">
        <SubtleCard>
          <p className="text-[14.5px] text-slate-300 leading-relaxed mb-4">
            <b className="text-white">Closed (Josh's answers landed):</b>
          </p>
          <ul className="space-y-4 mb-7">
            <li className="flex gap-3">
              <Check />
              <div>
                <p className="text-white font-semibold">Confirmation email content</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  Just thank-you + PDF button + booking CTA. Implemented for the Resend version when it was active; the same simple structure should be used in the MailerLite + GHL templates going forward.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Check />
              <div>
                <p className="text-white font-semibold">Next step after form completion</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  Thank-you screen with score, tier, PDF download, and the AI Strategy Briefing CTA. Live and confirmed.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Check />
              <div>
                <p className="text-white font-semibold">Schedule briefing with Dani — primary CTA</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  Configured via the <span className="font-mono text-slate-300">SCALING_UP_BOOKING_URL</span> and <span className="font-mono text-slate-300">VITE_SCALING_UP_BOOKING_URL</span> env vars. Drop in Dani's calendar URL in Vercel → applies to both the on-page CTA and any future email template.
                </p>
              </div>
            </li>
          </ul>

          <p className="text-[14.5px] text-slate-300 leading-relaxed mb-4">
            <b className="text-white">Still need your input:</b>
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3">
              <Check done={false} />
              <div>
                <p className="text-white font-semibold">Shared MailerLite welcome sequence for both editions</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  Both CAIO and Scaling Up leads now flow into the same tier groups (<span className="font-mono text-slate-300">AI Readiness - Explorer / Adopter / Leader</span>) and receive the same welcome sequence. You confirmed this is intended — both audiences see identical email copy. If you ever want to fork them (e.g. Dani's calendar link for Scaling Up leads only), we can add a separate SU tier-group map + parallel sequences. For now, the <span className="font-mono text-slate-300">edition</span> field on each subscriber lets segments filter by audience.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Check done={false} />
              <div>
                <p className="text-white font-semibold">Booking URL inside MailerLite templates</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  Since the welcome sequence is now shared, whatever booking URL is in the MailerLite email templates goes to both audiences. If you want Scaling Up to hit Dani's calendar specifically, you'll need to either (a) fork the sequences (see above) or (b) use MailerLite's conditional content by <span className="font-mono text-slate-300">edition</span> field. The <span className="font-mono text-slate-300">SCALING_UP_BOOKING_URL</span> env var only controls the on-page CTA on <span className="font-mono text-slate-300">/scaling-up</span>, not the email content.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Check done={false} />
              <div>
                <p className="text-white font-semibold">Lead-assignment process inside GHL</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  We tag every lead with <span className="font-mono text-slate-300">Edition: Scaling Up</span> — your call on assignment rules and SLAs inside GHL. I gave you a copy-pasteable workflow spec earlier; let me know once it's built.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <Check done={false} />
              <div>
                <p className="text-white font-semibold">Tier thresholds — recalibrate?</p>
                <p className="text-[14px] text-slate-400 mt-1 leading-relaxed">
                  Currently 40% / 75%. If real data shows everyone clustering in Adopter we can tighten to e.g. 35% / 80%. Easy one-line change once we have ~50 real submissions.
                </p>
              </div>
            </li>
          </ul>
        </SubtleCard>

        <div className="text-center mt-10 pt-8 border-t border-white/[0.06]">
          <p className="text-[14px] text-slate-400">
            Ping Cedric with feedback — or hit reply on any of the existing threads. Everything is iterable in minutes.
          </p>
        </div>
      </Section>
    </div>
  );
};
