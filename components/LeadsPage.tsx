import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface QA { question: string; answer: string }

interface Lead {
  id: string;
  email: string;
  subscribedAt: string;
  name: string;
  company: string;
  role: string;
  industry: string;
  companySize: string;
  tier: string;
  pct: string;
  pdfUrl: string;
  edition: string;
  groups: string[];
  utmSource?: string;
  utmCampaign?: string;
  referer?: string;
  primaryGoal?: string;
  biggestChallenge?: string;
  aiTools?: string;
  answers?: QA[];
  bookedCall?: boolean;
  bookedAt?: string;
  bookedCalendar?: string;
  bookedSource?: string;
}

// Human labels for the source/edition. edition maps 1:1 to which link the
// respondent finished on: /scaling-up vs /.
const editionLabel = (e?: string): string =>
  e === 'scaling-up' ? 'Scaling Up' : e === 'caio' ? 'CAIO' : '';

// ─── Custom Select ────────────────────────────────────────────────────────────
// Native <select> option lists are OS-drawn and can't be themed (the ugly
// hover). This is a fully-styled dropdown we control end-to-end.
const Select: React.FC<{
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  ariaLabel?: string;
  minWidth?: number;
}> = ({ value, onChange, options, ariaLabel, minWidth = 160 }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const current = options.find(o => o.value === value)?.label ?? '';

  return (
    <div ref={ref} className="relative" style={{ minWidth }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input-premium w-full flex items-center justify-between gap-2 cursor-pointer text-left text-[14px]"
      >
        <span className="truncate">{current}</span>
        <svg
          className={`w-3.5 h-3.5 flex-shrink-0 text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute z-40 mt-1.5 w-full rounded-xl overflow-hidden p-1 animate-fade-in"
          style={{ background: '#12121f', border: '1px solid rgba(255,255,255,0.12)', boxShadow: '0 22px 55px -14px rgba(0,0,0,0.7)' }}
        >
          {options.map(o => {
            const sel = o.value === value;
            return (
              <button
                key={o.value}
                type="button"
                role="option"
                aria-selected={sel}
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full text-left px-3 py-2 rounded-lg text-[13.5px] transition-colors ${sel ? 'text-white' : 'text-slate-300'} hover:bg-white/[0.07]`}
                style={sel ? { background: 'rgba(99,102,241,0.20)' } : undefined}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Small primitives ────────────────────────────────────────────────────────
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

const TierPill: React.FC<{ tier: string }> = ({ tier }) => {
  const colours: Record<string, { fg: string; bg: string; border: string }> = {
    Leader:  { fg: '#a7f3d0', bg: 'rgba(52,211,153,0.14)',   border: 'rgba(52,211,153,0.35)' },
    Adopter: { fg: '#c7d2fe', bg: 'rgba(129,140,248,0.14)',  border: 'rgba(129,140,248,0.35)' },
    Explorer:{ fg: '#fde68a', bg: 'rgba(251,191,36,0.14)',   border: 'rgba(251,191,36,0.35)' },
  };
  const c = colours[tier] || { fg: '#94a3b8', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.14em] border"
      style={{ color: c.fg, background: c.bg, borderColor: c.border }}
    >
      {tier || '—'}
    </span>
  );
};

const SourcePill: React.FC<{ edition?: string }> = ({ edition }) => {
  const label = editionLabel(edition);
  if (!label) return <span className="text-slate-600">—</span>;
  const su = edition === 'scaling-up';
  const c = su
    ? { fg: '#d8b4fe', bg: 'rgba(192,132,252,0.14)', border: 'rgba(192,132,252,0.35)' }
    : { fg: '#c7d2fe', bg: 'rgba(129,140,248,0.14)', border: 'rgba(129,140,248,0.35)' };
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] border whitespace-nowrap"
      style={{ color: c.fg, background: c.bg, borderColor: c.border }}
    >
      {su ? 'Scaling Up' : 'CAIO'}
    </span>
  );
};

// ─── Internal / test-lead detection ───────────────────────────────────────────
// Flags obvious internal + test submissions so the real leads stand out.
const TEST_DOMAINS = ['chiefaiofficer.com', 'scalingup.com', '123.com'];
const TEST_EMAILS  = ['dani@123.com', 'djneefe@gmail.com'];
const TEST_NAMES   = ['daniel neefe', 'dani test', 'anna rozhko', 'anna broome', 'chris daigle', 'cedric kato'];

