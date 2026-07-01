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

export default function WalletCard({ agent, compact = false }: WalletCardProps) {
  const config = AGENT_CONFIG[agent.agentName] ?? DEFAULT_CONFIG;
  const prevBalance = useRef(agent.balance);
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (agent.balance !== prevBalance.current) {
      prevBalance.current = agent.balance;
      setIsPulsing(true);
      const t = setTimeout(() => setIsPulsing(false), 1500);
      return () => clearTimeout(t);
    }
  }, [agent.balance]);

  function truncateAddress(addr: string): string {
    if (!addr || addr.length < 12) return addr;
    return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  }

  if (compact) {
    // Compact card for specialist agents (DataAnalyst, FactChecker, Treasury)
    return (
      <div
        className={`
          relative rounded-xl border ${config.border} ${config.bg}
          p-3 flex items-center gap-3
          transition-all duration-200 hover:shadow-md
          ${isPulsing ? 'ring-2 ring-offset-1 ring-blue-300' : ''}
        `}
      >
        <span className="text-xl shrink-0">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="text-slate-700 font-semibold text-xs truncate">{agent.agentName}</p>
          <p className={`font-mono font-bold text-sm ${config.balanceColor} ${isPulsing ? 'scale-105 inline-block' : ''} transition-transform`}>
            ${agent.balance.toFixed(4)}
            <span className="text-xs font-normal text-slate-400 ml-1">USDC</span>
          </p>
        </div>
        <div className="shrink-0">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${config.badge} ${config.badgeText}`}>
            {config.label}
          </span>
        </div>
      </div>
    );
  }

  // Full card for core pipeline agents
  return (
    <div
      className={`
        relative rounded-xl border ${config.border} ${config.bg}
        p-4 transition-all duration-200 hover:shadow-md
        ${isPulsing ? 'ring-2 ring-offset-1 ring-blue-300 shadow-md' : 'shadow-sm'}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className="text-slate-800 font-semibold text-sm leading-tight">{agent.agentName}</p>
            <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full mt-0.5 font-semibold ${config.badge} ${config.badgeText}`}>
              {config.label} Agent
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-600 text-[10px] font-medium">LIVE</span>
        </div>
      </div>

      {/* Balance */}
      <div className={`
        font-mono font-bold text-xl mb-2 transition-all duration-300
        ${isPulsing ? 'scale-105' : ''}
        ${config.balanceColor}
      `}>
        ${agent.balance.toFixed(4)}
        <span className="text-xs font-normal text-slate-400 ml-1">USDC</span>
      </div>

      {/* Address */}
      <div className="flex items-center gap-1.5">
        <span className="text-slate-400 text-[10px]">Wallet</span>
        <code className="text-slate-500 text-[10px] font-mono bg-white/70 px-1.5 py-0.5 rounded border border-slate-100">
          {truncateAddress(agent.address)}
        </code>
      </div>
    </div>
  );
}
