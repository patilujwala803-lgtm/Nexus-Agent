'use client';

/**
 * page.tsx — NexusAgent Command Center (Phase 5 — Light Theme)
 * ──────────────────────────────────────────────────────────────────────────────
 * 3-column dashboard layout:
 *   [Header — logo + stats + connection]
 *   ┌──────────────┬───────────────────┬────────────────────────────────────┐
 *   │ BountyBoard  │   AgentFeed       │  Core Wallets (4) + Specialist (3) │
 *   │              │                   │  PaymentLog + Leaderboard           │
 *   └──────────────┴───────────────────┴────────────────────────────────────┘
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import type { AgentStatus, Bounty } from '@/lib/api';
import { getBounties, getAgentStatus } from '@/lib/api';

import WalletCard  from '@/components/WalletCard';
import AgentFeed   from '@/components/AgentFeed';
import PaymentLog  from '@/components/PaymentLog';
import BountyBoard from '@/components/BountyBoard';
import Leaderboard from '@/components/Leaderboard';
import EconomyDashboard from '@/components/EconomyDashboard';

// ── Core vs Specialist agent grouping ────────────────────────────────────────

const CORE_AGENTS    = ['MasterAgent', 'ResearchAgent', 'WriterAgent', 'JudgeAgent'];
const SPECIALIST_AGENTS = ['TreasuryAgent', 'DataAnalystAgent', 'FactCheckerAgent'];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [bounties, setBounties]     = useState<Bounty[]>([]);
  const [agents, setAgents]         = useState<AgentStatus[]>([]);
  const [connected, setConnected]   = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentError, setAgentError] = useState('');
  const [activeTab, setActiveTab] = useState<'command' | 'analytics'>('command');

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchBounties = useCallback(async () => {
    try {
      const data = await getBounties();
      setBounties(data.bounties);
    } catch (err) {
      console.error('Failed to load bounties:', err);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    setLoadingAgents(true);
    setAgentError('');
    try {
      const data = await getAgentStatus();
      setAgents(data.agents);
    } catch {
      setAgentError('Could not load agent wallets. Is the backend running on port 4000?');
    } finally {
      setLoadingAgents(false);
    }
  }, []);

  useEffect(() => {
    fetchBounties();
    fetchAgents();
  }, [fetchBounties, fetchAgents]);

  // ── Socket connection status ───────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;
    function onConnect()    { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    setConnected(socket.connected);
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // ── Refresh on key events ─────────────────────────────────────────────────

  useEffect(() => {
    if (!socket) return;
    function handleActivity(payload: { event: string }) {
      if (payload.event === 'bounty:created' || payload.event === 'bounty_completed') {
        setTimeout(fetchBounties, 500);
      }
      if (payload.event === 'payment_sent' || payload.event === 'payment_made') {
        setTimeout(fetchAgents, 2000);
      }
    }
    socket.on('agentActivity', handleActivity);
    return () => { socket.off('agentActivity', handleActivity); };
  }, [fetchBounties, fetchAgents]);

  // ── Derived state ──────────────────────────────────────────────────────────

  const coreAgents       = agents.filter((a) => CORE_AGENTS.includes(a.agentName));
  const specialistAgents = agents.filter((a) => SPECIALIST_AGENTS.includes(a.agentName));
  const totalBalance     = agents.reduce((sum, a) => sum + a.balance, 0);
  const completedCount   = bounties.filter((b) => b.status === 'completed').length;
  const activeCount      = bounties.filter((b) => b.status !== 'completed' && b.status !== 'cancelled').length;

  function handleBountyCreated(bounty: Bounty) {
    setBounties((prev) => [bounty, ...prev]);
  }

  function handleDemoStarted(_bountyId: string) {
    setTimeout(fetchBounties, 300);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30 text-slate-900 flex flex-col">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="shrink-0 border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-6 py-3.5">
          <div className="flex items-center justify-between gap-6">

            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-xl shadow-md">
                  🧠
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white shadow-sm" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold bg-gradient-to-r from-violet-600 via-blue-600 to-emerald-500 bg-clip-text text-transparent leading-tight">
                  NexusAgent
                </h1>
                <p className="text-slate-400 text-xs">Autonomous AI Bounty Economy · Arc Testnet · 33 Agents</p>
              </div>
            </div>

            {/* Stats */}
            <div className="hidden md:flex items-center gap-5">
              {[
                { label: 'Bounties', value: bounties.length, color: 'text-slate-800' },
                { label: 'Completed', value: completedCount, color: 'text-emerald-600' },
                { label: 'Active', value: activeCount, color: 'text-blue-600' },
                { label: 'USDC Pool', value: `$${totalBalance.toFixed(2)}`, color: 'text-violet-600' },
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className={`font-bold font-mono text-lg leading-tight ${stat.color}`}>{stat.value}</p>
                  <p className="text-slate-400 text-xs">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* Agent count badge */}
            <div className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-violet-50 to-blue-50 border border-violet-200 rounded-full px-3 py-1.5">
              <span className="text-base">🤖</span>
              <span className="text-violet-700 text-xs font-semibold">33 Agents Loaded</span>
            </div>

            {/* Connection */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors
              ${connected
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-red-200 bg-red-50 text-red-600'
              }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {connected ? 'Live' : 'Offline'}
            </div>
          </div>
        </div>
      </header>

      {/* ── Tab Navigation ─────────────────────────────────────────────────── */}
      <div className="shrink-0 border-b border-slate-200 bg-slate-50/50 py-2.5 px-6">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('command')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'command'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              💼 Command Center (8-Agent Demo)
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`px-4 py-2 rounded-xl font-bold text-xs transition-all duration-200 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'bg-violet-600 text-white shadow-sm'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              📊 Economy Analytics Dashboard (33-Agent Sandbox)
            </button>
          </div>
          
          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider hidden sm:block">
            {activeTab === 'command' 
              ? 'Status: Live Blockchain Orchestrator' 
              : 'Status: Live Economy Simulation Sandbox'}
          </div>
        </div>
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-5 py-5 overflow-hidden">
        {activeTab === 'command' ? (
          <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_330px] gap-5 h-[calc(100vh-140px)]">

            {/* ── Left: Bounty Board ─────────────────────────────────────────── */}
            <div className="flex flex-col min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-5">
              <BountyBoard
                bounties={bounties}
                onBountyCreated={handleBountyCreated}
                onDemoStarted={handleDemoStarted}
                onRefresh={fetchBounties}
              />
            </div>

            {/* ── Center: Live Feed ─────────────────────────────────────────── */}
            <div className="flex flex-col min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-5">
              <AgentFeed />
            </div>

            {/* ── Right: Wallets + PaymentLog + Leaderboard ─────────────────── */}
            <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">

              {/* Core Pipeline Agents (4 full cards) */}
              <div>
                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 px-1">
                  Core Pipeline
                </p>
                {loadingAgents ? (
                  <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="h-[90px] rounded-xl bg-slate-100 animate-pulse" />
                    ))}
                  </div>
                ) : agentError ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-600 text-xs">
                    ⚠️ {agentError}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {coreAgents.map((agent) => (
                      <WalletCard key={agent.walletId} agent={agent} />
                    ))}
                  </div>
                )}
              </div>

              {/* Specialist Agents (3 compact cards) */}
              {specialistAgents.length > 0 && (
                <div>
                  <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-2 px-1">
                    Specialist Agents
                  </p>
                  <div className="space-y-1.5">
                    {specialistAgents.map((agent) => (
                      <WalletCard key={agent.walletId} agent={agent} compact />
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Log */}
              <div className="flex-1 min-h-[180px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                <PaymentLog />
              </div>

              {/* Leaderboard */}
              <Leaderboard />
            </div>
          </div>
        ) : (
          <div className="h-[calc(100vh-140px)] overflow-y-auto pr-1">
            <EconomyDashboard />
          </div>
        )}
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="shrink-0 border-t border-slate-200 bg-white/60 py-3 px-6 text-center">
        <p className="text-slate-400 text-xs">
          NexusAgent · Ignyte × Circle × Arc Hackathon ·{' '}
          <span className="text-slate-500 font-medium">Track 4: Best Agentic Economy Experience on Arc</span>
        </p>
      </footer>
    </div>
  );
}