function isTestLead(l: Pick<Lead, 'name' | 'email'>): boolean {
  const email = (l.email || '').toLowerCase().trim();
  const name  = (l.name  || '').toLowerCase().trim();
  const domain = email.split('@')[1] || '';
  if (TEST_DOMAINS.includes(domain)) return true;
  if (TEST_EMAILS.includes(email)) return true;
  if (/\btest\b/.test(name) || /test/.test(email)) return true;   // "TEST ONLY", "Dani Test"
  if (name.includes('neefe')) return true;                        // Daniel Neefe / djneefe
  if (TEST_NAMES.some(n => name.includes(n))) return true;
  return false;
}

const TestBadge: React.FC = () => (
  <span
    className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.12em] border flex-shrink-0"
    style={{ color: '#fca5a5', background: 'rgba(251,113,133,0.12)', borderColor: 'rgba(251,113,133,0.35)' }}
    title="Internal / test entry"
  >
    Test
  </span>
);

// "Booked a call" badge — set from the GHL booking webhook (see api/booking.ts).
// Emerald + a small check so it reads as a positive, hot signal at a glance.
const BookedBadge: React.FC<{ lead: Pick<Lead, 'bookedCalendar' | 'bookedAt'> }> = ({ lead }) => {
  const when = lead.bookedAt ? new Date(lead.bookedAt) : null;
  const whenLabel = when && !isNaN(when.getTime()) ? when.toLocaleDateString(undefined, { month: 'short', day: '2-digit' }) : '';
  const title = ['Booked a call', lead.bookedCalendar, whenLabel && `on ${whenLabel}`].filter(Boolean).join(' · ');
  return (
    <span
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-[0.12em] border flex-shrink-0"
      style={{ color: '#6ee7b7', background: 'rgba(16,185,129,0.14)', borderColor: 'rgba(16,185,129,0.4)' }}
      title={title}
    >
      <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
      Booked
    </span>
  );
};

// Report action — used both in the table (right of each row) and on board cards.
const PdfButton: React.FC<{ url?: string; onClickCapture?: () => void }> = ({ url }) => {
  if (!url) return <span className="text-slate-600 text-[13px]">—</span>;
  return (
    <a
      href={url} target="_blank" rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-indigo-200 border transition-colors hover:bg-indigo-500/10 whitespace-nowrap"
      style={{ borderColor: 'rgba(129,140,248,0.3)', background: 'rgba(129,140,248,0.06)' }}
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      </svg>
      PDF
    </a>
  );
};

// Copy-to-clipboard button — revealed on hover of its parent cell (which must
// carry the `group/cell` class). Stops propagation so it doesn't open the modal.
const CopyBtn: React.FC<{ value?: string }> = ({ value }) => {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = (e: React.MouseEvent) => {
    e.stopPropagation();
    try { void navigator.clipboard?.writeText(value); } catch { /* ignore */ }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };
  return (
    <button
      onClick={copy}
      title={copied ? 'Copied' : 'Copy'}
      aria-label="Copy"
      className="lead-copy flex-shrink-0 text-slate-500 hover:text-white"
    >
      {copied ? (
        <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="9" y="9" width="11" height="11" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
        </svg>
      )}
    </button>
  );
};

// ─── Lead detail modal ────────────────────────────────────────────────────────
const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div>
    <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-1">{label}</div>
    <div className="text-[13.5px] text-slate-200 break-words">{children || <span className="text-slate-600">—</span>}</div>
  </div>
);

