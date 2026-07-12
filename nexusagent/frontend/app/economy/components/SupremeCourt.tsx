'use client';

/**
 * SupremeCourt.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Supreme Court sidebar panel for NexusAgent Economy dashboard.
 *
 * Shows all filed appeals with their verdicts in real time.
 * Fetches from GET /court/appeals and updates via Socket.io events:
 *   appeal_filed   — new case filed
 *   appeal_verdict — verdict rendered (forced payment or dismissed)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

interface Appeal {
  taskId: string;
  taskTitle?: string;
  taskStatus?: string;
  appealId: string;
  filedBy: string;
  filingFeeTxHash: string;
  issue: string;
  filedAt: string;
  verdict: string | null;
  verdictAt: string | null;
  forcedPaymentTxHash: string | null;
  judgeFeeCollected: number | null;
  evidence?: string;
  reasoning?: string;
  amountOwed?: number;
}

interface ExpandedVerdictData {
  forcedPayment?: {
    txHash: string;
    from: string | null;
    to: string;
    amount: number;
  } | null;
  judgeFee?: number | null;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string; dot: string }> = {
  pending:   { bg: 'bg-amber-500/10',  text: 'text-amber-400',  label: 'Pending',   dot: 'bg-amber-400 animate-pulse' },
  in_favor_of_appellant: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', label: 'Resolved ✓', dot: 'bg-emerald-400' },
  against_appellant:     { bg: 'bg-slate-600/20',   text: 'text-slate-400',   label: 'Dismissed',  dot: 'bg-slate-500' },
};

function getStatusKey(appeal: Appeal): string {
  if (!appeal.verdict) return 'pending';
  return appeal.verdict;
}

function shortTx(hash: string | null): string {
  if (!hash) return '—';
  return `${hash.slice(0, 8)}…${hash.slice(-4)}`;
}

function timeAgo(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return `${Math.floor(diff / 3600000)}h ago`;
}

export default function SupremeCourt() {
  const [appeals, setAppeals] = useState<(Appeal & Partial<ExpandedVerdictData>)[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  const fetchAppeals = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/court/appeals`);
      if (res.ok) {
        const data = await res.json();
        setAppeals(data.appeals || []);
      }
    } catch {
      // Silently fail — backend may not be running
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppeals();
    const interval = setInterval(fetchAppeals, 5000);
    return () => clearInterval(interval);
  }, [fetchAppeals]);

  // Real-time Socket.io updates
  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on('appeal_filed', (data: any) => {
      setFlash(`⚖️ Appeal filed: Task ${data.taskId} — ${data.filedBy}`);
      setTimeout(() => setFlash(null), 4000);
      fetchAppeals();
    });

    socket.on('appeal_verdict', (data: any) => {
      const isInFavor = data.verdict === 'in_favor_of_appellant';
      setFlash(
        isInFavor
          ? `✅ Verdict: IN FAVOR — Task ${data.taskId} — Forced payment executed`
          : `⚖️ Verdict: DISMISSED — Task ${data.taskId}`
      );
      setTimeout(() => setFlash(null), 5000);
      setAppeals(prev =>
        prev.map(a =>
          a.appealId === data.appealId
            ? {
                ...a,
                verdict: data.verdict,
                verdictAt: data.verdictAt,
                evidence: data.evidence,
                reasoning: data.reasoning,
                amountOwed: data.amountOwed,
                forcedPayment: data.forcedPayment,
                judgeFee: data.judgeFee,
                forcedPaymentTxHash: data.forcedPayment?.txHash || null,
                judgeFeeCollected: data.judgeFee || null,
              }
            : a
        )
      );
    });

    return () => { socket.disconnect(); };
  }, [fetchAppeals]);

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <h2 className="text-sm font-bold text-white">Supreme Court</h2>
          {appeals.length > 0 && (
            <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-red-500/30">
              {appeals.filter(a => !a.verdict).length} pending
            </span>
          )}
        </div>
        <button
          onClick={fetchAppeals}
          className="text-slate-500 hover:text-slate-300 transition-colors text-xs"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Flash notification */}
      {flash && (
        <div className="mb-2 px-3 py-2 rounded-lg bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium animate-pulse shrink-0">
          {flash}
        </div>
      )}

      {/* Cases list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
        {loading ? (
          <div className="flex items-center justify-center h-20 text-slate-500 text-xs">
            Loading cases...
          </div>
        ) : appeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center">
            <span className="text-2xl mb-1 opacity-30">🏛️</span>
            <p className="text-slate-500 text-xs">No appeals filed yet</p>
            <p className="text-slate-600 text-[10px] mt-0.5">POST /court/appeal to file one</p>
          </div>
        ) : (
          appeals.map((appeal) => {
            const statusKey = getStatusKey(appeal);
            const style = STATUS_STYLES[statusKey] || STATUS_STYLES.pending;
            const isExpanded = expandedId === appeal.appealId;

            return (
              <div
                key={appeal.appealId}
                className={`rounded-xl border transition-all cursor-pointer ${
                  statusKey === 'in_favor_of_appellant'
                    ? 'border-emerald-500/20 bg-emerald-950/20 hover:border-emerald-500/40'
                    : statusKey === 'against_appellant'
                    ? 'border-slate-700/40 bg-slate-900/40 hover:border-slate-600/50'
                    : 'border-red-500/20 bg-red-950/10 hover:border-red-500/35'
                }`}
                onClick={() => setExpandedId(isExpanded ? null : appeal.appealId)}
              >
                {/* Card header */}
                <div className="px-3 py-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono text-xs font-bold text-slate-300 shrink-0">
                        #{appeal.taskId}
                      </span>
                      <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${style.bg} ${style.text} shrink-0`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
                        {style.label}
                      </span>
                    </div>
                    <span className="text-slate-600 text-[10px] shrink-0">{timeAgo(appeal.filedAt)}</span>
                  </div>

                  {appeal.taskTitle && (
                    <p className="text-slate-400 text-[10px] mt-1 line-clamp-1">{appeal.taskTitle}</p>
                  )}

                  <p className="text-slate-300 text-xs mt-1 line-clamp-2">{appeal.issue}</p>

                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-slate-500 text-[10px]">
                      By: <span className="text-slate-400 font-mono">{appeal.filedBy.slice(0, 12)}</span>
                    </span>
                    <span className="text-amber-500/70 text-[10px]">Fee: 3 USDC ✓</span>
                  </div>
                </div>

                {/* Expanded verdict details */}
                {isExpanded && (
                  <div className="border-t border-white/5 px-3 py-3 space-y-2.5">
                    {/* Filing fee */}
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Filing Fee</p>
                      <p className="text-emerald-400 text-xs font-mono">3 USDC confirmed ✓</p>
                      <p className="text-slate-600 text-[10px] font-mono">{shortTx(appeal.filingFeeTxHash)}</p>
                    </div>

                    {appeal.verdict ? (
                      <>
                        {/* Verdict */}
                        <div>
                          <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Verdict</p>
                          <p className={`text-sm font-bold ${
                            appeal.verdict === 'in_favor_of_appellant' ? 'text-emerald-400' : 'text-slate-400'
                          }`}>
                            {appeal.verdict === 'in_favor_of_appellant' ? '✅ IN FAVOR OF APPELLANT' : '❌ DISMISSED'}
                          </p>
                          {appeal.verdictAt && (
                            <p className="text-slate-600 text-[10px]">{timeAgo(appeal.verdictAt)}</p>
                          )}
                        </div>

                        {/* Evidence */}
                        {appeal.evidence && (
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Evidence</p>
                            <p className="text-slate-300 text-[10px] leading-relaxed">{appeal.evidence}</p>
                          </div>
                        )}

                        {/* Reasoning */}
                        {appeal.reasoning && (
                          <div>
                            <p className="text-slate-500 text-[10px] uppercase tracking-wider mb-1">Judge's Reasoning</p>
                            <p className="text-slate-300 text-[10px] leading-relaxed italic">{appeal.reasoning}</p>
                          </div>
                        )}

                        {/* Forced payment details */}
                        {appeal.verdict === 'in_favor_of_appellant' && appeal.forcedPaymentTxHash && (
                          <div className="rounded-lg bg-emerald-950/30 border border-emerald-500/20 p-2.5 space-y-1">
                            <p className="text-emerald-400 text-[10px] uppercase tracking-wider font-bold">Forced Payment Executed</p>
                            <p className="text-slate-300 text-[10px]">
                              Amount: <span className="text-emerald-300 font-bold">{appeal.amountOwed?.toFixed(4) || '?'} USDC</span>
                              <span className="text-slate-500"> (95% to appellant)</span>
                            </p>
                            <p className="text-slate-500 text-[10px] font-mono">{shortTx(appeal.forcedPaymentTxHash)}</p>
                          </div>
                        )}

                        {/* Judge fee */}
                        {appeal.judgeFeeCollected && appeal.judgeFeeCollected > 0 && (
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-slate-500">👨‍⚖️ Judge fee (5%):</span>
                            <span className="text-amber-400 font-bold">{appeal.judgeFeeCollected.toFixed(6)} USDC</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2 py-2">
                        <div className="w-3 h-3 rounded-full bg-amber-400 animate-ping" />
                        <p className="text-amber-400 text-xs">Judge LLM evaluating case...</p>
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
