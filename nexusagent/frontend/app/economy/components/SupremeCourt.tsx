'use client';

/**
 * SupremeCourt.tsx — Real-time Court Sidebar
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses the shared socket singleton from lib/socket.ts.
 * Events are stored in a module-level cache so appeals fired before the
 * sidebar is opened are still shown when it mounts.
 *
 * Listens to:
 *   economy:court_appeal   { round:"filing"|"ruling", taskId, taskTitle,
 *                             agentName, agentId, courtOpinion, justiceVotes,
 *                             finalPayment, appealFee }
 *   economy:court_summoned { agentName, agentId, bankLabel, judgeName, taskId }
 *   economy:appeal_resolved{ taskId, verdict, courtOpinion, justiceVotes }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { socket } from '@/lib/socket';

// ── Module-level event cache so events persist across sidebar open/close ──────
interface CourtCase {
  id: string;
  taskId: string;
  taskTitle?: string;
  agentName: string;
  agentId?: string;
  type: 'appeal' | 'bank_default';
  status: 'pending' | 'overturned' | 'dismissed' | 'summoned';
  filedAt: string;
  verdictAt?: string;
  courtOpinion?: string;
  justiceVotes?: Array<{ name: string; vote: string; reason: string }>;
  finalPayment?: number;
  appealFee?: number;
  bankLabel?: string;
  judgeName?: string;
}

// Shared across all renders — survives sidebar close/open
const _caseStore: CourtCase[] = [];
let _caseListeners: Array<(cases: CourtCase[]) => void> = [];

function notifyListeners() {
  const snapshot = [..._caseStore];
  _caseListeners.forEach(fn => fn(snapshot));
}

function upsertCase(patch: Partial<CourtCase> & { id: string }) {
  const idx = _caseStore.findIndex(c => c.id === patch.id);
  if (idx === -1) {
    _caseStore.unshift(patch as CourtCase);
    if (_caseStore.length > 60) _caseStore.pop();
  } else {
    _caseStore[idx] = { ..._caseStore[idx], ...patch };
  }
  notifyListeners();
}

// ── Socket listeners — registered once at module level ────────────────────────
let _listenersRegistered = false;
function ensureSocketListeners() {
  if (_listenersRegistered || typeof window === 'undefined' || !socket) return;
  _listenersRegistered = true;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on('economy:court_appeal', (data: any) => {
    const isRuling = data.round === 'ruling';
    const caseId = `appeal-${data.taskId}`;

    if (isRuling) {
      upsertCase({
        id: caseId,
        status: data.result === 'overturned' ? 'overturned' : 'dismissed',
        verdictAt: new Date().toISOString(),
        courtOpinion: data.courtOpinion,
        justiceVotes: data.justiceVotes,
        finalPayment: data.finalPayment,
      });
    } else {
      upsertCase({
        id: caseId,
        taskId: data.taskId,
        taskTitle: data.taskTitle,
        agentName: data.agentName || 'Unknown',
        agentId: data.agentId,
        type: 'appeal',
        status: 'pending',
        filedAt: new Date().toISOString(),
        appealFee: data.appealFee,
      });
    }
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on('economy:court_summoned', (data: any) => {
    upsertCase({
      id: `summons-${data.taskId || Date.now()}`,
      taskId: data.taskId || 'bank',
      taskTitle: `Bank Default — ${data.bankLabel || 'Bank #2'}`,
      agentName: data.agentName || 'Unknown',
      agentId: data.agentId,
      type: 'bank_default',
      status: 'summoned',
      filedAt: new Date().toISOString(),
      bankLabel: data.bankLabel,
      judgeName: data.judgeName,
    });
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  socket.on('economy:appeal_resolved', (data: any) => {
    upsertCase({
      id: `appeal-${data.taskId}`,
      status: data.verdict === 'overturned' ? 'overturned' : 'dismissed',
      verdictAt: new Date().toISOString(),
      courtOpinion: data.courtOpinion,
      justiceVotes: data.justiceVotes,
    });
  });
}

// Register immediately (module load)
if (typeof window !== 'undefined') {
  ensureSocketListeners();
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

const STATUS_CONFIG = {
  pending:    { label: 'Pending',      color: 'text-amber-400',   bg: 'bg-amber-500/10',    border: 'border-amber-500/25',   dot: 'bg-amber-400 animate-pulse' },
  overturned: { label: 'Overturned ✓', color: 'text-emerald-400', bg: 'bg-emerald-950/20',  border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  dismissed:  { label: 'Dismissed',    color: 'text-slate-400',   bg: 'bg-slate-900/40',    border: 'border-slate-700/30',   dot: 'bg-slate-500' },
  summoned:   { label: 'Summoned',     color: 'text-orange-400',  bg: 'bg-orange-950/10',   border: 'border-orange-500/25',  dot: 'bg-orange-400 animate-pulse' },
};

// ── Component ─────────────────────────────────────────────────────────────────
export default function SupremeCourt() {
  const [cases, setCases] = useState<CourtCase[]>([..._caseStore]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Subscribe to store updates
  useEffect(() => {
    ensureSocketListeners(); // ensure registered even if socket loaded late
    const listener = (updated: CourtCase[]) => setCases([...updated]);
    _caseListeners.push(listener);
    setCases([..._caseStore]); // hydrate from cache immediately
    return () => {
      _caseListeners = _caseListeners.filter(fn => fn !== listener);
    };
  }, []);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  }, []);

  const pendingCount = cases.filter(c => c.status === 'pending' || c.status === 'summoned').length;

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <h2 className="text-sm font-bold text-white">Supreme Court</h2>
          {pendingCount > 0 && (
            <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/30 animate-pulse">
              {pendingCount} live
            </span>
          )}
          {cases.length > 0 && (
            <span className="bg-slate-700/40 text-slate-400 text-[10px] px-1.5 py-0.5 rounded-full">
              {cases.length}
            </span>
          )}
        </div>
        {cases.length > 0 && (
          <button
            onClick={() => { _caseStore.length = 0; setCases([]); setExpandedId(null); }}
            className="text-slate-600 hover:text-red-400 transition-colors text-[10px]"
            title="Clear all"
          >
            Clear
          </button>
        )}
      </div>

      {/* Cases list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
        {cases.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
            <span className="text-3xl opacity-20">🏛️</span>
            <p className="text-slate-500 text-xs">No appeals yet</p>
            <p className="text-slate-600 text-[10px]">Court events will appear here in real-time</p>
          </div>
        ) : (
          cases.map((c) => {
            const cfg = STATUS_CONFIG[c.status] ?? STATUS_CONFIG.pending;
            const isExpanded = expandedId === c.id;

            return (
              <div
                key={c.id}
                className={`rounded-xl border transition-all cursor-pointer ${cfg.bg} ${cfg.border} hover:brightness-110`}
                onClick={() => toggleExpand(c.id)}
              >
                {/* ── Card header ── */}
                <div className="px-3 py-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`text-[10px] font-bold ${cfg.color}`}>{cfg.label}</span>
                      {c.type === 'bank_default' && (
                        <span className="text-[10px] bg-orange-500/15 text-orange-300 px-1 rounded">Bank</span>
                      )}
                    </div>
                    <span className="text-slate-600 text-[10px] shrink-0">{timeAgo(c.filedAt)}</span>
                  </div>

                  {/* Agent name */}
                  <p className="text-white text-xs font-semibold leading-tight truncate">
                    {c.agentName}
                  </p>

                  {/* Task title */}
                  {c.taskTitle && (
                    <p className="text-slate-400 text-[10px] mt-0.5 line-clamp-1">{c.taskTitle}</p>
                  )}

                  {/* Bank info */}
                  {c.bankLabel && (
                    <p className="text-orange-400/70 text-[10px] mt-1">Default: {c.bankLabel}</p>
                  )}

                  {/* Appeal fee */}
                  {c.appealFee && (
                    <p className="text-amber-500/60 text-[10px] mt-1">Fee: {c.appealFee} USDC</p>
                  )}

                  {/* Expand hint */}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-slate-600 text-[10px] font-mono">#{c.taskId.slice(-6)}</span>
                    <span className="text-slate-600 text-[10px]">{isExpanded ? '▲ less' : '▼ details'}</span>
                  </div>
                </div>

                {/* ── Expanded details ── */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-3 py-3 space-y-3">

                    {/* Filed by */}
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Filed By</p>
                      <p className="text-slate-200 text-xs font-semibold">{c.agentName}</p>
                      {c.agentId && <p className="text-slate-600 text-[10px] font-mono">{c.agentId}</p>}
                    </div>

                    {/* Issue / Type */}
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Issue</p>
                      <p className="text-slate-300 text-[10px] leading-relaxed">
                        {c.type === 'bank_default'
                          ? `${c.agentName} defaulted on loan from ${c.bankLabel || 'Bank'}. Judge ${c.judgeName || '?'} summoned.`
                          : `${c.agentName} filed a payment betrayal appeal against their task employer.`}
                      </p>
                    </div>

                    {/* Verdict */}
                    {(c.status === 'overturned' || c.status === 'dismissed') && (
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Verdict</p>
                        <p className={`text-sm font-bold ${c.status === 'overturned' ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {c.status === 'overturned' ? '✅ OVERTURNED' : '❌ DISMISSED'}
                        </p>
                        {c.verdictAt && (
                          <p className="text-slate-600 text-[10px]">{timeAgo(c.verdictAt)}</p>
                        )}
                      </div>
                    )}

                    {/* Court opinion */}
                    {c.courtOpinion && (
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Court Opinion</p>
                        <p className="text-slate-300 text-[10px] leading-relaxed italic">{c.courtOpinion}</p>
                      </div>
                    )}

                    {/* Justice votes */}
                    {c.justiceVotes && c.justiceVotes.length > 0 && (
                      <div>
                        <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1.5">Justice Panel</p>
                        <div className="space-y-1.5">
                          {c.justiceVotes.map((v, i) => (
                            <div key={i} className="rounded-lg bg-slate-800/50 px-2.5 py-1.5">
                              <div className="flex items-center gap-1.5 mb-0.5">
                                <span className="text-[10px]">{v.vote === 'overturn' ? '✅' : '❌'}</span>
                                <span className="text-slate-200 text-[10px] font-semibold">{v.name}</span>
                              </div>
                              <p className="text-slate-500 text-[10px] leading-relaxed">{v.reason}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Forced payment */}
                    {c.finalPayment && c.status === 'overturned' && (
                      <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 px-2.5 py-2 space-y-0.5">
                        <p className="text-emerald-400 text-[10px] font-bold uppercase tracking-wider">Payment Executed</p>
                        <p className="text-emerald-300 text-sm font-bold">${c.finalPayment.toFixed(4)} USDC</p>
                        <p className="text-slate-500 text-[10px]">95% returned to appellant</p>
                      </div>
                    )}

                    {/* Pending state */}
                    {c.status === 'pending' && (
                      <div className="flex items-center gap-2 py-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping flex-shrink-0" />
                        <p className="text-amber-400 text-xs">Judges evaluating case…</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
