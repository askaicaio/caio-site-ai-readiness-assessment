import React, { useCallback, useEffect, useMemo, useState } from 'react';

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
}

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
const CSV_COLUMNS: Array<{ key: keyof Lead | 'groupsList'; label: string }> = [
  { key: 'subscribedAt', label: 'Subscribed At (UTC)' },
  { key: 'name',         label: 'Name' },
  { key: 'email',        label: 'Email' },
  { key: 'tier',         label: 'Tier' },
  { key: 'pct',          label: 'Score %' },
  { key: 'company',      label: 'Company' },
  { key: 'role',         label: 'Role' },
  { key: 'industry',     label: 'Industry' },
  { key: 'companySize',  label: 'Company Size' },
  { key: 'edition',      label: 'Edition' },
  { key: 'pdfUrl',       label: 'PDF URL' },
  { key: 'groupsList',   label: 'MailerLite Groups' },
  { key: 'id',           label: 'MailerLite ID' },
];

function csvEscape(v: string): string {
  if (v == null) return '';
  const needsQuote = /[",\n\r]/.test(v);
  const escaped = v.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

function leadsToCsv(leads: Lead[]): string {
  const header = CSV_COLUMNS.map(c => c.label).join(',');
  const rows = leads.map(lead => CSV_COLUMNS.map(c => {
    if (c.key === 'groupsList') return csvEscape(lead.groups.join(' | '));
    return csvEscape((lead[c.key as keyof Lead] as string) ?? '');
  }).join(','));
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

const LeadsTable: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [leads, setLeads]     = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [fetchedAt, setFetchedAt] = useState('');
  const [filter, setFilter]   = useState('');
  const [tierFilter, setTierFilter] = useState<'' | 'Explorer' | 'Adopter' | 'Leader'>('');
  const [editionFilter, setEditionFilter] = useState<'' | 'scaling-up' | 'caio'>('scaling-up');
  const [sortKey, setSortKey] = useState<SortKey>('subscribedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

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
    return leads
      .filter(l => {
        if (tierFilter && l.tier !== tierFilter) return false;
        if (editionFilter) {
          // Old records may have a blank edition — only include them when the
          // filter is "all". Otherwise strict match on the field value.
          if (!l.edition) return false;
          if (l.edition !== editionFilter) return false;
        }
        if (!q) return true;
        return [l.name, l.email, l.company, l.role, l.industry]
          .some(v => v && v.toLowerCase().includes(q));
      })
      .sort((a, b) => {
        const av = (a[sortKey] || '') as string;
        const bv = (b[sortKey] || '') as string;
        if (sortKey === 'pct') {
          const an = Number(av) || 0;
          const bn = Number(bv) || 0;
          return sortDir === 'asc' ? an - bn : bn - an;
        }
        if (av === bv) return 0;
        return sortDir === 'asc' ? (av < bv ? -1 : 1) : (av < bv ? 1 : -1);
      });
  }, [leads, filter, tierFilter, editionFilter, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
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

  return (
    <div className="min-h-screen animate-fade-in">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-24">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <span className="kicker text-slate-500">Scaling Up · Team Portal</span>
            <h1 className="display-2 mt-2.5">Assessment leads</h1>
            <p className="text-[13.5px] text-slate-400 mt-2 leading-relaxed">
              {loading ? 'Loading…' : `${leads.length} lead${leads.length === 1 ? '' : 's'} in MailerLite`}
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

        {/* Filters */}
        <SubtleCard className="!p-4 sm:!p-5 mb-5">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-3 items-center">
            <input
              type="search"
              value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Search name, email, company, role, industry…"
              className="input-premium block w-full"
            />
            <select
              value={editionFilter}
              onChange={e => setEditionFilter(e.target.value as typeof editionFilter)}
              className="input-premium block appearance-none pr-9 cursor-pointer bg-no-repeat bg-[right_0.85rem_center] bg-[length:14px_14px]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")" }}
              aria-label="Filter by edition"
            >
              <option value="scaling-up">Scaling Up only</option>
              <option value="caio">CAIO only</option>
              <option value="">All editions</option>
            </select>
            <select
              value={tierFilter}
              onChange={e => setTierFilter(e.target.value as typeof tierFilter)}
              className="input-premium block appearance-none pr-9 cursor-pointer bg-no-repeat bg-[right_0.85rem_center] bg-[length:14px_14px]"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E\")" }}
              aria-label="Filter by tier"
            >
              <option value="">All tiers</option>
              <option value="Leader">Leader</option>
              <option value="Adopter">Adopter</option>
              <option value="Explorer">Explorer</option>
            </select>
            {(filter || tierFilter || editionFilter !== 'scaling-up') && (
              <button onClick={() => { setFilter(''); setTierFilter(''); setEditionFilter('scaling-up'); }} className="btn-ghost text-[13px]">
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
                  <ThSort label="Date"    onClick={() => toggleSort('subscribedAt')} active={sortKey === 'subscribedAt'} dir={sortDir} />
                  <ThSort label="Name"    onClick={() => toggleSort('name')}         active={sortKey === 'name'} dir={sortDir} />
                  <th className="px-4 py-3">Email</th>
                  <ThSort label="Tier"    onClick={() => toggleSort('tier')}         active={sortKey === 'tier'} dir={sortDir} />
                  <ThSort label="Score"   onClick={() => toggleSort('pct')}          active={sortKey === 'pct'} dir={sortDir} />
                  <th className="px-4 py-3">Edition</th>
                  <ThSort label="Company" onClick={() => toggleSort('company')}      active={sortKey === 'company'} dir={sortDir} />
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">PDF</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500 text-[13px]">
                      {leads.length === 0 ? 'No subscribers in MailerLite yet.' : 'No leads match those filters.'}
                    </td>
                  </tr>
                )}
                {filtered.map(lead => (
                  <tr key={lead.id} className="hover:bg-white/[0.02] transition-colors"
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-400 tabular">
                      {lead.subscribedAt ? new Date(lead.subscribedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' }) : '—'}
                    </td>
                    <td className="px-4 py-3 text-white font-medium max-w-[200px] truncate">{lead.name || '—'}</td>
                    <td className="px-4 py-3 text-slate-400 max-w-[220px] truncate">{lead.email}</td>
                    <td className="px-4 py-3"><TierPill tier={lead.tier} /></td>
                    <td className="px-4 py-3 tabular text-white">{lead.pct ? `${lead.pct}%` : '—'}</td>
                    <td className="px-4 py-3 text-[12px] uppercase tracking-wider text-slate-400">
                      {lead.edition === 'scaling-up' ? 'SU' : lead.edition === 'caio' ? 'CAIO' : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-[180px] truncate">{lead.company || '—'}</td>
                    <td className="px-4 py-3 max-w-[160px] truncate text-slate-400">{lead.role || '—'}</td>
                    <td className="px-4 py-3 max-w-[140px] truncate text-slate-400">{lead.industry || '—'}</td>
                    <td className="px-4 py-3">
                      {lead.pdfUrl
                        ? <a href={lead.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-indigo-300 hover:text-indigo-200 underline underline-offset-2 text-[12.5px]">Open</a>
                        : <span className="text-slate-600">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="text-[11.5px] text-slate-500 text-center mt-6">
          Data pulled live from MailerLite each refresh. Older leads may show a blank tier / score until they retake the assessment on the current build.
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
