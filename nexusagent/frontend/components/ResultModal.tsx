'use client';

/**
 * ResultModal.tsx — Phase 5 update (light theme)
 * ──────────────────────────────────────────────────────────────────────────────
 * Modal showing full bounty result:
 *  - Alpha vs Beta submissions with score bars
 *  - Winner badge + judge reasoning
 *  - Compliance status per submission
 *  - Financial settlement + Arc Explorer link
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect } from 'react';
import type { Bounty } from '@/lib/api';

const ARC_EXPLORER = 'https://explorer.arc.io/tx/';

interface ResultModalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bounty: Bounty & { [key: string]: any };
  onClose: () => void;
}

function truncateTx(tx: string): string {
  if (!tx || tx.length < 16) return tx;
  return `${tx.slice(0, 10)}…${tx.slice(-8)}`;
}

export default function ResultModal({ bounty, onClose }: ResultModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const scoreA       = bounty.scoreA ?? 0;
  const scoreB       = bounty.scoreB ?? 0;
  const winner       = bounty.winner ?? '?';
  const winnerReason = bounty.winnerReason ?? 'No reasoning provided.';
  const rewardTxHash = bounty.rewardTxHash ?? bounty.winnerTxHash ?? '';
  const subAlpha     = bounty.submissions?.[0];
  const subBeta      = bounty.submissions?.[1];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">

        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-slate-900 text-lg font-bold">{bounty.title}</h2>
            <p className="text-slate-400 text-sm mt-0.5">Bounty Result · {bounty.id.slice(0, 8)}…</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-2xl leading-none p-1 rounded transition-colors" aria-label="Close">×</button>
        </div>

        <div className="p-6 space-y-5">

          {/* Winner banner */}
          <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-5 py-4 flex items-center gap-4">
            <span className="text-4xl">🏆</span>
            <div>
              <p className="text-amber-800 font-bold text-lg">
                Winner: Agent {winner.toUpperCase()}
              </p>
              <p className="text-amber-700/80 text-sm mt-1 max-w-2xl leading-relaxed">{winnerReason}</p>
            </div>
          </div>

          {/* Scores side by side */}
          <div className="grid grid-cols-2 gap-4">
            {/* Alpha */}
            <div className={`rounded-xl border p-4 ${winner === 'alpha' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-blue-600">⚡ Agent Alpha</span>
                  {winner === 'alpha' && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">WINNER</span>
                  )}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-slate-800 font-mono">{scoreA}</span>
                  <span className="text-slate-400 text-sm">/10</span>
                </div>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full" style={{ width: `${(scoreA / 10) * 100}%` }} />
              </div>
              {subAlpha && (
                <>
                  <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide mb-1">Submission Preview</p>
                  <p className="text-slate-600 text-xs leading-relaxed line-clamp-4">{subAlpha.content?.slice(0, 300)}…</p>
                </>
              )}
            </div>

            {/* Beta */}
            <div className={`rounded-xl border p-4 ${winner === 'beta' ? 'border-amber-300 bg-amber-50/50' : 'border-slate-200 bg-slate-50/50'}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-violet-600">🔮 Agent Beta</span>
                  {winner === 'beta' && (
                    <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">WINNER</span>
                  )}
                </div>
                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-bold text-slate-800 font-mono">{scoreB}</span>
                  <span className="text-slate-400 text-sm">/10</span>
                </div>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden mb-3">
                <div className="h-full bg-gradient-to-r from-violet-400 to-violet-500 rounded-full" style={{ width: `${(scoreB / 10) * 100}%` }} />
              </div>
              {subBeta && (
                <>
                  <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wide mb-1">Submission Preview</p>
                  <p className="text-slate-600 text-xs leading-relaxed line-clamp-4">{subBeta.content?.slice(0, 300)}…</p>
                </>
              )}
            </div>
          </div>

          {/* Settlement */}
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4">
            <h3 className="text-emerald-700 font-semibold text-sm uppercase tracking-wide mb-3 flex items-center gap-2">
              <span>💸</span> Settlement
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500 text-xs mb-1">Bounty Reward</p>
                <p className="text-slate-800 font-mono font-bold text-lg">${bounty.reward} <span className="text-sm font-normal text-slate-400">USDC</span></p>
              </div>
              <div>
                <p className="text-slate-500 text-xs mb-1">Reward TxHash</p>
                {rewardTxHash ? (
                  <a
                    href={`${ARC_EXPLORER}${rewardTxHash}`}
                    target="_blank" rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 font-mono text-xs underline underline-offset-2"
                    title={rewardTxHash}
                  >
                    {truncateTx(rewardTxHash)}
                  </a>
                ) : (
                  <span className="text-slate-400 text-xs">Not available</span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
            <span>Posted by: {bounty.postedBy}</span>
            <span>Completed: {new Date(bounty.updatedAt).toLocaleString()}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
