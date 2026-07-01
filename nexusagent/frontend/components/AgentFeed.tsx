'use client';

/**
 * AgentFeed.tsx — Phase 5 update (light theme + new event types)
 * ──────────────────────────────────────────────────────────────────────────────
 * Live scrolling activity feed for all Socket.io agent events.
 * Phase 5 new event types: budget_allocated, wallet_refilled, fact_checked,
 * stats_pulled, reputation_updated, compliance_checked.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AgentActivityPayload } from '@/lib/socket';
import { socket } from '@/lib/socket';

// ── Event style config ────────────────────────────────────────────────────────

interface EventStyle {
  icon:   string;
  label:  string;
  bg:     string;
  border: string;
  text:   string;
}

const EVENT_STYLES: Record<string, EventStyle> = {
  // ── Core flow ──────────────────────────────────────────────────────────────
  'bounty:created':    { icon: '📋', label: 'Bounty Created',    bg: 'bg-slate-50',     border: 'border-slate-200',   text: 'text-slate-600' },
  bounty_processing:   { icon: '⚡', label: 'Processing',        bg: 'bg-blue-50',      border: 'border-blue-200',    text: 'text-blue-700'  },
  agent_hired:         { icon: '🤝', label: 'Agent Hired',       bg: 'bg-blue-50',      border: 'border-blue-200',    text: 'text-blue-700'  },
  pipeline_complete:   { icon: '🏁', label: 'Pipeline Done',     bg: 'bg-sky-50',       border: 'border-sky-200',     text: 'text-sky-700'   },
  submissions_ready:   { icon: '📬', label: 'Submissions Ready', bg: 'bg-indigo-50',    border: 'border-indigo-200',  text: 'text-indigo-700'},

  // ── Payments ───────────────────────────────────────────────────────────────
  payment_sent:        { icon: '💸', label: 'Payment Sent',      bg: 'bg-emerald-50',   border: 'border-emerald-200', text: 'text-emerald-700' },
  payment_made:        { icon: '✅', label: 'Payment Confirmed', bg: 'bg-emerald-50',   border: 'border-emerald-200', text: 'text-emerald-700' },
  reward_released:     { icon: '💰', label: 'Reward Released',   bg: 'bg-amber-50',     border: 'border-amber-200',   text: 'text-amber-700'   },

  // ── Research / content ─────────────────────────────────────────────────────
  research_started:    { icon: '🔍', label: 'Research Started',  bg: 'bg-slate-50',     border: 'border-slate-200',   text: 'text-slate-600' },
  research_complete:   { icon: '📚', label: 'Research Done',     bg: 'bg-blue-50',      border: 'border-blue-200',    text: 'text-blue-700'  },
  paywall_hit:         { icon: '🚧', label: 'Paywall Hit',       bg: 'bg-red-50',       border: 'border-red-200',     text: 'text-red-700'   },
  content_unlocked:    { icon: '🔓', label: 'Content Unlocked',  bg: 'bg-emerald-50',   border: 'border-emerald-200', text: 'text-emerald-700' },

  // ── Judge ──────────────────────────────────────────────────────────────────
  judging_started:     { icon: '⚖️', label: 'Judging',           bg: 'bg-violet-50',    border: 'border-violet-200',  text: 'text-violet-700'  },
  judging_complete:    { icon: '🏛️', label: 'Verdict Ready',     bg: 'bg-violet-50',    border: 'border-violet-200',  text: 'text-violet-700'  },
  compliance_checked:  { icon: '🛡️', label: 'Compliance Check',  bg: 'bg-indigo-50',    border: 'border-indigo-200',  text: 'text-indigo-700'  },
  bounty_won:          { icon: '🏆', label: 'Winner Declared',   bg: 'bg-amber-50',     border: 'border-amber-200',   text: 'text-amber-700'   },
  bounty_completed:    { icon: '🎉', label: 'Completed',         bg: 'bg-amber-50',     border: 'border-amber-300',   text: 'text-amber-800'   },

  // ── Phase 5 NEW events ─────────────────────────────────────────────────────
  budget_allocated:    { icon: '🏦', label: 'Budget Allocated',  bg: 'bg-orange-50',    border: 'border-orange-200',  text: 'text-orange-700'  },
  wallet_refilled:     { icon: '⛽', label: 'Wallet Refilled',   bg: 'bg-orange-50',    border: 'border-orange-200',  text: 'text-orange-700'  },
  stats_pulled:        { icon: '📊', label: 'Stats Pulled',      bg: 'bg-sky-50',       border: 'border-sky-200',     text: 'text-sky-700'     },
  fact_checked:        { icon: '🔎', label: 'Fact Checked',      bg: 'bg-rose-50',      border: 'border-rose-200',    text: 'text-rose-700'    },
  reputation_updated:  { icon: '⭐', label: 'Reputation',        bg: 'bg-yellow-50',    border: 'border-yellow-200',  text: 'text-yellow-700'  },
  leaderboard_updated: { icon: '🏅', label: 'Leaderboard',       bg: 'bg-yellow-50',    border: 'border-yellow-200',  text: 'text-yellow-700'  },

  // ── Misc ───────────────────────────────────────────────────────────────────
  draft_ready:         { icon: '📝', label: 'Draft Ready',       bg: 'bg-slate-50',     border: 'border-slate-200',   text: 'text-slate-600'   },
  error:               { icon: '❌', label: 'Error',             bg: 'bg-red-50',       border: 'border-red-200',     text: 'text-red-700'     },
};

const DEFAULT_STYLE: EventStyle = {
  icon: '📡', label: 'Event',
  bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-600',
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedEntry {
  id:        string;
  event:     string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data:      Record<string, any>;
  timestamp: string;
}

// ── Message builder ────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildMessage(event: string, data: Record<string, any>): string {
  switch (event) {
    case 'bounty:created':       return `New bounty: "${data.title ?? 'Untitled'}" — $${data.reward ?? '?'} USDC`;
    case 'bounty_processing':
      if (data.agentId) return `Agent ${String(data.agentId).toUpperCase()} starting ${data.stage ?? 'research'}: "${data.topic ?? data.title ?? ''}"`;
      return `Processing: "${data.title ?? data.bountyId ?? ''}"`;
    case 'agent_hired':          return `${data.pipeline ? `Pipeline ${String(data.pipeline).toUpperCase()}` : String(data.agentId ?? '').toUpperCase()} hired ${data.agent ?? 'agent'} for ${data.stage ?? 'task'}`;
    case 'payment_sent':         return `$${data.amount ?? '?'} USDC → ${data.to ?? '?'}  tx: ${String(data.txHash ?? '').slice(0, 14)}…`;
    case 'payment_made':         return `Payment confirmed: $${data.amount ?? '?'} USDC  tx: ${String(data.txHash ?? '').slice(0, 14)}…`;
    case 'research_started':     return `Research started: "${data.topic ?? ''}" budget: $${data.budget ?? '?'}`;
    case 'paywall_hit':          return `Paywall: article ${data.articleId ?? ''} — $${data.cost ?? data.price ?? '?'} USDC (${data.agent ?? 'agent'})`;
    case 'content_unlocked':     return `Article unlocked: "${data.title ?? data.articleId ?? ''}" (${data.agent ?? ''})`;
    case 'research_complete':    return `Research done — summary: ${String(data.summary ?? '').slice(0, 80)}…`;
    case 'pipeline_complete':    return `Pipeline ${String(data.agentId ?? '').toUpperCase()} done — spent $${Number(data.totalSpent ?? 0).toFixed(4)} USDC`;
    case 'submissions_ready':    return `Submissions ready — Alpha: "${data.alphaTitle ?? ''}" vs Beta: "${data.betaTitle ?? ''}"`;
    case 'judging_started':      return `Judge evaluating submissions for ${String(data.bountyId ?? '').slice(0, 8)}…`;
    case 'compliance_checked':   return `Compliance: Agent A ${data.complianceA?.approved ? '✅' : '❌'} | Agent B ${data.complianceB?.approved ? '✅' : '❌'}`;
    case 'bounty_won':           return `🏆 Winner: Agent ${String(data.winner ?? '').toUpperCase()}! Reward: $${data.reward ?? data.amount ?? '?'} USDC`;
    case 'bounty_completed':     return `Bounty complete! Winner: ${String(data.winner ?? '').toUpperCase()} | USDC moved: $${Number(data.totalUsdcMoved ?? 0).toFixed(4)}`;
    case 'reward_released':      return `Reward released: $${data.amount ?? '?'} USDC → ${String(data.winner ?? '')} tx: ${String(data.txHash ?? '').slice(0, 14)}…`;
    // Phase 5 new events
    case 'budget_allocated':     return `Budget allocated: Research 25% | Writer 30% | DataAnalyst 20% | FactCheck 15% | Reserve 10%`;
    case 'wallet_refilled':      return data.refilled?.length > 0
      ? `Wallets refilled: ${(data.refilled as string[]).join(', ')} via ${data.methodUsed ?? 'fallback'}`
      : `All agent wallets healthy — no refills needed`;
    case 'stats_pulled':         return `Market stats extracted from ${data.articleId ?? ''}: ${data.statCount ?? '?'} data points`;
    case 'fact_checked':         return `Fact-check ${data.verified ? '✅ verified' : '⚠️ disputed'} — confidence ${data.confidence ?? '?'}%: ${String(data.note ?? '').slice(0, 80)}`;
    case 'reputation_updated':   return `Reputation updated: Pipeline ${String(data.winner ?? data.pipelineId ?? '').toUpperCase()} — Score A: ${data.scoreA ?? '?'} | B: ${data.scoreB ?? '?'}`;
    case 'leaderboard_updated':  return `Leaderboard updated — ${Array.isArray(data.leaderboard) ? data.leaderboard.length : 0} pipelines ranked`;
    case 'error':                return `Error: ${data.message ?? 'Unknown error'}`;
    default:                     return JSON.stringify(data).slice(0, 120);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const bottomRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  const handleActivity = useCallback((payload: AgentActivityPayload) => {
    const entry: FeedEntry = {
      id:        `${Date.now()}-${Math.random()}`,
      event:     payload.event,
      data:      payload.data,
      timestamp: payload.timestamp,
    };
    setEntries((prev) => [...prev.slice(-299), entry]);
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('agentActivity', handleActivity);
    return () => { socket.off('agentActivity', handleActivity); };
  }, [handleActivity]);

  function formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
      });
    } catch { return '--:--:--'; }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <h2 className="text-slate-700 font-semibold text-sm uppercase tracking-widest">
            Live Agent Feed
          </h2>
        </div>
        <span className="text-slate-400 text-xs">{entries.length} events</span>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
        {entries.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400">
            <span className="text-4xl mb-3">📡</span>
            <p className="text-sm font-medium">Waiting for agent activity…</p>
            <p className="text-xs mt-1 text-slate-300">Post a bounty or run the demo to start</p>
          </div>
        )}

        {entries.map((entry) => {
          const style   = EVENT_STYLES[entry.event] ?? DEFAULT_STYLE;
          const message = buildMessage(entry.event, entry.data);

          return (
            <div
              key={entry.id}
              className={`
                flex gap-2.5 rounded-lg border px-3 py-2
                ${style.bg} ${style.border}
                animate-slideInUp
              `}
            >
              <span className="text-base shrink-0 mt-0.5">{style.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${style.text}`}>
                    {style.label}
                  </span>
                  <span className="text-slate-400 text-[10px] font-mono">{formatTime(entry.timestamp)}</span>
                </div>
                <p className="text-slate-600 text-xs leading-relaxed break-words">{message}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
