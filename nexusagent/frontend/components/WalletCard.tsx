'use client';

/**
 * WalletCard.tsx  — Phase 5 update (light theme, 7 wallets)
 * ──────────────────────────────────────────────────────────────────────────────
 * Displays one agent wallet card:
 *  - Agent name + icon
 *  - Live USDC balance with pulse animation on change
 *  - Wallet address (truncated)
 *  - Color-coded border per agent role
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useRef, useState } from 'react';
import type { AgentStatus } from '@/lib/api';

// ── Agent visual config ───────────────────────────────────────────────────────

interface AgentConfig {
  icon:       string;
  label:      string;
  border:     string;
  bg:         string;
  badge:      string;
  badgeText:  string;
  balanceColor: string;
}

const AGENT_CONFIG: Record<string, AgentConfig> = {
  MasterAgent: {
    icon: '🧠', label: 'Master',
    border: 'border-violet-200', bg: 'bg-violet-50/60',
    badge: 'bg-violet-100', badgeText: 'text-violet-700',
    balanceColor: 'text-violet-700',
  },
  ResearchAgent: {
    icon: '🔍', label: 'Research',
    border: 'border-blue-200', bg: 'bg-blue-50/60',
    badge: 'bg-blue-100', badgeText: 'text-blue-700',
    balanceColor: 'text-blue-700',
  },
  WriterAgent: {
    icon: '✍️', label: 'Writer',
    border: 'border-emerald-200', bg: 'bg-emerald-50/60',
    badge: 'bg-emerald-100', badgeText: 'text-emerald-700',
    balanceColor: 'text-emerald-700',
  },
  JudgeAgent: {
    icon: '⚖️', label: 'Judge',
    border: 'border-amber-200', bg: 'bg-amber-50/60',
    badge: 'bg-amber-100', badgeText: 'text-amber-700',
    balanceColor: 'text-amber-700',
  },
  TreasuryAgent: {
    icon: '🏦', label: 'Treasury',
    border: 'border-orange-200', bg: 'bg-orange-50/60',
    badge: 'bg-orange-100', badgeText: 'text-orange-700',
    balanceColor: 'text-orange-700',
  },
  DataAnalystAgent: {
    icon: '📊', label: 'Data Analyst',
    border: 'border-sky-200', bg: 'bg-sky-50/60',
    badge: 'bg-sky-100', badgeText: 'text-sky-700',
    balanceColor: 'text-sky-700',
  },
  FactCheckerAgent: {
    icon: '🔎', label: 'Fact Checker',
    border: 'border-rose-200', bg: 'bg-rose-50/60',
    badge: 'bg-rose-100', badgeText: 'text-rose-700',
    balanceColor: 'text-rose-700',
  },
};

const DEFAULT_CONFIG: AgentConfig = {
  icon: '🤖', label: 'Agent',
  border: 'border-slate-200', bg: 'bg-slate-50',
  badge: 'bg-slate-100', badgeText: 'text-slate-600',
  balanceColor: 'text-slate-700',
};

// ── Props ─────────────────────────────────────────────────────────────────────

interface WalletCardProps {
  agent: AgentStatus;
  compact?: boolean; // compact mode for specialist agents row
}

// ── Component ─────────────────────────────────────────────────────────────────

function getAgentConfig(agent: AgentStatus): AgentConfig {
  const nameKey = (agent.agentName || agent.name || '').toLowerCase();
  if (AGENT_CONFIG[agent.agentName]) return AGENT_CONFIG[agent.agentName];

  if (nameKey.includes('master')) {
    return { icon: '🧠', label: 'Master Agent', border: 'border-violet-200', bg: 'bg-violet-50/60', badge: 'bg-violet-100', badgeText: 'text-violet-700', balanceColor: 'text-violet-700' };
  }
  if (nameKey.includes('researcher') || nameKey.includes('research')) {
    return { icon: '🔍', label: 'Researcher', border: 'border-blue-200', bg: 'bg-blue-50/60', badge: 'bg-blue-100', badgeText: 'text-blue-700', balanceColor: 'text-blue-700' };
  }
  if (nameKey.includes('writer')) {
    return { icon: '✍️', label: 'Writer', border: 'border-emerald-200', bg: 'bg-emerald-50/60', badge: 'bg-emerald-100', badgeText: 'text-emerald-700', balanceColor: 'text-emerald-700' };
  }
  if (nameKey.includes('coder')) {
    return { icon: '💻', label: 'Coder', border: 'border-cyan-200', bg: 'bg-cyan-50/60', badge: 'bg-cyan-100', badgeText: 'text-cyan-700', balanceColor: 'text-cyan-700' };
  }
  if (nameKey.includes('analyst')) {
    return { icon: '📊', label: 'Data Analyst', border: 'border-sky-200', bg: 'bg-sky-50/60', badge: 'bg-sky-100', badgeText: 'text-sky-700', balanceColor: 'text-sky-700' };
  }
  if (nameKey.includes('translator')) {
    return { icon: '🌐', label: 'Translator', border: 'border-emerald-200', bg: 'bg-emerald-50/60', badge: 'bg-emerald-100', badgeText: 'text-emerald-800', balanceColor: 'text-emerald-800' };
  }
  if (nameKey.includes('summarizer')) {
    return { icon: '📝', label: 'Summarizer', border: 'border-blue-200', bg: 'bg-blue-50/60', badge: 'bg-blue-100', badgeText: 'text-blue-800', balanceColor: 'text-blue-800' };
  }
  if (nameKey.includes('copy')) {
    return { icon: '📢', label: 'Copywriter', border: 'border-amber-200', bg: 'bg-amber-50/60', badge: 'bg-amber-100', badgeText: 'text-amber-800', balanceColor: 'text-amber-800' };
  }
  if (nameKey.includes('seo')) {
    return { icon: '🚀', label: 'SEO Specialist', border: 'border-purple-200', bg: 'bg-purple-50/60', badge: 'bg-purple-100', badgeText: 'text-purple-800', balanceColor: 'text-purple-800' };
  }
  if (nameKey.includes('illus') || nameKey.includes('illustrator')) {
    return { icon: '🎨', label: 'Illustrator', border: 'border-pink-200', bg: 'bg-pink-50/60', badge: 'bg-pink-100', badgeText: 'text-pink-800', balanceColor: 'text-pink-800' };
  }
  if (nameKey.includes('editor')) {
    return { icon: '✂️', label: 'Editor', border: 'border-teal-200', bg: 'bg-teal-50/60', badge: 'bg-teal-100', badgeText: 'text-teal-800', balanceColor: 'text-teal-800' };
  }
  if (nameKey.includes('fact')) {
    return { icon: '🔎', label: 'Fact Checker', border: 'border-rose-200', bg: 'bg-rose-50/60', badge: 'bg-rose-100', badgeText: 'text-rose-800', balanceColor: 'text-rose-800' };
  }
  if (nameKey.includes('qa')) {
    return { icon: '🛡️', label: 'QA Tester', border: 'border-indigo-200', bg: 'bg-indigo-50/60', badge: 'bg-indigo-100', badgeText: 'text-indigo-800', balanceColor: 'text-indigo-800' };
  }
  if (nameKey.includes('comply') || nameKey.includes('compliance')) {
    return { icon: '📜', label: 'Compliance', border: 'border-slate-300', bg: 'bg-slate-100/60', badge: 'bg-slate-200', badgeText: 'text-slate-800', balanceColor: 'text-slate-800' };
  }
  if (nameKey.includes('nego') || nameKey.includes('negotiator')) {
    return { icon: '🤝', label: 'Negotiator', border: 'border-orange-200', bg: 'bg-orange-50/60', badge: 'bg-orange-100', badgeText: 'text-orange-800', balanceColor: 'text-orange-800' };
  }
  if (nameKey.includes('reputation')) {
    return { icon: '⭐', label: 'Reputation', border: 'border-yellow-200', bg: 'bg-yellow-50/60', badge: 'bg-yellow-100', badgeText: 'text-yellow-800', balanceColor: 'text-yellow-800' };
  }
  if (nameKey.includes('judge') || nameKey.includes('jury')) {
    return { icon: '⚖️', label: 'Dispute Judge', border: 'border-amber-200', bg: 'bg-amber-50/60', badge: 'bg-amber-100', badgeText: 'text-amber-700', balanceColor: 'text-amber-700' };
  }
  if (nameKey.includes('bank')) {
    return { icon: '🏦', label: 'Credit Bank', border: 'border-emerald-300', bg: 'bg-emerald-50/70', badge: 'bg-emerald-100', badgeText: 'text-emerald-800', balanceColor: 'text-emerald-800' };
  }
  if (nameKey.includes('treasury')) {
    return { icon: '🏦', label: 'Treasury Agent', border: 'border-emerald-300', bg: 'bg-emerald-50/70', badge: 'bg-emerald-100', badgeText: 'text-emerald-800', balanceColor: 'text-emerald-800' };
  }
  if (nameKey.includes('hiring')) {
    return { icon: '📢', label: 'Hiring Agent', border: 'border-indigo-200', bg: 'bg-indigo-50/60', badge: 'bg-indigo-100', badgeText: 'text-indigo-700', balanceColor: 'text-indigo-700' };
  }
  if (nameKey.includes('broker')) {
    return { icon: '⚡', label: 'Broker Agent', border: 'border-purple-200', bg: 'bg-purple-50/60', badge: 'bg-purple-100', badgeText: 'text-purple-700', balanceColor: 'text-purple-700' };
  }
  if (nameKey.includes('escrow')) {
    return { icon: '🔒', label: 'Escrow Agent', border: 'border-teal-200', bg: 'bg-teal-50/60', badge: 'bg-teal-100', badgeText: 'text-teal-700', balanceColor: 'text-teal-700' };
  }
  if (nameKey.includes('guild')) {
    return { icon: '🏛️', label: 'Guild Coordinator', border: 'border-purple-300', bg: 'bg-purple-50/70', badge: 'bg-purple-100', badgeText: 'text-purple-800', balanceColor: 'text-purple-800' };
  }

  return DEFAULT_CONFIG;
}

export default function WalletCard({ agent, compact = false }: WalletCardProps) {
  const config = getAgentConfig(agent);
  const prevBalance = useRef(agent.balance);
  const [isPulsing, setIsPulsing] = useState(false);

  const displayName = agent.name || agent.agentName;

  useEffect(() => {
    if (agent.balance !== prevBalance.current) {
      prevBalance.current = agent.balance;
      setIsPulsing(true);
      const t = setTimeout(() => setIsPulsing(false), 1500);
      return () => clearTimeout(t);
    }
  }, [agent.balance]);

  function truncateAddress(addr: string): string {
    if (!addr || addr.length < 12) return addr || '0x...';
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  if (compact) {
    return (
      <div
        className={`
          relative rounded-xl border ${config.border} ${config.bg}
          p-2.5 flex items-center gap-2.5
          transition-all duration-200 hover:shadow-md
          ${isPulsing ? 'ring-2 ring-offset-1 ring-blue-300' : ''}
        `}
      >
        <span className="text-lg shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-800 font-bold text-xs truncate" title={displayName}>{displayName}</p>
          <p className={`font-mono font-bold text-xs ${config.balanceColor} ${isPulsing ? 'scale-105 inline-block' : ''} transition-transform`}>
            ${agent.balance.toFixed(2)}
            <span className="text-[10px] font-normal text-slate-400 ml-1">USDC</span>
          </p>
        </div>
        <div className="shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${config.badge} ${config.badgeText}`}>
            {config.label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`
        relative rounded-xl border ${config.border} ${config.bg}
        p-3.5 transition-all duration-200 hover:shadow-md
        ${isPulsing ? 'ring-2 ring-offset-1 ring-blue-300 shadow-md' : 'shadow-sm'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <p className="text-slate-800 font-bold text-xs leading-tight truncate max-w-[170px]" title={displayName}>{displayName}</p>
            <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 font-semibold ${config.badge} ${config.badgeText}`}>
              {config.label} Agent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-600 text-[9px] font-medium">LIVE</span>
        </div>
      </div>

      {/* Balance */}
      <div className={`
        font-mono font-extrabold text-lg mb-1.5 transition-all duration-300
        ${isPulsing ? 'scale-105' : ''}
        ${config.balanceColor}
      `}>
        ${agent.balance.toFixed(2)}
        <span className="text-xs font-normal text-slate-400 ml-1">USDC</span>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 text-[9px]">Wallet</span>
        <code className="text-slate-600 text-[9px] font-mono bg-white/80 px-1.5 py-0.5 rounded border border-slate-200">
          {truncateAddress(agent.address)}
        </code>
      </div>
    </div>
  );
}
