import React from 'react';

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

const Pill: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span
    className="inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.14em] px-2.5 py-1 rounded-full border"
    style={{ background: `${color}1A`, borderColor: `${color}55`, color }}
  >
    {children}
  </span>
);

// ─── Tier config — same colours as the on-page gauge ─────────────────────────
const TIERS = [
  {
    name: 'Explorer',
    range: '0% – 40%',
    color: '#fbbf24',     // amber
    accentSoft: 'rgba(251, 191, 36, 0.4)',
    headline: 'They\'ve barely started — and they know it.',
    profile: [
      'Tools are scattered or absent. No named owner. No written AI policy.',
      'Often the founder/CEO is the only one driving anything.',
      'May not yet realise what "doing AI properly" actually looks like.',
      'Frequently feels behind competitors but lacks vocabulary to explain why.',
    ],
    signal: 'Receptive but uncertain. They want guidance more than they want a sales pitch.',
    opening: 'Lead with education, not the offer. Show them what a real AI system looks like (use the DEB Construction story — 20 hours/week saved on one workflow). Frame the conversation as "let\'s find the one workflow we should build first" rather than "here\'s our retainer."',
    riskLanguage: 'Use timing language: "The line is moving — competitors compound advantage every quarter you stay unstructured." This is in their PDF report.',
  },
  {
    name: 'Adopter',
    range: '41% – 75%',
    color: '#818cf8',     // indigo
    accentSoft: 'rgba(129, 140, 248, 0.4)',
    headline: 'Pieces, no system. Most exposed position.',
    profile: [
      'Has tools and people using them — but no consistent owner or governance.',
      'Some departments measure ROI; others don\'t. Some have a policy; others don\'t.',
      'Often feels stuck or frustrated. They know there\'s a gap but can\'t name its shape.',
      'Typically the highest-converting tier: pain is felt, urgency is real.',
    ],
    signal: 'They feel the gap acutely. Your job is to name it for them.',
    opening: 'Name the specific pattern in their answers (the report does this — use it). The "middle ground" framing lands hard here. Then show what closing the gap looks like systemically (governance, measurement, integration) — not just more tools. A Strategy Briefing is the natural next step.',
    riskLanguage: '"Governance debt" is the phrase that resonates with this tier. Every department running its own experiment, no shared standards, one missing person = stalled progress. This is in their PDF report.',
  },
  {
    name: 'Leader',
    range: '76% – 100%',
    color: '#34d399',     // emerald
    accentSoft: 'rgba(52, 211, 153, 0.4)',
    headline: 'Already mature. The trap is plateauing.',
    profile: [
      'Has the foundations: ownership, governance, measurement, integration.',
      'May be small but disciplined — or large and ahead.',
      'Often skeptical of "another AI sales pitch."',
      'Lower urgency, but higher deal size when they do engage.',
    ],
    signal: 'Treat them as a peer. They will see right through generic AI consulting talk.',
    opening: 'Skip the basics — they already have the system. Lead with the second-order question: "How do you compound the advantage before competitors close the gap?" Position the Strategy Briefing as a peer-level conversation about strategic clarity, not a remedial fix. Reference specific things in their report.',
    riskLanguage: 'For Leaders, the risk is "complacency" — not lack of capability. The companies pulling ahead from here aren\'t adopting AI; they\'re rebuilding their operating model around it. This is in their PDF report.',
  },
];

