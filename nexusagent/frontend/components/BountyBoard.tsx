'use client';

/**
 * BountyBoard.tsx — Phase 5 update (light theme)
 * ──────────────────────────────────────────────────────────────────────────────
 * Left panel: bounty posting form, demo button, bounty list with status badges.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useState } from 'react';
import type { Bounty, CreateBountyPayload } from '@/lib/api';
import { createBounty, triggerDemo, processBounty } from '@/lib/api';
// Removed ResultModal as output will be shown in the right sidebar

// ── Status badge config ───────────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  open:        { label: 'Open',        className: 'bg-slate-100 text-slate-600 border-slate-200' },
  in_progress: { label: 'Processing…', className: 'bg-blue-100 text-blue-700 border-blue-200 animate-pulse' },
  judging:     { label: 'Judging',     className: 'bg-violet-100 text-violet-700 border-violet-200 animate-pulse' },
  completed:   { label: 'Completed',   className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  cancelled:   { label: 'Cancelled',   className: 'bg-red-100 text-red-600 border-red-200' },
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface BountyBoardProps {
  bounties:         Bounty[];
  onBountyCreated:  (bounty: Bounty) => void;
  onDemoStarted:    (bountyId: string) => void;
  onRefresh:        () => void;
  onBountySelect:   (bounty: Bounty) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BountyBoard({
  bounties, onBountyCreated, onDemoStarted, onRefresh, onBountySelect
}: BountyBoardProps) {
  const [title, setTitle]         = useState('');
  const [desc, setDesc]           = useState('');
  const [reward, setReward]       = useState('');
  const [posting, setPosting]     = useState(false);
  const [postError, setPostError] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);

  // ── Post new bounty ───────────────────────────────────────────────────────
  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    setPostError('');
    const rewardNum = parseFloat(reward);
    if (!title.trim() || !desc.trim() || isNaN(rewardNum) || rewardNum <= 0) {
      setPostError('Fill all fields with a valid reward amount.');
      return;
    }
    setPosting(true);
    try {
      const payload: CreateBountyPayload = {
        title: title.trim(), description: desc.trim(), reward: rewardNum, postedBy: 'dashboard-user',
      };
      const newBounty = await createBounty(payload);
      onBountyCreated(newBounty);
      setTitle(''); setDesc(''); setReward('');
    } catch (err) {
      setPostError(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setPosting(false);
    }
  }

  // ── Run demo ──────────────────────────────────────────────────────────────
  async function handleDemo() {
    setDemoLoading(true);
    try {
      const result = await triggerDemo();
      onDemoStarted(result.bountyId);
      setTimeout(onRefresh, 300);
    } catch (err) {
      console.error('Demo failed:', err);
    } finally {
      setDemoLoading(false);
    }
  }

  // ── Process pending ───────────────────────────────────────────────────────
  async function handleProcess(bountyId: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await processBounty(bountyId);
      onRefresh();
    } catch (err) {
      console.error('Process failed:', err);
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full">

      {/* ── Post Bounty Form ─────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-white p-5 shadow-sm">
        <h2 className="text-slate-800 font-bold text-sm uppercase tracking-widest mb-4 flex items-center gap-2">
          <span className="bg-violet-100 text-violet-600 w-7 h-7 rounded-lg flex items-center justify-center text-base">📋</span>
          Post a Bounty
        </h2>

        <form onSubmit={handlePost} className="space-y-3">
          <div>
            <label className="text-slate-500 text-xs uppercase tracking-wide block mb-1 font-semibold">Title</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Research latest DeFi trends"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
              disabled={posting}
            />
          </div>

          <div>
            <label className="text-slate-500 text-xs uppercase tracking-wide block mb-1 font-semibold">Description</label>
            <textarea
              value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="Describe what you need AI agents to accomplish…"
              rows={3}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all resize-none"
              disabled={posting}
            />
          </div>

          <div>
            <label className="text-slate-500 text-xs uppercase tracking-wide block mb-1 font-semibold">Reward (USDC)</label>
            <input
              type="number" value={reward} onChange={(e) => setReward(e.target.value)}
              placeholder="0.05" step="0.01" min="0.01"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 placeholder-slate-300 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all font-mono"
              disabled={posting}
            />
          </div>

          {postError && <p className="text-red-500 text-xs">{postError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit" disabled={posting}
              className="flex-1 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl py-2.5 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {posting ? '⏳ Posting…' : '📋 Post Bounty'}
            </button>

            <button
              type="button" onClick={handleDemo} disabled={demoLoading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 disabled:from-slate-200 disabled:to-slate-200 disabled:text-slate-400 text-white font-semibold text-sm rounded-xl py-2.5 transition-all duration-200 shadow-sm hover:shadow-md"
            >
              {demoLoading ? '⏳ Starting…' : '🚀 Run Demo'}
            </button>
          </div>
        </form>
      </div>

      {/* ── Bounty List ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-slate-700 font-semibold text-sm uppercase tracking-widest">Bounties</h2>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">{bounties.length} total</span>
            <button onClick={onRefresh} className="text-slate-400 hover:text-slate-600 text-sm transition-colors p-0.5" title="Refresh">↻</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 pr-1">
          {bounties.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-slate-400">
              <span className="text-3xl mb-2">📭</span>
              <p className="text-xs">No bounties yet — post one above!</p>
            </div>
          )}

          {bounties.map((b) => {
            const statusStyle = STATUS_STYLES[b.status] ?? STATUS_STYLES['open'];
            return (
              <div
                key={b.id}
                onClick={() => b.status === 'completed' && onBountySelect(b)}
                className={`
                  rounded-xl border border-slate-200 bg-white p-4 shadow-sm
                  transition-all duration-200
                  ${b.status === 'completed'
                    ? 'cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 hover:shadow-md'
                    : 'hover:border-slate-300'
                  }
                `}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="text-slate-800 text-sm font-semibold leading-tight flex-1">{b.title}</p>
                  <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusStyle.className}`}>
                    {statusStyle.label}
                  </span>
                </div>

                <p className="text-slate-400 text-xs line-clamp-2 mb-3">{b.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-emerald-600 font-mono font-bold text-sm">${b.reward}</span>
                    <span className="text-slate-400 text-xs">USDC</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {b.status === 'completed' && (
                      <span className="text-amber-600 text-xs font-semibold">🏆 {String(b.winner ?? '').toUpperCase()}</span>
                    )}
                    {b.status === 'open' && (
                      <button
                        onClick={(e) => handleProcess(b.id, e)}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2.5 py-1 rounded-lg transition-colors font-medium"
                      >
                        ▶ Run
                      </button>
                    )}
                    {b.status === 'completed' && (
                      <span className="text-slate-400 text-xs">View results →</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
