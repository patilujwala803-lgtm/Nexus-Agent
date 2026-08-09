'use client';

/**
 * page.tsx — NexusAgent Command Center (Phase 7 — 49-Agent Economy)
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
import Link from 'next/link';
import { socket } from '@/lib/socket';
import type { AgentStatus, Bounty } from '@/lib/api';
import { getBounties, getAgentStatus } from '@/lib/api';

import WalletCard  from '@/components/WalletCard';
import AgentFeed   from '@/components/AgentFeed';
import PaymentLog  from '@/components/PaymentLog';
import BountyBoard from '@/components/BountyBoard';
import Leaderboard from '@/components/Leaderboard';

// ── Core vs Specialist agent grouping ────────────────────────────────────────

const CORE_AGENT_KEYS = [
  'master-agent', 'research-agent',
  'hiring-agent-1', 'hiring-agent-2', 'hiring-agent-3',
  'broker-agent-1', 'broker-agent-2', 'broker-agent-3',
  'escrow-agent-1', 'escrow-agent-2', 'escrow-agent-3',
  'treasury-agent-1', 'treasury-agent-2',
  'judge-agent-1', 'judge-agent-2',
  'bank-agent-1', 'bank-agent-2',
  'guild-coordinator',
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [bounties, setBounties]     = useState<Bounty[]>([]);
  const [agents, setAgents]         = useState<AgentStatus[]>([]);
  const [connected, setConnected]   = useState(false);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [agentError, setAgentError] = useState('');
  const [activeTab, setActiveTab] = useState<'command' | 'analytics'>('command');
  const [selectedBounty, setSelectedBounty] = useState<Bounty | null>(null);
  const [apiQuotaError, setApiQuotaError] = useState(false);

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

  // ── API Quota Error Listener ───────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    function handleQuotaError() {
      setApiQuotaError(true);
      setTimeout(() => setApiQuotaError(false), 10000);
    }
    socket.on('economy:api_quota_exhausted', handleQuotaError);
    return () => { socket.off('economy:api_quota_exhausted', handleQuotaError); };
  }, []);

  // ── Derived state ──────────────────────────────────────────────────────────

  const coreAgents       = agents.filter((a) => CORE_AGENT_KEYS.includes(a.agentName));
  const specialistAgents = agents.filter((a) => !CORE_AGENT_KEYS.includes(a.agentName));
  const totalBalance     = agents.reduce((sum, a) => sum + a.balance, 0);
  const totalAgentsCount = agents.length > 0 ? agents.length : 49;
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
      {apiQuotaError && (
        <div className="w-full bg-red-600/90 backdrop-blur-md text-white text-center py-3 font-bold text-lg animate-pulse z-50 shadow-lg border-b border-red-500">
          🚨 API Quota is over! 🚨
        </div>
      )}

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
                <p className="text-slate-400 text-xs">Autonomous AI Bounty Economy · Arc Testnet · {totalAgentsCount} Agents</p>
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
              <span className="text-violet-700 text-xs font-semibold">{totalAgentsCount} Agents Loaded</span>
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

            {/* AI Economy Infinite Canvas Button */}
            <Link
              href="/economy"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-sm transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <span>🌐</span>
              <span>See AI Economy</span>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 max-w-[1600px] mx-auto w-full px-5 pt-10 pb-5 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr_330px] gap-5 h-[calc(100vh-140px)]">

          {/* ── Left: Bounty Board ─────────────────────────────────────────── */}
          <div className="flex flex-col min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-5">
              <BountyBoard
                bounties={bounties}
                onBountyCreated={handleBountyCreated}
                onDemoStarted={handleDemoStarted}
                onRefresh={fetchBounties}
                onBountySelect={setSelectedBounty}
              />
            </div>

            {/* ── Center: Live Feed ─────────────────────────────────────────── */}
            <div className="flex flex-col min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white/70 shadow-sm p-5">
              <AgentFeed />
            </div>

            {/* ── Right: Wallets + PaymentLog + Leaderboard ─────────────────── */}
            <div className="flex flex-col gap-3 min-h-0 overflow-y-auto">

              {/* Selected Bounty Output */}
              <div className="flex-1 min-h-0 flex flex-col gap-3">
                {selectedBounty ? (
                   <div className="flex-1 overflow-y-auto rounded-2xl border border-violet-200 bg-white p-5 shadow-sm">
                      <div className="flex justify-between items-center mb-3 border-b pb-2">
                        <h3 className="text-sm font-bold text-slate-800">Result: {selectedBounty.title}</h3>
                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">
                          ✅ Completed
                        </span>
                      </div>
                      <div className="text-xs text-slate-700 whitespace-pre-wrap font-medium">
                         {selectedBounty.submissions?.[0]?.content || 'Output is empty or agent did not return content.'}
                      </div>
                   </div>
                ) : (
                   <div className="flex-1 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 flex flex-col items-center justify-center p-6 text-center shadow-inner">
                     <span className="text-3xl mb-3 opacity-50">🤖</span>
                     <p className="text-slate-500 text-sm font-medium">No Bounty Selected</p>
                     <p className="text-slate-400 text-xs mt-1 max-w-[200px]">Click on a completed bounty from the board to view the agent's output here.</p>
                   </div>
                )}

                {/* Payment Log */}
                <div className="h-[250px] shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm p-4">
                  <PaymentLog />
                </div>
              </div>
            </div>
          </div>
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