// ─── Main component ──────────────────────────────────────────────────────────
export const SalesGuide: React.FC = () => {
  return (
    <div className="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-14 pb-24 animate-fade-in">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div className="text-center mb-16">
        <img
          src="/logo.png"
          alt="ChiefAIOfficer.com in partnership with Scaling Up"
          className="mx-auto mb-8 h-9 sm:h-10 w-auto opacity-90"
        />
        <span className="kicker text-slate-500">Sales Team Guide</span>
        <h1 className="display-1 mt-4">
          Decoding an <span className="accent-italic">AI&nbsp;Readiness</span> lead
        </h1>
        <p className="lead mt-5 max-w-xl mx-auto">
          The 10-minute reference for what each lead's quiz result actually means and how to approach them. Bookmark this URL.
        </p>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          01 — Decoding the notes line
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="01" kicker="The String In GHL" title="What that notes line means">
        <p className="lead text-[15px] mb-6 max-w-2xl">
          When a new lead lands in GHL, you'll see a line in the contact's notes that looks like this:
        </p>
        <SubtleCard className="!p-7 mb-6">
          <div className="font-mono text-[15px] sm:text-[17px] text-white text-center leading-relaxed tabular tracking-wide">
            <span className="text-amber-300">4/81</span>
            <span className="text-slate-500"> · </span>
            <span className="text-indigo-300">5</span>
            <span className="text-slate-500"> · </span>
            <span className="text-emerald-300">Explorer</span>
            <span className="text-slate-500"> · </span>
            <span className="text-slate-300">June 12, 2026</span>
            <span className="text-slate-500"> · </span>
            <span className="text-purple-300">scaling-up</span>
          </div>
        </SubtleCard>
        <div className="grid grid-cols-1 gap-3">
          {[
            { color: '#fbbf24', label: '4/81', what: 'Raw weighted score', detail: 'Their points out of 81 possible. We give critical questions (governance, policy, security, integration) 3× weight, so the absolute number reflects real maturity — not just question-counting.' },
            { color: '#818cf8', label: '5', what: 'AI Readiness percentage', detail: 'The 0–100 readiness score. This is the number that determines their tier. 5% means they answered close to "nothing in place" on most questions.' },
            { color: '#34d399', label: 'Explorer', what: 'Their tier', detail: 'One of Explorer / Adopter / Leader. The most important field for how you approach them — see section 02 below.' },
            { color: '#cbd5e1', label: 'June 12, 2026', what: 'Submission date', detail: 'When they completed the assessment. The fresher, the warmer.' },
            { color: '#c084fc', label: 'scaling-up', what: 'Source / edition', detail: 'Where the lead came from. See section 04 for what each edition means and how to route follow-up.' },
          ].map((row, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <span
                className="font-mono text-[14px] font-semibold tabular px-2.5 py-1 rounded-md flex-shrink-0 mt-px"
                style={{ background: `${row.color}1A`, color: row.color, border: `1px solid ${row.color}55` }}
              >
                {row.label}
              </span>
              <div className="flex-1">
                <p className="text-white font-semibold text-[14.5px]">{row.what}</p>
                <p className="text-[13.5px] text-slate-400 mt-1 leading-relaxed">{row.detail}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          02 — The three tiers
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="02" kicker="The Three Tiers" title="What the tier tells you — and how to approach them">
        <p className="lead text-[15px] mb-7 max-w-2xl">
          The tier is the single most important field for how you handle the lead. Each one has a different emotional starting point and a different best opening. <span className="text-slate-300">Use the headline language — it's already what's in their PDF report.</span>
        </p>

        <div className="space-y-5">
          {TIERS.map((t) => (
            <div
              key={t.name}
              className="rounded-2xl p-6 sm:p-7 relative overflow-hidden"
              style={{
                background: `linear-gradient(180deg, ${t.color}0F 0%, rgba(255,255,255,0.02) 50%)`,
                border: '1px solid rgba(255,255,255,0.08)',
                borderLeft: `4px solid ${t.color}`,
              }}
            >
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                <Pill color={t.color}>{t.name}</Pill>
                <span className="kicker text-slate-500 tabular">{t.range}</span>
              </div>
              <h3 className="text-[19px] sm:text-[21px] font-semibold text-white tracking-tight leading-tight mb-5">
                {t.headline}
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-5">
                <div>
                  <span className="kicker text-slate-500 block mb-2.5">What they look like</span>
                  <ul className="space-y-1.5 text-[13.5px] text-slate-300 leading-relaxed">
                    {t.profile.map((p, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-slate-600 flex-shrink-0 mt-0.5">·</span>
                        <span>{p}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <span className="kicker text-slate-500 block mb-2.5">Sales signal</span>
                  <p className="text-[13.5px] text-slate-300 leading-relaxed mb-5">{t.signal}</p>
                  <span className="kicker text-slate-500 block mb-2">Risk language</span>
                  <p className="text-[13px] text-slate-400 italic leading-relaxed">"{t.riskLanguage}"</p>
                </div>
              </div>

              <div className="mt-5 pt-5 border-t border-white/[0.06]">
                <span className="kicker block mb-2" style={{ color: t.color }}>
                  Your opening move
                </span>
                <p className="text-[14px] text-slate-200 leading-relaxed">{t.opening}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          03 — Finding the full report
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="03" kicker="The PDF Report" title="Where to find the lead's full report">
        <p className="lead text-[15px] mb-6 max-w-2xl">
          Every lead gets a personalised AI Readiness Report PDF — not just the score. The report walks through their strategic risk, key strengths, gaps, and 3–5 recommendations specific to their answers, industry, role, and company size. <span className="text-white">Always read it before the call.</span>
        </p>
        <SubtleCard>
          <span className="kicker text-slate-500 block mb-3">Inside the GHL contact</span>
          <ol className="space-y-3 text-[14px] text-slate-300 leading-relaxed">
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-6 mt-0.5">01</span>
              <span>Open the contact in GHL.</span>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-6 mt-0.5">02</span>
              <span>Look for the custom field <span className="font-mono text-slate-200 bg-white/5 px-1.5 py-0.5 rounded">pdfUrl</span> (sometimes shown as "PDF URL" in the UI).</span>
            </li>
            <li className="flex gap-3">
              <span className="kicker text-indigo-300 tabular flex-shrink-0 w-6 mt-0.5">03</span>
              <span>Click the link. It opens the PDF in a new tab — that's the full report.</span>
            </li>
          </ol>
          <p className="text-[12.5px] text-slate-500 mt-5">
            Can't see the field? Ask Ced — it may just be hidden in the contact's "More fields" section.
          </p>
        </SubtleCard>
        <SubtleCard className="mt-4">
          <span className="kicker text-slate-500 block mb-3">What's in the report</span>
          <ul className="space-y-2 text-[13.5px] text-slate-300">
            <li className="flex gap-2"><span className="text-slate-600 flex-shrink-0">·</span><span><b className="text-white">Overall Assessment</b> — 3 paragraphs: context, strategic risk, advantage they still hold.</span></li>
            <li className="flex gap-2"><span className="text-slate-600 flex-shrink-0">·</span><span><b className="text-white">Key Strengths</b> — 2–3 things they're doing well, cited from their actual answers.</span></li>
            <li className="flex gap-2"><span className="text-slate-600 flex-shrink-0">·</span><span><b className="text-white">Areas for Improvement</b> — 2–3 critical gaps with the cost of staying there.</span></li>
            <li className="flex gap-2"><span className="text-slate-600 flex-shrink-0">·</span><span><b className="text-white">Actionable Recommendations</b> — 3–5 prioritised next moves, each anchored to a 30/60/90-day window. The last one frames CAIO as the strategic accelerator.</span></li>
          </ul>
        </SubtleCard>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          04 — Edition / Source
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="04" kicker="Where They Came From" title="Edition: scaling-up vs caio">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SubtleCard>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Pill color="#c084fc">scaling-up</Pill>
            </div>
            <p className="text-[14px] text-slate-300 leading-relaxed mb-4">
              From the <b className="text-white">Scaling Up Community</b> edition — usually inputted by Anna's team or sent by Scaling Up partners to their own clients. <span className="text-slate-400">These are pre-qualified by association.</span>
            </p>
            <div className="text-[13px] text-slate-400 space-y-1.5">
              <p><b className="text-slate-200">Primary CTA:</b> Book a briefing with Dani.</p>
              <p><b className="text-slate-200">Owner:</b> Dani / Kathryn handle these.</p>
              <p><b className="text-slate-200">Tone:</b> Reference Scaling Up methodology where natural.</p>
            </div>
          </SubtleCard>
          <SubtleCard>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Pill color="#818cf8">caio</Pill>
            </div>
            <p className="text-[14px] text-slate-300 leading-relaxed mb-4">
              From the <b className="text-white">main ChiefAIOfficer.com</b> assessment — direct, organic, or paid traffic. The original CAIO flow.
            </p>
            <div className="text-[13px] text-slate-400 space-y-1.5">
              <p><b className="text-slate-200">Primary CTA:</b> Book an AI Strategy Briefing.</p>
              <p><b className="text-slate-200">Owner:</b> Standard CAIO routing.</p>
              <p><b className="text-slate-200">Tone:</b> Direct CAIO positioning.</p>
            </div>
          </SubtleCard>
        </div>
        <p className="text-[12.5px] text-slate-500 mt-5 text-center">
          The edition is also stamped as a tag on every contact (<span className="font-mono text-slate-300">Edition: Scaling Up</span> or <span className="font-mono text-slate-300">Edition: CAIO</span>) — you can filter the GHL contacts list by it.
        </p>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          05 — Quick FAQ
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="05" kicker="Quick Reference" title="Common questions">
        <div className="space-y-4">
          {[
            {
              q: 'Why is the raw score "out of 81"?',
              a: '12 questions × 3 max points × question weight. We weight the 6 critical questions (governance, policy, ROI, data security, tool admin, integration) at 3× because they actually predict who behaves like a Leader. Sum of weights = 27, times 3 max points = 81. The percentage you see in the notes is what matters — the raw score is mostly diagnostic.',
            },
            {
              q: 'They said they have a CTO on the call — does that contradict their tier?',
              a: 'Not necessarily. The tier reflects the SYSTEM, not the team. A tech-heavy company with a CTO can still score Explorer if they haven\'t mapped ownership, written a policy, or measured ROI. Use the report to find where they actually scored low.',
            },
            {
              q: 'A lead is showing as Leader but seems eager to buy. What gives?',
              a: 'Possible. Leaders sometimes book because they want validation, benchmark insights, or a peer-level conversation. Don\'t pitch the basics — ask about their compounding strategy. Their report opens with that framing.',
            },
            {
              q: 'A lead\'s answers look obviously gamed (all 3s). Do we trust the tier?',
              a: 'Usually yes, but read the report. The AI-generated section cites their specific answers — if it reads generic and identical, gaming is likely. Flag to Ced/Chris if it feels off.',
            },
            {
              q: 'Where does the score percentage come from if it\'s weighted?',
              a: 'percentage = (raw weighted score / 81) × 100. So a 67% means they hit 54 out of 81 weighted points — heavily counting how they answered the critical 6.',
            },
            {
              q: 'Can a Leader ever go below 75%?',
              a: 'No — the cutoff is strict. Anyone at 75% exactly is an Adopter. The thresholds are 0–40% Explorer, 41–75% Adopter, 76–100% Leader.',
            },
          ].map((item, i) => (
            <SubtleCard key={i} className="!p-5">
              <p className="text-[14.5px] font-semibold text-white mb-2">{item.q}</p>
              <p className="text-[13.5px] text-slate-400 leading-relaxed">{item.a}</p>
            </SubtleCard>
          ))}
        </div>
      </Section>

      {/* ════════════════════════════════════════════════════════════════════
          06 — Test it yourself
          ════════════════════════════════════════════════════════════════════ */}
      <Section num="06" kicker="Empathy" title="Take the assessment yourself">
        <p className="lead text-[15px] mb-6 max-w-2xl">
          The single best thing you can do before your first prospect call: take the quiz yourself, see your own report, and feel what they're feeling. 3 minutes.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2 w-full"
          >
            CAIO edition <span aria-hidden="true">→</span>
          </a>
          <a
            href="/scaling-up"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-flex items-center justify-center gap-2 w-full"
          >
            Scaling Up edition <span aria-hidden="true">→</span>
          </a>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-white/[0.06]">
          <p className="text-[14px] text-slate-400">
            Questions, or something doesn't fit a real prospect? Ping Ced — this page is iterable.
          </p>
        </div>
      </Section>
    </div>
  );
};
