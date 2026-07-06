'use client';
import React, { useState, useEffect } from 'react';
import { SidebarWrapper } from './SidebarWrapper';
import type { EconomyStats, Agent } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface AnalyticsSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  stats: EconomyStats;
}

export function AnalyticsSidebar({ isOpen, onClose, stats }: AnalyticsSidebarProps) {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [sortBy, setSortBy] = useState<'earned' | 'rep' | 'jobs' | 'balance'>('earned');

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    fetch(`${API_URL}/api/economy/agents`)
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data?.agents ?? []);
        setAgents(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    const interval = setInterval(() => {
      fetch(`${API_URL}/api/economy/agents`)
        .then(r => r.json())
        .then(data => {
          const list = Array.isArray(data) ? data : (data?.agents ?? []);
          setAgents(list);
        })
        .catch(() => {});
    }, 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const filtered = agents
    .filter(a => a.name?.toLowerCase().includes(search.toLowerCase()) || a.instanceId?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'earned') return b.totalEarned - a.totalEarned;
      if (sortBy === 'rep') return b.reputation - a.reputation;
      if (sortBy === 'jobs') return b.jobsCompleted - a.jobsCompleted;
      return b.usdcBalance - a.usdcBalance;
    });

  const statusColor = (status: string) => {
    if (status === 'busy') return '#f59e0b';
    if (status === 'educating') return '#f97316';
    if (status === 'idle') return '#10b981';
    return '#94a3b8';
  };

  const statusLabel = (status: string) => {
    if (status === 'busy') return '⚙️ Working';
    if (status === 'educating') return '🎓 Studying';
    return '✅ Idle';
  };

  const roleIcon = (role: string) => {
    if (role === 'producer') return '🔨';
    if (role === 'verifier') return '✅';
    if (role === 'finance') return '💰';
    if (role === 'meta') return '🧠';
    return '🤖';
  };

  const maxEarned = Math.max(...agents.map(a => a.totalEarned), 1);

  return (
    <SidebarWrapper isOpen={isOpen} onClose={onClose} title="📊 Economy Analytics">
      {/* Live Stats Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: 'Total Agents', value: stats.totalAgents, color: '#6366f1' },
          { label: 'Active Now', value: stats.busyAgents, color: '#f59e0b' },
          { label: 'Idle', value: stats.idleAgents, color: '#10b981' },
          { label: 'Tasks Done', value: stats.completedTasks, color: '#8b5cf6' },
          { label: 'USDC Flowed', value: `$${stats.totalUSDCFlowed.toFixed(2)}`, color: '#06b6d4' },
          { label: 'Active Tasks', value: stats.activeTasks, color: '#f43f5e' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-2.5" style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(99,102,241,0.08)' }}>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.4)' }}>{s.label}</p>
            <p className="text-lg font-extrabold mt-0.5" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Top Earner */}
      {stats.topEarner && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-3" style={{ background: 'linear-gradient(135deg,rgba(99,102,241,0.08),rgba(139,92,246,0.06))', border: '1px solid rgba(99,102,241,0.15)' }}>
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.4)' }}>Top Earner</p>
            <p className="font-extrabold text-sm" style={{ color: '#1e1b4b' }}>{stats.topEarner.name}</p>
            <p className="text-xs font-semibold" style={{ color: '#6366f1' }}>${stats.topEarner.amount.toFixed(4)} USDC earned</p>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.35)' }}>Agent Analysis</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />
      </div>

      {/* Search + Sort */}
      <div className="flex gap-2 mb-3">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search agent..."
          className="flex-1 text-xs px-3 py-1.5 rounded-lg outline-none"
          style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(99,102,241,0.15)', color: '#1e1b4b' }}
        />
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as any)}
          className="text-[10px] font-bold px-2 py-1.5 rounded-lg outline-none cursor-pointer"
          style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)', color: '#6366f1' }}
        >
          <option value="earned">By Earned</option>
          <option value="rep">By Rep</option>
          <option value="jobs">By Jobs</option>
          <option value="balance">By Balance</option>
        </select>
      </div>

      {/* Agent List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl animate-pulse" style={{ background: 'rgba(99,102,241,0.06)' }} />
          ))}
        </div>
      ) : (
        <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: '420px' }}>
          {filtered.map(agent => (
            <div key={agent.instanceId}>
              {/* Row */}
              <button
                onClick={() => setSelectedAgent(selectedAgent?.instanceId === agent.instanceId ? null : agent)}
                className="w-full text-left rounded-xl px-3 py-2 transition-all cursor-pointer"
                style={{
                  background: selectedAgent?.instanceId === agent.instanceId
                    ? 'rgba(99,102,241,0.10)'
                    : 'rgba(255,255,255,0.6)',
                  border: `1px solid ${selectedAgent?.instanceId === agent.instanceId ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.07)'}`,
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{roleIcon(agent.role)}</span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold truncate" style={{ color: '#1e1b4b' }}>{agent.name}</p>
                      <p className="text-[9px] font-semibold" style={{ color: statusColor(agent.status) }}>{statusLabel(agent.status)}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-extrabold" style={{ color: '#6366f1' }}>${agent.usdcBalance.toFixed(2)}</p>
                    <p className="text-[9px]" style={{ color: 'rgba(30,27,75,0.4)' }}>Rep {agent.reputation}</p>
                  </div>
                </div>
                {/* Earned bar */}
                <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(99,102,241,0.08)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${(agent.totalEarned / maxEarned) * 100}%`, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' }}
                  />
                </div>
              </button>

              {/* Expanded detail */}
              {selectedAgent?.instanceId === agent.instanceId && (
                <div className="mx-1 rounded-b-xl px-3 pb-3 pt-2 -mt-1" style={{ background: 'rgba(99,102,241,0.05)', border: '1px solid rgba(99,102,241,0.12)', borderTop: 'none' }}>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {[
                      { label: 'Earned', value: `$${agent.totalEarned.toFixed(4)}`, color: '#10b981' },
                      { label: 'Spent', value: `$${agent.totalSpent.toFixed(4)}`, color: '#f43f5e' },
                      { label: 'Jobs', value: agent.jobsCompleted, color: '#6366f1' },
                    ].map((d, i) => (
                      <div key={i} className="text-center">
                        <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.4)' }}>{d.label}</p>
                        <p className="text-xs font-extrabold" style={{ color: d.color }}>{d.value}</p>
                      </div>
                    ))}
                  </div>
                  {agent.loanBalance != null && agent.loanBalance > 0 && (
                    <div className="rounded-lg px-2 py-1 mb-2 text-[10px] font-bold" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706', border: '1px solid rgba(245,158,11,0.2)' }}>
                      🏦 Loan: ${agent.loanBalance.toFixed(2)} @ {((agent.loanInterestRate ?? 0) * 100).toFixed(0)}% APR
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1">
                    {(agent.skills ?? []).slice(0, 6).map((s: string) => (
                      <span key={s} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>{s}</span>
                    ))}
                  </div>
                  {(agent.certifications ?? []).length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {agent.certifications!.map((c: string) => (
                        <span key={c} className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}>🏅 {c}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && !loading && (
            <p className="text-center text-xs py-6" style={{ color: 'rgba(30,27,75,0.35)' }}>No agents found</p>
          )}
        </div>
      )}
    </SidebarWrapper>
  );
}
