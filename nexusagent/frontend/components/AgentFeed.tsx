'use client';

/**
 * AgentFeed.tsx — Phase 8 update (real-time economy loop events)
 * ──────────────────────────────────────────────────────────────────────────────
 * Live scrolling activity feed for all Socket.io agent events.
 * Now listens to BOTH agentActivity (old bounty pipeline) AND economy:* events
 * so the feed updates in real-time when the economy loop is running.
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

  // ── Economy Loop events (Phase 8: real-time economy feed) ─────────────────
  'economy:task_spawned':      { icon: '📋', label: 'Task Spawned',        bg: 'bg-indigo-50',   border: 'border-indigo-200',  text: 'text-indigo-700'  },
  'economy:agent_hired':       { icon: '🤝', label: 'Agent Hired',         bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700'    },
  'economy:bidding_started':   { icon: '🔔', label: 'Bidding Started',     bg: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700'  },
  'economy:bid_placed':        { icon: '💬', label: 'Bid Placed',          bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-600'   },
  'economy:work_started':      { icon: '⚙️', label: 'Work Started',        bg: 'bg-blue-50',     border: 'border-blue-200',    text: 'text-blue-700'    },
  'economy:work_completed':    { icon: '✨', label: 'Work Completed',      bg: 'bg-sky-50',      border: 'border-sky-200',     text: 'text-sky-700'     },
  'economy:task_complete':     { icon: '✅', label: 'Task Complete',       bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700' },
  'economy:task_failed':       { icon: '❌', label: 'Task Failed',         bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700'     },
  'economy:loan_issued':       { icon: '🏦', label: 'Loan Issued',         bg: 'bg-orange-50',   border: 'border-orange-200',  text: 'text-orange-700'  },
  'economy:loan_repaid':       { icon: '💚', label: 'Loan Repaid',         bg: 'bg-emerald-50',  border: 'border-emerald-200', text: 'text-emerald-700' },
  'economy:guild_formed':      { icon: '🏛️', label: 'Guild Formed',        bg: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700'  },
  'economy:guild_collaboration':{ icon: '🤜', label: 'Guild Collab',       bg: 'bg-violet-50',   border: 'border-violet-200',  text: 'text-violet-700'  },
  'economy:court_appeal':      { icon: '⚖️', label: 'Court Appeal',        bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700'     },
  'economy:court_summoned':    { icon: '⚖️', label: 'Court Summoned',      bg: 'bg-red-50',      border: 'border-red-200',     text: 'text-red-700'     },
  'economy:escrow_locked':     { icon: '🔒', label: 'Escrow Locked',       bg: 'bg-slate-50',    border: 'border-slate-200',   text: 'text-slate-600'   },
  'economy:subcontract_hired': { icon: '🔗', label: 'Subcontracted',       bg: 'bg-sky-50',      border: 'border-sky-200',     text: 'text-sky-700'     },
  'economy:education_purchased':{ icon: '🎓', label: 'Education',          bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700'   },
  'economy:education_started': { icon: '📖', label: 'Studying',            bg: 'bg-amber-50',    border: 'border-amber-200',   text: 'text-amber-700'   },
  'economy:education_complete':{ icon: '🎓', label: 'Skill Learned',       bg: 'bg-amber-50',    border: 'border-amber-300',   text: 'text-amber-800'   },

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
    // ── Old bounty pipeline events ──────────────────────────────────────────
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
    case 'bounty_won':           return `🏆 Task won! Reward: $${data.reward ?? data.amount ?? '?'} USDC`;
    case 'bounty_completed':     return `✅ Bounty complete! USDC moved: $${Number(data.totalUsdcMoved ?? data.earned ?? 0).toFixed(4)}`;
    case 'reward_released':      return `Reward released: $${data.amount ?? '?'} USDC → ${String(data.winner ?? '')} tx: ${String(data.txHash ?? '').slice(0, 14)}…`;
    case 'budget_allocated':     return `Budget allocated: Research 25% | Writer 30% | DataAnalyst 20% | FactCheck 15% | Reserve 10%`;
    case 'wallet_refilled':      return data.refilled?.length > 0
      ? `Wallets refilled: ${(data.refilled as string[]).join(', ')} via ${data.methodUsed ?? 'fallback'}`
      : `All agent wallets healthy — no refills needed`;
    case 'stats_pulled':         return `Market stats extracted from ${data.articleId ?? ''}: ${data.statCount ?? '?'} data points`;
    case 'fact_checked':         return `Fact-check ${data.verified ? '✅ verified' : '⚠️ disputed'} — confidence ${data.confidence ?? '?'}%: ${String(data.note ?? '').slice(0, 80)}`;
    case 'reputation_updated':   return `Reputation updated: Pipeline ${String(data.winner ?? data.pipelineId ?? '').toUpperCase()} — Score A: ${data.scoreA ?? '?'} | B: ${data.scoreB ?? '?'}`;
    case 'leaderboard_updated':  return `Leaderboard updated — ${Array.isArray(data.leaderboard) ? data.leaderboard.length : 0} pipelines ranked`;
    case 'error':                return `Error: ${data.message ?? 'Unknown error'}`;

    // ── Economy loop events (real-time) ────────────────────────────────────
    case 'economy:task_spawned':
      return `📋 Task: "${String(data.task?.title ?? '').slice(0, 50)}" — $${data.task?.budgetUSDC ?? '?'} USDC [${data.tier ?? 'medium'}]`;
    case 'economy:agent_hired':
      return `🤝 ${data.agentName ?? 'Agent'} hired for $${data.finalPrice ?? '?'} USDC on task`;
    case 'economy:bidding_started':
      return `🔔 Bidding open — ${data.eligibleAgentCount ?? '?'} agents eligible`;
    case 'economy:bid_placed':
      return `💬 ${data.agentName ?? 'Agent'} placed bid of $${data.bid?.bidAmountUSDC?.toFixed(2) ?? '?'} USDC`;
    case 'economy:work_started':
      return `⚙️ ${data.agentName ?? 'Agent'} started working on task`;
    case 'economy:work_completed':
      return `✨ Work completed — result ready for verification`;
    case 'economy:task_complete':
      return `✅ ${data.agentName ?? 'Agent'} earned $${data.earned ?? '?'} USDC (Quality: ${data.qualityScore ?? '?'}/100)`;
    case 'economy:task_failed':
      return `❌ Task failed: ${data.reason ?? 'Quality below threshold'}`;
    case 'economy:loan_issued':
      return `🏦 ${data.agentName ?? 'Agent'} got $${data.amount ?? '?'} USDC loan from ${data.bankLabel ?? data.bankId ?? 'Bank'} at ${((data.interestRate ?? 0) * 100).toFixed(0)}% interest`;
    case 'economy:loan_repaid':
      return `💚 ${data.agentName ?? 'Agent'} repaid $${data.amount ?? '?'} USDC to ${data.bankId ?? 'Bank'}`;
    case 'economy:guild_formed':
      return `🏛️ Guild "${data.guildName ?? 'Unknown'}" formed — ${data.members?.length ?? 2} agents collaborating`;
    case 'economy:guild_collaboration':
      return `🤜 Guild collaboration on "${String(data.guildName ?? '').slice(0, 30)}" — lead: ${data.leadAgentId ?? '?'}`;
    case 'economy:court_appeal':
      return `⚖️ Court appeal ${data.round === 'ruling' ? `— RULED: ${data.result?.toUpperCase() ?? '?'}` : 'filed'} for "${String(data.taskTitle ?? '').slice(0, 30)}"`;
    case 'economy:court_summoned':
      return `⚖️ ${data.agentName ?? 'Agent'} summoned to court by ${data.bankLabel ?? 'Bank'} — Judge: ${data.judgeName ?? '?'}`;
    case 'economy:escrow_locked':
      return `🔒 Escrow locked: $${data.amount ?? '?'} USDC held by ${data.escrowAgentId ?? 'escrow'}`;
    case 'economy:subcontract_hired':
      return `🔗 ${data.primaryAgentName ?? '?'} subcontracted ${data.subAgentName ?? '?'} for $${data.fee?.toFixed(2) ?? '?'} USDC`;
    case 'economy:education_purchased':
      return `🎓 ${data.agentName ?? 'Agent'} learned "${data.skill ?? '?'}" for $${data.cost ?? '?'} USDC`;
    case 'economy:education_started':
      return `📖 ${data.agentName ?? 'Agent'} started studying "${data.skill?.replace(/-/g, ' ') ?? '?'}" (+${data.repGain ?? '?'} rep)`;
    case 'economy:education_complete':
      return `🎓 ${data.agentName ?? 'Agent'} mastered "${data.skill?.replace(/-/g, ' ') ?? '?'}"! Rep now ${data.newReputation ?? '?'}`;

    default: return JSON.stringify(data).slice(0, 120);
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AgentFeed() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const bottomRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [entries]);

  // Generic handler that adds any event to the feed
  const addEntry = useCallback((event: string, data: Record<string, any>) => {
    const entry: FeedEntry = {
      id:        `${Date.now()}-${Math.random()}`,
      event,
      data,
      timestamp: new Date().toISOString(),
    };
    setEntries((prev) => [...prev.slice(-299), entry]);
  }, []);

  const handleActivity = useCallback((payload: AgentActivityPayload) => {
    addEntry(payload.event, payload.data);
  }, [addEntry]);

  useEffect(() => {
    if (!socket) return;

    // Old bounty pipeline events
    socket.on('agentActivity', handleActivity);

    // Economy loop events — subscribe to all for real-time feed
    const ECONOMY_EVENTS = [
      'economy:task_spawned',
      'economy:agent_hired',
      'economy:bidding_started',
      'economy:bid_placed',
      'economy:work_started',
      'economy:work_completed',
      'economy:task_complete',
      'economy:task_failed',
      'economy:loan_issued',
      'economy:loan_repaid',
      'economy:guild_formed',
      'economy:guild_collaboration',
      'economy:court_appeal',
      'economy:court_summoned',
      'economy:escrow_locked',
      'economy:subcontract_hired',
      'economy:education_purchased',
      'economy:education_started',
      'economy:education_complete',
    ] as const;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handlers: Array<{ event: string; fn: (data: any) => void }> = ECONOMY_EVENTS.map(ev => ({
      event: ev,
      fn: (data: any) => addEntry(ev, data ?? {}),
    }));

    handlers.forEach(({ event, fn }) => socket.on(event, fn));

    return () => {
      socket.off('agentActivity', handleActivity);
      handlers.forEach(({ event, fn }) => socket.off(event, fn));
    };
  }, [handleActivity, addEntry]);

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
            <p className="text-xs mt-1 text-slate-300">Post a bounty or start the economy engine</p>
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