const LeadModal: React.FC<{ lead: Lead; onClose: () => void }> = ({ lead, onClose }) => {
  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const source = editionLabel(lead.edition);
  const utm = [lead.utmSource, lead.utmCampaign].filter(Boolean).join(' · ');

  // Rendered through a portal into document.body so `position: fixed` is
  // relative to the viewport — the page root has a transform (fade-in
  // animation) which would otherwise become the containing block and push
  // the "centered" modal off-centre.
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(3,3,12,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="card-premium w-full max-w-2xl max-h-[88vh] overflow-y-auto"
        style={{ padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 sm:p-7 border-b border-white/[0.07]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              <TierPill tier={lead.tier} />
              <SourcePill edition={lead.edition} />
              {lead.bookedCall && <BookedBadge lead={lead} />}
              {isTestLead(lead) && <TestBadge />}
              {lead.pct && <span className="text-[13px] text-slate-400 tabular">{lead.pct}% readiness</span>}
            </div>
            <h3 className="display-2 text-[24px] truncate">{lead.name || 'Unnamed lead'}</h3>
            <a href={`mailto:${lead.email}`} className="text-[13.5px] text-indigo-300 hover:text-indigo-200 break-all">{lead.email}</a>
          </div>
          <button onClick={onClose} className="btn-ghost text-[13px] flex-shrink-0" aria-label="Close">✕</button>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-7">
          {/* Profile */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-5 gap-y-4">
            <Field label="Company">{lead.company}</Field>
            <Field label="Role">{lead.role}</Field>
            <Field label="Industry">{lead.industry}</Field>
            <Field label="Company Size">{lead.companySize}</Field>
            <Field label="Submitted">
              {lead.subscribedAt ? new Date(lead.subscribedAt).toLocaleString() : ''}
            </Field>
            <Field label="Source / Link">{source}</Field>
            <Field label="Booked call">
              {lead.bookedCall ? (
                <span className="text-emerald-300">
                  Yes{lead.bookedCalendar ? ` · ${lead.bookedCalendar}` : ''}
                  {lead.bookedAt && !isNaN(new Date(lead.bookedAt).getTime()) ? ` · ${new Date(lead.bookedAt).toLocaleString()}` : ''}
                  {lead.bookedSource ? ` · via ${lead.bookedSource}` : ''}
                </span>
              ) : ''}
            </Field>
          </div>

          {/* Attribution — only when we have it */}
          {utm && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-2">Campaign attribution</div>
              <div className="text-[13px] text-slate-300 font-mono break-all">{utm}</div>
            </div>
          )}

          {/* Personalisation */}
          {(lead.primaryGoal || lead.biggestChallenge || lead.aiTools) && (
            <div className="space-y-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">Personalisation</div>
              <Field label="Primary AI Goals">{lead.primaryGoal}</Field>
              <Field label="Biggest Challenge">{lead.biggestChallenge}</Field>
              <Field label="AI Tools in Use">{lead.aiTools}</Field>
            </div>
          )}

          {/* Answers */}
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 mb-3">
              Assessment answers {lead.answers && lead.answers.length > 0 ? `(${lead.answers.length})` : ''}
            </div>
            {lead.answers && lead.answers.length > 0 ? (
              <ol className="space-y-2.5">
                {lead.answers.map((qa, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/[0.05] text-slate-400 text-[11px] font-semibold tabular mt-0.5">{i + 1}</span>
                    <div className="flex-1">
                      <div className="text-[13px] text-slate-300 leading-snug">{qa.question}</div>
                      <div className="text-[13.5px] text-white font-medium mt-0.5">{qa.answer}</div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-[13px] text-slate-500 leading-relaxed">
                No detailed answers on file — this lead predates answer capture. Their profile + score above is everything we have. New submissions store every answer.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            {lead.pdfUrl && (
              <a href={lead.pdfUrl} target="_blank" rel="noopener noreferrer" className="btn-primary text-[13.5px]">
                Open Full Report (PDF)
              </a>
            )}
            <button onClick={onClose} className="btn-ghost text-[13px]">Close</button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

// ─── Login screen ────────────────────────────────────────────────────────────
const LoginScreen: React.FC<{ scope: LeadsScope; onSuccess: () => void }> = ({ scope, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isAll = scope === 'all';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ password, scope }),
      });
      if (res.ok) {
        onSuccess();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || `Sign-in failed (${res.status}).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 sm:px-6 animate-fade-in">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/logo.png"
            alt="ChiefAIOfficer.com in partnership with Scaling Up"
            className="mx-auto mb-8 h-9 sm:h-10 w-auto opacity-90"
          />
          <span className="kicker text-slate-500">{isAll ? 'ChiefAIOfficer · Restricted' : 'Scaling Up · Restricted'}</span>
          <h1 className="display-2 mt-3">Leads Portal</h1>
          <p className="lead mt-3 text-[14.5px]">
            {isAll
              ? 'Enter the team password to view and export all assessment leads.'
              : 'Enter the team password to view and export your Scaling Up assessment leads.'}
          </p>
        </div>
        <SubtleCard>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label htmlFor="password" className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-400 mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                autoFocus
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input-premium block w-full"
                placeholder="•••••••••••••"
              />
            </div>
            {error && (
              <div className="px-3.5 py-2.5 rounded-xl text-[13px] text-rose-200"
                   style={{ background: 'rgba(251,113,133,0.08)', border: '1px solid rgba(251,113,133,0.28)' }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={!password || busy}
              className="btn-primary w-full inline-flex items-center justify-center gap-2"
            >
              {busy ? 'Signing in…' : (<><span>Sign in</span><span aria-hidden="true">→</span></>)}
            </button>
          </form>
        </SubtleCard>
        <p className="text-[11.5px] text-slate-500 text-center mt-6">
          This page is restricted — no search-engine indexing, no public access. Session lasts 8 hours.
        </p>
      </div>
    </div>
  );
};

// ─── CSV helpers ─────────────────────────────────────────────────────────────
// Each column has a getter so computed columns (source label, joined answers)
// are handled uniformly.
const CSV_COLUMNS: Array<{ label: string; get: (l: Lead) => string }> = [
  { label: 'Subscribed At (UTC)', get: l => l.subscribedAt },
  { label: 'Name',                get: l => l.name },
  { label: 'Email',               get: l => l.email },
  { label: 'Tier',                get: l => l.tier },
  { label: 'Score %',             get: l => l.pct },
  { label: 'Source',              get: l => editionLabel(l.edition) },
  { label: 'Booked Call',         get: l => (l.bookedCall ? 'Yes' : '') },
  { label: 'Booked Calendar',     get: l => l.bookedCalendar || '' },
  { label: 'Booked At',           get: l => l.bookedAt || '' },
  { label: 'Booked Source',       get: l => l.bookedSource || '' },
  { label: 'Company',             get: l => l.company },
  { label: 'Role',                get: l => l.role },
  { label: 'Industry',            get: l => l.industry },
  { label: 'Company Size',        get: l => l.companySize },
  { label: 'UTM Source',          get: l => l.utmSource || '' },
  { label: 'UTM Campaign',        get: l => l.utmCampaign || '' },
  { label: 'Primary Goals',       get: l => l.primaryGoal || '' },
  { label: 'Biggest Challenge',   get: l => l.biggestChallenge || '' },
  { label: 'AI Tools',            get: l => l.aiTools || '' },
  { label: 'Answers',             get: l => (l.answers || []).map(a => `${a.question} → ${a.answer}`).join(' | ') },
  { label: 'PDF URL',             get: l => l.pdfUrl },
  { label: 'MailerLite Groups',   get: l => l.groups.join(' | ') },
  { label: 'MailerLite ID',       get: l => l.id },
];

function csvEscape(v: string): string {
  if (v == null) return '';
  const needsQuote = /[",\n\r]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function leadsToCsv(leads: Lead[]): string {
  const header = CSV_COLUMNS.map(c => c.label).join(',');
  const rows = leads.map(lead => CSV_COLUMNS.map(c => csvEscape(c.get(lead) ?? '')).join(','));
  return [header, ...rows].join('\n');
}

function downloadCsv(csv: string, filename: string) {
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ─── Leads table ─────────────────────────────────────────────────────────────
type SortKey = 'subscribedAt' | 'name' | 'tier' | 'pct' | 'company';
type ViewMode = 'recent' | 'tier' | 'score' | 'custom';

// Readiness rank so "By tier" sorts Leader → Adopter → Explorer (hottest first)
// rather than alphabetically.
const TIER_RANK: Record<string, number> = { Leader: 3, Adopter: 2, Explorer: 1 };

const VIEW_MODES: Array<{ key: ViewMode; label: string }> = [
  { key: 'recent', label: 'Default (newest)' },
  { key: 'tier',   label: 'By tier (Leader first)' },
  { key: 'score',  label: 'By score (high → low)' },
];

// Shared grid template so the table header + each row's data area line up.
// 8 data columns; the PDF button lives OUTSIDE this grid, to the right of
// each row (see the render), so it's always visible without scrolling.
const ROW_GRID: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns:
    '96px minmax(110px,1.4fr) minmax(150px,1.7fr) 84px 60px 104px minmax(100px,1.2fr) minmax(90px,1fr)',
  alignItems: 'center',
};
// Fixed row heights so the PDF button gutter (rendered OUTSIDE the table box)
// lines up exactly with each data row.
const HEADER_H = 46;
const ROW_H = 52;

// Board (kanban) columns — one per tier, plus an "Unscored" bucket for leads
// that predate tier capture.
const BOARD_COLUMNS: Array<{ key: string; label: string; color: string; match: (t: string) => boolean }> = [
  { key: 'Leader',   label: 'Leader',   color: '#34d399', match: t => t === 'Leader' },
  { key: 'Adopter',  label: 'Adopter',  color: '#818cf8', match: t => t === 'Adopter' },
  { key: 'Explorer', label: 'Explorer', color: '#fbbf24', match: t => t === 'Explorer' },
  { key: 'Unscored', label: 'Unscored', color: '#94a3b8', match: t => !['Leader', 'Adopter', 'Explorer'].includes(t) },
];

const HEAD_CLS = 'px-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500';
const HeaderBtn: React.FC<{ label: string; active: boolean; dir: 'asc' | 'desc'; onClick: () => void; padLeft?: boolean }> = ({ label, active, dir, onClick, padLeft }) => (
  <button
    onClick={onClick}
    className={`${padLeft ? 'pl-5 pr-2' : 'px-2'} text-left inline-flex items-center gap-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] transition-colors ${active ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300'}`}
  >
    <span>{label}</span>
    <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-40'}`} aria-hidden="true">{active ? (dir === 'asc' ? '▲' : '▼') : '↕'}</span>
  </button>
);

const LeadsTable: React.FC<{ scope: LeadsScope; onLogout: () => void }> = ({ scope, onLogout }) => {
  const isAll = scope === 'all';
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [filter, setFilter]   = useState('');
  const [tierFilter, setTierFilter] = useState<'' | 'Explorer' | 'Adopter' | 'Leader'>('');
  // Default to "All editions" so pre-tracking leads (blank edition) still show.
  // The source filter is only shown in the CAIO ('all') portal — the Scaling Up
  // portal is already server-scoped to scaling-up.
  const [editionFilter, setEditionFilter] = useState<'' | 'scaling-up' | 'caio'>('');
  const [hideTests, setHideTests] = useState(false); // off by default → tests shown
  const [bookedOnly, setBookedOnly] = useState(false); // off by default → all leads shown
  const [layout, setLayout] = useState<'table' | 'board'>('table');
  const [viewMode, setViewMode] = useState<ViewMode>('recent');
  const [sortKey, setSortKey] = useState<SortKey>('subscribedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Lead | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leads', { credentials: 'include' });
      if (res.status === 401) { onLogout(); return; }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Fetch failed (${res.status}).`);
      }
      const data = await res.json() as { leads: Lead[]; fetchedAt: string };
      setLeads(data.leads || []);
      setFetchedAt(data.fetchedAt || '');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    const pctNum = (l: Lead) => Number(l.pct) || 0;
    return leads
      .filter(l => {
        if (hideTests && isTestLead(l)) return false;
        if (bookedOnly && !l.bookedCall) return false;
        if (tierFilter && l.tier !== tierFilter) return false;
        // Strict edition match only when a specific edition is selected.
        if (editionFilter && l.edition !== editionFilter) return false;
        if (!q) return true;
        return [l.name, l.email, l.company, l.role, l.industry]
          .some(v => v && v.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        // View modes take precedence over column sorting.
        if (viewMode === 'tier') {
          const d = (TIER_RANK[b.tier] || 0) - (TIER_RANK[a.tier] || 0);
          return d !== 0 ? d : pctNum(b) - pctNum(a);
        }
        if (viewMode === 'score') return pctNum(b) - pctNum(a);
        if (viewMode === 'recent') return a.subscribedAt < b.subscribedAt ? 1 : -1;
        // 'custom' — driven by a clicked column header.
        if (sortKey === 'pct') {
          return sortDir === 'asc' ? pctNum(a) - pctNum(b) : pctNum(b) - pctNum(a);
        }
        if (sortKey === 'tier') {
          const d = (TIER_RANK[a.tier] || 0) - (TIER_RANK[b.tier] || 0);
          return sortDir === 'asc' ? d : -d;
        }
        const av = (a[sortKey] || '') as string;
        const bv = (b[sortKey] || '') as string;
        if (av === bv) return 0;
        return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av < bv ? 1 : -1);
      });
  }, [leads, filter, tierFilter, editionFilter, hideTests, bookedOnly, viewMode, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    setViewMode('custom');
    if (sortKey === k && viewMode === 'custom') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'subscribedAt' || k === 'pct' ? 'desc' : 'asc'); }
  };

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(leadsToCsv(filtered), `${isAll ? 'caio' : 'scaling-up'}-leads-${stamp}.csv`);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/leads', { method: 'DELETE', credentials: 'include' });
    } catch { /* ignore */ }
    onLogout();
  };

  const custom = viewMode === 'custom';

  return (
    <div className="min-h-screen animate-fade-in">
      {selected && <LeadModal lead={selected} onClose={() => setSelected(null)} />}
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="kicker text-slate-500">{isAll ? 'ChiefAIOfficer · All Leads' : 'Scaling Up · Team Portal'}</span>
            <h1 className="display-2 mt-2.5">Assessment leads</h1>
            <p className="text-[13.5px] text-slate-400 mt-2 leading-relaxed">
              {loading
                ? 'Loading…'
                : <>{filtered.length}{filtered.length !== leads.length ? ` of ${leads.length}` : ''} lead{leads.length === 1 ? '' : 's'}</>}
              {fetchedAt && !loading && (
                <span className="text-slate-500"> · fetched {new Date(fetchedAt).toLocaleString()}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Table / Board layout toggle */}
            <div className="inline-flex rounded-lg p-0.5 mr-1" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
              {(['table', 'board'] as const).map(m => (
                <button
                  key={m}
                  onClick={() => setLayout(m)}
                  className={`px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-colors ${layout === m ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                  style={layout === m ? { background: 'rgba(99,102,241,0.28)' } : undefined}
                >
                  {m === 'table' ? 'Table' : 'Board'}
                </button>
              ))}
            </div>
            <button onClick={load} disabled={loading} className="btn-ghost text-[13px]">
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button onClick={handleExport} disabled={loading || filtered.length === 0} className="btn-primary text-[13.5px]">
              Export {filtered.length !== leads.length && filtered.length > 0 ? `${filtered.length} filtered` : 'CSV'}
            </button>
            <button onClick={handleLogout} className="btn-ghost text-[12.5px] text-slate-500 hover:text-slate-200">
              Sign out
            </button>
          </div>
        </div>

        {/* Filters + view mode */}
        <SubtleCard className="!p-4 sm:!p-5 mb-5">
          <div className="flex flex-wrap gap-3 items-center">
            <input
              type="search"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search name, email, company, role, industry…"
              className="input-premium block flex-1 min-w-[220px]"
            />
            {layout === 'table' && (
              <Select
                ariaLabel="Sort order"
                minWidth={186}
                value={viewMode === 'custom' ? 'recent' : viewMode}
                onChange={v => setViewMode(v as ViewMode)}
                options={VIEW_MODES.map(v => ({ value: v.key, label: v.label }))}
              />
            )}
            {/* Source filter only in the CAIO ('all') portal — the Scaling Up
                portal is already scoped to scaling-up server-side. */}
            {isAll && (
              <Select
                ariaLabel="Filter by source"
                value={editionFilter}
                onChange={v => setEditionFilter(v as typeof editionFilter)}
                options={[
                  { value: '', label: 'All sources' },
                  { value: 'scaling-up', label: 'Scaling Up only' },
                  { value: 'caio', label: 'CAIO only' },
                ]}
              />
            )}
            <Select
              ariaLabel="Filter by tier"
              minWidth={130}
              value={tierFilter}
              onChange={v => setTierFilter(v as typeof tierFilter)}
              options={[
                { value: '', label: 'All tiers' },
                { value: 'Leader', label: 'Leader' },
                { value: 'Adopter', label: 'Adopter' },
                { value: 'Explorer', label: 'Explorer' },
              ]}
            />
            {/* Hide test entries — off by default (tests visible). */}
            <button
              type="button"
              role="checkbox"
              aria-checked={hideTests}
              onClick={() => setHideTests(h => !h)}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] transition-colors hover:bg-white/[0.03]"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-[5px] border transition-all flex-shrink-0"
                style={hideTests
                  ? { background: 'rgba(99,102,241,0.5)', borderColor: '#818cf8' }
                  : { borderColor: 'rgba(255,255,255,0.25)' }}
              >
                {hideTests && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={hideTests ? 'text-slate-200' : 'text-slate-400'}>Hide test entries</span>
            </button>
            {/* Booked only — surface leads who booked a call (Dani / exec briefing). */}
            <button
              type="button"
              role="checkbox"
              aria-checked={bookedOnly}
              onClick={() => setBookedOnly(b => !b)}
              className="inline-flex items-center gap-2 px-3 py-2.5 rounded-lg text-[13px] transition-colors hover:bg-white/[0.03]"
              style={{ border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <span
                className="inline-flex items-center justify-center w-4 h-4 rounded-[5px] border transition-all flex-shrink-0"
                style={bookedOnly
                  ? { background: 'rgba(16,185,129,0.55)', borderColor: '#34d399' }
                  : { borderColor: 'rgba(255,255,255,0.25)' }}
              >
                {bookedOnly && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </span>
              <span className={bookedOnly ? 'text-emerald-200' : 'text-slate-400'}>Booked a call</span>
            </button>
            {(filter || tierFilter || editionFilter || hideTests || bookedOnly || viewMode !== 'recent') && (
              <button
                onClick={() => { setFilter(''); setTierFilter(''); setEditionFilter(''); setHideTests(false); setBookedOnly(false); setViewMode('recent'); }}
                className="btn-ghost text-[13px]"
              >
                Reset
              </button>
            )}
          </div>
        </SubtleCard>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-xl border border-rose-400/25 bg-rose-400/[0.06] text-[13px] text-rose-200">
            {error}
          </div>
        )}

        {/* ── TABLE view ─────────────────────────────────────────────────── */}
        {/* Full-width table box (never shrunk). The PDF button is positioned
            absolutely OUTSIDE the box's right edge and revealed on row hover —
            it lives in the page margin, so it costs the table no width. */}
        {layout === 'table' && (
          <div
            className="rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
          >
            {/* Header */}
            <div className="px-3 sm:px-4 flex items-center" style={{ height: HEADER_H, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex-1" style={ROW_GRID}>
                <HeaderBtn label="Date"    active={custom && sortKey === 'subscribedAt'} dir={sortDir} onClick={() => toggleSort('subscribedAt')} />
                <HeaderBtn label="Name"    active={custom && sortKey === 'name'}         dir={sortDir} onClick={() => toggleSort('name')} />
                <div className={HEAD_CLS}>Email</div>
                <HeaderBtn label="Tier"    active={custom && sortKey === 'tier'}         dir={sortDir} onClick={() => toggleSort('tier')} />
                <HeaderBtn label="Score"   active={custom && sortKey === 'pct'} padLeft   dir={sortDir} onClick={() => toggleSort('pct')} />
                <div className={HEAD_CLS}>Source</div>
                <HeaderBtn label="Company" active={custom && sortKey === 'company'}      dir={sortDir} onClick={() => toggleSort('company')} />
                <div className={HEAD_CLS}>Industry</div>
              </div>
            </div>

            {(!loading && filtered.length === 0) ? (
              <div className="px-4 py-12 text-center text-slate-500 text-[13px]">
                {leads.length === 0 ? 'No leads yet.' : 'No leads match those filters.'}
              </div>
            ) : (
              filtered.map(lead => (
                <div
                  key={lead.id}
                  onClick={() => setSelected(lead)}
                  className="lead-row relative px-3 sm:px-4 flex items-center cursor-pointer transition-colors hover:bg-white/[0.03] text-[13px]"
                  style={{ height: ROW_H, borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                >
                  <div className="flex-1" style={ROW_GRID}>
                    <div className="px-2 text-slate-400 tabular whitespace-nowrap text-[12.5px]">
                      {lead.subscribedAt ? new Date(lead.subscribedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—'}
                    </div>
                    <div className="lead-cell px-2 min-w-0 flex items-center gap-2">
                      <span className="truncate text-white font-medium">{lead.name || '—'}</span>
                      {lead.bookedCall && <BookedBadge lead={lead} />}
                      {isTestLead(lead) && <TestBadge />}
                      <CopyBtn value={lead.name} />
                    </div>
                    <div className="lead-cell px-2 min-w-0 flex items-center gap-1.5">
                      <span className="truncate text-slate-400">{lead.email}</span>
                      <CopyBtn value={lead.email} />
                    </div>
                    <div className="px-2"><TierPill tier={lead.tier} /></div>
                    <div className="pl-5 pr-2 tabular text-white text-[12.5px]">{lead.pct ? `${lead.pct}%` : '—'}</div>
                    <div className="px-2"><SourcePill edition={lead.edition} /></div>
                    <div className="lead-cell px-2 min-w-0 flex items-center gap-1.5">
                      <span className="truncate text-slate-300">{lead.company || '—'}</span>
                      <CopyBtn value={lead.company} />
                    </div>
                    <div className="lead-cell px-2 min-w-0 flex items-center gap-1.5">
                      <span className="truncate text-slate-400">{lead.industry || '—'}</span>
                      <CopyBtn value={lead.industry} />
                    </div>
                  </div>

                  {/* PDF — outside the table's right edge, revealed on row hover.
                      pl-3 bridges the gap so the mouse can travel to it. */}
                  <div className="lead-pdf absolute top-0 h-full flex items-center pl-3" style={{ left: '100%' }}>
                    <PdfButton url={lead.pdfUrl} />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── BOARD (kanban) view ────────────────────────────────────────── */}
        {layout === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {BOARD_COLUMNS.map(col => {
              const cards = filtered
                .filter(l => col.match(l.tier))
                .sort((a, b) => (Number(b.pct) || 0) - (Number(a.pct) || 0));
              return (
                <div key={col.key} className="flex-shrink-0 w-[300px]">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: col.color, boxShadow: `0 0 8px ${col.color}` }} />
                      <span className="text-[13px] font-semibold text-white">{col.label}</span>
                    </div>
                    <span className="text-[12px] text-slate-500 tabular">{cards.length}</span>
                  </div>
                  <div className="space-y-2.5">
                    {cards.length === 0 && (
                      <div className="text-[12px] text-slate-600 px-3 py-6 text-center rounded-xl" style={{ border: '1px dashed rgba(255,255,255,0.08)' }}>
                        No leads
                      </div>
                    )}
                    {cards.map(lead => (
                      <div
                        key={lead.id}
                        onClick={() => setSelected(lead)}
                        className="rounded-xl p-3.5 cursor-pointer transition-colors hover:bg-white/[0.04]"
                        style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.07)' }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-[13.5px] font-medium text-white">{lead.name || '—'}</span>
                              {lead.bookedCall && <BookedBadge lead={lead} />}
                              {isTestLead(lead) && <TestBadge />}
                            </div>
                            <div className="text-[12px] text-slate-400 truncate mt-0.5">{lead.email}</div>
                          </div>
                          {lead.pct && <span className="text-[13px] tabular text-white flex-shrink-0">{lead.pct}%</span>}
                        </div>
                        {lead.company && <div className="text-[12px] text-slate-400 truncate mt-2">{lead.company}</div>}
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <SourcePill edition={lead.edition} />
                          <PdfButton url={lead.pdfUrl} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-[11.5px] text-slate-500 text-center mt-6 leading-relaxed">
          Click any {layout === 'board' ? 'card' : 'row'} to see the lead's full profile, source, and every assessment answer. Data is pulled live each refresh. Leads that predate answer-capture show a blank tier / source until they retake the assessment.
        </p>
      </div>
    </div>
  );
};

// ─── Main export ─────────────────────────────────────────────────────────────
export type LeadsScope = 'scaling-up' | 'all';

export const LeadsPage: React.FC<{ scope: LeadsScope }> = ({ scope }) => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Probe on mount. The cookie is httpOnly so we can't read it — but a GET
  // returns 401 if not signed in, and echoes the authed `scope`. We only treat
  // the session as valid if that scope matches THIS portal's scope (so a
  // Scaling Up cookie doesn't silently authorise the CAIO portal, or vice
  // versa — the user is prompted for the right password instead).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/leads', { credentials: 'include' });
        if (cancelled) return;
        if (!res.ok) { setAuthed(false); return; }
        const data = await res.json().catch(() => ({}));
        setAuthed(data.scope === scope);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => { cancelled = true; };
  }, [scope]);

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-[12px] text-slate-500 tracking-widest uppercase">Loading…</span>
      </div>
    );
  }

  if (!authed) return <LoginScreen scope={scope} onSuccess={() => setAuthed(true)} />;
  return <LeadsTable scope={scope} onLogout={() => setAuthed(false)} />;
};
