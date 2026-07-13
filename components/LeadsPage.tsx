import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
}

// Human labels for the source/edition. edition maps 1:1 to which link the
// respondent finished on: /scaling-up vs /.
const editionLabel = (e?: string): string =>
  e === 'scaling-up' ? 'Scaling Up' : e === 'caio' ? 'CAIO' : '';

// Shared <select> styling (dark, custom chevron) used across the filter row.
const selectCls = 'input-premium block appearance-none pr-9 cursor-pointer bg-no-repeat bg-[right_0.85rem_center] bg-[length:14px_14px]';
const selectBg: React.CSSProperties = {
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")",
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 sm:p-6 overflow-y-auto"
      style={{ background: 'rgba(3,3,12,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="card-premium w-full max-w-2xl my-4"
        style={{ padding: 0 }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 sm:p-7 border-b border-white/[0.07]">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap mb-2">
              <TierPill tier={lead.tier} />
              <SourcePill edition={lead.edition} />
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
    </div>
  );
};

// ─── Login screen ────────────────────────────────────────────────────────────
const LoginScreen: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
        body: JSON.stringify({ password }),
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
          <span className="kicker text-slate-500">Scaling Up · Restricted</span>
          <h1 className="display-2 mt-3">Leads Portal</h1>
          <p className="lead mt-3 text-[14.5px]">
            Enter the team password to view and export your Scaling Up assessment leads.
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

const LeadsTable: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [filter, setFilter]   = useState('');
  const [tierFilter, setTierFilter] = useState<'' | 'Explorer' | 'Adopter' | 'Leader'>('');
  // Default to "All editions" so pre-tracking leads (blank edition) still show.
  const [editionFilter, setEditionFilter] = useState<'' | 'scaling-up' | 'caio'>('');
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
  }, [leads, filter, tierFilter, editionFilter, viewMode, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    setViewMode('custom');
    if (sortKey === k && viewMode === 'custom') setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(k); setSortDir(k === 'subscribedAt' || k === 'pct' ? 'desc' : 'asc'); }
  };

  const handleExport = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadCsv(leadsToCsv(filtered), `scaling-up-leads-${stamp}.csv`);
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
            <span className="kicker text-slate-500">Scaling Up · Team Portal</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center">
            <input
              type="search"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search name, email, company, role, industry…"
              className="input-premium block w-full"
            />
            <select
              value={viewMode === 'custom' ? 'recent' : viewMode}
              onChange={e => setViewMode(e.target.value as ViewMode)}
              className={selectCls}
              style={selectBg}
              aria-label="View mode"
            >
              {VIEW_MODES.map(v => <option key={v.key} value={v.key}>{v.label}</option>)}
            </select>
            <select
              value={editionFilter}
              onChange={e => setEditionFilter(e.target.value as typeof editionFilter)}
              className={selectCls}
              style={selectBg}
              aria-label="Filter by source"
            >
              <option value="">All sources</option>
              <option value="scaling-up">Scaling Up only</option>
              <option value="caio">CAIO only</option>
            </select>
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as typeof tierFilter)}
              className={selectCls}
              style={selectBg}
              aria-label="Filter by tier"
            >
              <option value="">All tiers</option>
              <option value="Leader">Leader</option>
              <option value="Adopter">Adopter</option>
              <option value="Explorer">Explorer</option>
            </select>
            {(filter || tierFilter || editionFilter || viewMode !== 'recent') && (
              <button
                onClick={() => { setFilter(''); setTierFilter(''); setEditionFilter(''); setViewMode('recent'); }}
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

        {/* Table */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-[13px] text-left">
              <thead>
                <tr className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <ThSort label="Date"    onClick={() => toggleSort('subscribedAt')} active={custom && sortKey === 'subscribedAt'} dir={sortDir} />
                  <ThSort label="Name"    onClick={() => toggleSort('name')}         active={custom && sortKey === 'name'} dir={sortDir} />
                  <th className="px-4 py-3">Email</th>
                  <ThSort label="Tier"    onClick={() => toggleSort('tier')}         active={custom && sortKey === 'tier'} dir={sortDir} />
                  <ThSort label="Score"   onClick={() => toggleSort('pct')}          active={custom && sortKey === 'pct'} dir={sortDir} />
                  <th className="px-4 py-3">Source</th>
                  <ThSort label="Company" onClick={() => toggleSort('company')}      active={custom && sortKey === 'company'} dir={sortDir} />
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">PDF</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500 text-[13px]">
                      {leads.length === 0 ? 'No leads yet.' : 'No leads match those filters.'}
                    </td>
                  </tr>
                )}
                {filtered.map(lead => (
                  <tr
                    key={lead.id}
                    onClick={() => setSelected(lead)}
                    className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400 tabular">
                      {lead.subscribedAt ? new Date(lead.subscribedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{lead.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[220px] truncate">{lead.email}</td>
                    <td className="px-4 py-3"><TierPill tier={lead.tier} /></td>
                    <td className="px-4 py-3 tabular text-white">{lead.pct ? `${lead.pct}%` : '—'}</td>
                    <td className="px-4 py-3"><SourcePill edition={lead.edition} /></td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{lead.company || '—'}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-slate-400">{lead.role || '—'}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-slate-400">{lead.industry || '—'}</td>
                    <td className="px-4 py-3">
                      {lead.pdfUrl
                        ? <a
                            href={lead.pdfUrl} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2 text-[12.5px]"
                          >Open</a>
                        : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11.5px] text-slate-500 text-center mt-6 leading-relaxed">
          Click any row to see the lead's full profile, source, and every assessment answer. Data is pulled live each refresh. Leads that predate answer-capture show a blank tier / source until they retake the assessment on the current build.
        </p>
      </div>
    </div>
  );
};

const ThSort: React.FC<{ label: string; onClick: () => void; active: boolean; dir: 'asc' | 'desc' }> = ({ label, onClick, active, dir }) => (
  <th className="px-4 py-3">
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 ${active ? 'text-indigo-300' : 'text-slate-500 hover:text-slate-300'} transition-colors`}
    >
      <span>{label}</span>
      <span className={`text-[9px] ${active ? 'opacity-100' : 'opacity-40'}`} aria-hidden="true">
        {active ? (dir === 'asc' ? '▲' : '▼') : '↕'}
      </span>
    </button>
  </th>
);

// ─── Main export ─────────────────────────────────────────────────────────────
export const LeadsPage: React.FC = () => {
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Probe on mount — the cookie is httpOnly so we can't read it, but a GET
  // returns 401 quickly if we're not signed in.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/leads', { credentials: 'include' });
        if (!cancelled) setAuthed(res.ok);
      } catch {
        if (!cancelled) setAuthed(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (authed === null) {
    // Loading probe — brief flash.
    return (
      <div className="min-h-screen flex items-center justify-center">
        <span className="text-[12px] text-slate-500 tracking-widest uppercase">Loading…</span>
      </div>
    );
  }

  if (!authed) return <LoginScreen onSuccess={() => setAuthed(true)} />;
  return <LeadsTable onLogout={() => setAuthed(false)} />;
};
