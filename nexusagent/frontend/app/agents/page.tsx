'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface AgentDoc {
  instanceId: string;
  name: string;
  role: string;
  skills: string[];
  usdcBalance: number;
  reputation: number;
  status: string;
  jobsCompleted: number;
  totalEarned: number;
  totalSpent: number;
  bidStrategy: string;
  walletId: string;
  walletAddress: string;
  guildName: string | null;
  hasAdvancedCert: boolean;
  loanAmount: number;
  loanInterestRate: number;
  isHighDefaultRisk: boolean;
  consecutiveWins: number;
  consecutiveIdleCycles: number;
  qualityOffset: number;
  lastUpdated: any;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const ROLE_COLORS: Record<string, string> = {
  producer: '#6366f1',
  verifier: '#10b981',
  finance: '#f59e0b',
  meta: '#8b5cf6',
};

const STATUS_COLORS: Record<string, string> = {
  idle: '#10b981',
  busy: '#f59e0b',
  offline: '#ef4444',
};

function truncateAddress(addr: string): string {
  if (!addr || addr.length < 12) return addr || '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function getRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    producer: 'Producer',
    verifier: 'Verifier',
    finance: 'Finance',
    meta: 'Meta',
  };
  return labels[role] || role;
}

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState<'usdcBalance' | 'reputation' | 'jobsCompleted' | 'totalEarned'>('usdcBalance');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [usingFirebase, setUsingFirebase] = useState(false);

  // Fetch from API (fallback)
  const fetchFromAPI = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/economy/agents`);
      if (res.ok) {
        const data = await res.json();
        if (data?.agents) {
          setAgents(data.agents as AgentDoc[]);
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Failed to fetch agents from API:', err);
      setLoading(false);
    }
  }, []);

  // Try Firebase real-time, fall back to API polling
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;

    const tryFirebase = async () => {
      try {
        const { db } = await import('../../lib/firebase');
        if (!db) throw new Error('Firebase not configured');

        const { collection, onSnapshot } = await import('firebase/firestore');
        const agentsCol = collection(db, 'agents');

        unsubscribe = onSnapshot(agentsCol, (snapshot) => {
          const docs = snapshot.docs.map(doc => doc.data() as AgentDoc);
          setAgents(docs);
          setLoading(false);
          setUsingFirebase(true);
        }, (err) => {
          console.warn('Firestore error, falling back to API:', err);
          setUsingFirebase(false);
          fetchFromAPI();
          // Poll every 10s
          const interval = setInterval(fetchFromAPI, 10000);
          return () => clearInterval(interval);
        });
      } catch {
        setUsingFirebase(false);
        fetchFromAPI();
        const interval = setInterval(fetchFromAPI, 10000);
        return () => clearInterval(interval);
      }
    };

    tryFirebase();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [fetchFromAPI]);

  const filtered = agents
    .filter(a => {
      if (searchQuery && !a.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterRole !== 'All' && a.role !== filterRole.toLowerCase()) return false;
      if (filterStatus !== 'All' && a.status !== filterStatus.toLowerCase()) return false;
      return true;
    })
    .sort((a, b) => (b[sortBy] as number) - (a[sortBy] as number));

  const glassPanelStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.65)',
    backdropFilter: 'blur(16px) saturate(180%)',
    WebkitBackdropFilter: 'blur(16px) saturate(180%)',
    border: '1px solid rgba(255,255,255,0.9)',
    borderRadius: 16,
    boxShadow: '0 4px 24px rgba(99,102,241,0.08), 0 1px 2px rgba(0,0,0,0.04)',
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: 'linear-gradient(135deg, #f0f4ff 0%, #faf5ff 50%, #f0fdf4 100%)',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Header */}
      <div className="sticky top-0 z-40 px-6 py-4" style={{ ...glassPanelStyle, borderRadius: 0, borderLeft: 'none', borderRight: 'none', borderTop: 'none' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/economy" className="text-indigo-600 hover:text-indigo-800 transition-colors text-sm font-medium flex items-center gap-1">
              ← Economy Canvas
            </a>
            <span className="text-slate-300">|</span>
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800 }} className="text-xl text-[#1e1b4b]">
              👥 Agent Directory
            </h1>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-medium"
              style={{ background: usingFirebase ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: usingFirebase ? '#059669' : '#d97706' }}
            >
              {usingFirebase ? '🔥 Firebase Live' : '📡 API Polling'}
            </span>
          </div>
          <span className="text-sm text-slate-500">{agents.length} agents registered</span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">
        {/* Filter Bar */}
        <div className="p-4 flex flex-wrap gap-3 items-center" style={glassPanelStyle}>
          <input
            type="text"
            placeholder="Search agents..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 min-w-[200px] px-3 py-2 text-sm rounded-xl outline-none text-slate-700"
            style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}
          />

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Role:</span>
            {['All', 'Producer', 'Verifier', 'Finance', 'Meta'].map(r => (
              <button
                key={r}
                onClick={() => setFilterRole(r)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: filterRole === r ? '#6366f1' : 'rgba(99,102,241,0.08)',
                  color: filterRole === r ? '#fff' : '#6366f1',
                  fontWeight: 600,
                }}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Status:</span>
            {['All', 'Idle', 'Busy'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className="text-xs px-3 py-1.5 rounded-full transition-all"
                style={{
                  background: filterStatus === s ? '#6366f1' : 'rgba(99,102,241,0.08)',
                  color: filterStatus === s ? '#fff' : '#6366f1',
                  fontWeight: 600,
                }}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Sort:</span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="text-xs px-3 py-1.5 rounded-xl outline-none"
              style={{ background: 'rgba(255,255,255,0.8)', border: '1px solid rgba(99,102,241,0.2)', color: '#6366f1', fontWeight: 600 }}
            >
              <option value="usdcBalance">Balance</option>
              <option value="reputation">Reputation</option>
              <option value="jobsCompleted">Jobs Done</option>
              <option value="totalEarned">Total Earned</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            Loading agents...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl" style={{ ...glassPanelStyle }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
                  {['Agent', 'Role', 'Status', 'Balance', 'Reputation', 'Jobs', 'Guild', 'Cert', 'Wallet'].map(col => (
                    <th key={col} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-widest text-indigo-500">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent, idx) => {
                  const isExpanded = expandedId === agent.instanceId;
                  const roleColor = ROLE_COLORS[agent.role] || '#6366f1';
                  const statusColor = STATUS_COLORS[agent.status] || '#6b7280';

                  return (
                    <React.Fragment key={agent.instanceId}>
                      <tr
                        onClick={() => setExpandedId(isExpanded ? null : agent.instanceId)}
                        className="cursor-pointer transition-all"
                        style={{
                          borderBottom: '1px solid rgba(0,0,0,0.04)',
                          background: isExpanded ? 'rgba(99,102,241,0.04)' : idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.01)',
                        }}
                      >
                        {/* Avatar + Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                              style={{ background: `linear-gradient(135deg, ${roleColor}, ${roleColor}99)` }}
                            >
                              {getInitial(agent.name)}
                            </div>
                            <div>
                              <div className="font-medium text-[#1e1b4b] text-xs" style={{ fontFamily: "'Syne', sans-serif" }}>{agent.name}</div>
                              <div className="text-[10px] text-slate-400">{agent.instanceId}</div>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="px-4 py-3">
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                            style={{ background: `${roleColor}18`, color: roleColor }}
                          >
                            {getRoleLabel(agent.role)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: statusColor }} />
                            <span className="text-xs capitalize" style={{ color: statusColor }}>{agent.status}</span>
                          </span>
                        </td>

                        {/* Balance */}
                        <td className="px-4 py-3">
                          <span className="font-bold text-xs" style={{ fontFamily: "'Syne', sans-serif", color: '#1e1b4b' }}>
                            ${(agent.usdcBalance || 0).toFixed(2)}
                          </span>
                        </td>

                        {/* Reputation */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${agent.reputation}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                              />
                            </div>
                            <span className="text-xs text-slate-600">{agent.reputation}</span>
                          </div>
                        </td>

                        {/* Jobs */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-700">{agent.jobsCompleted || 0}</span>
                        </td>

                        {/* Guild */}
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{agent.guildName || '—'}</span>
                        </td>

                        {/* Cert */}
                        <td className="px-4 py-3">
                          {agent.hasAdvancedCert ? (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(217,119,6,0.1)', color: '#d97706' }}>
                              🎓 Adv.
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-300">—</span>
                          )}
                        </td>

                        {/* Wallet */}
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-mono text-slate-400">{truncateAddress(agent.walletAddress)}</span>
                        </td>
                      </tr>

                      {/* Expanded Row */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={9} className="px-6 pb-4">
                            <div
                              className="rounded-xl p-4 mt-1 grid grid-cols-4 gap-4 text-xs"
                              style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}
                            >
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-semibold mb-1">Financial</div>
                                <div className="text-slate-600">Total Earned: <strong>${(agent.totalEarned || 0).toFixed(4)}</strong></div>
                                <div className="text-slate-600">Total Spent: <strong>${(agent.totalSpent || 0).toFixed(4)}</strong></div>
                                <div className="text-slate-600">Bid Strategy: <strong>{agent.bidStrategy}</strong></div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-semibold mb-1">Loan Info</div>
                                <div className="text-slate-600">Loan Balance: <strong>${(agent.loanAmount || 0).toFixed(2)}</strong></div>
                                <div className="text-slate-600">Interest Rate: <strong>{((agent.loanInterestRate || 0) * 100).toFixed(0)}%</strong></div>
                                <div className={agent.isHighDefaultRisk ? 'text-red-600 font-bold' : 'text-slate-400'}>
                                  {agent.isHighDefaultRisk ? '⚠️ HIGH DEFAULT RISK' : 'Low risk'}
                                </div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-semibold mb-1">Performance</div>
                                <div className="text-slate-600">Consecutive Wins: <strong>{agent.consecutiveWins || 0}</strong></div>
                                <div className="text-slate-600">Idle Cycles: <strong>{agent.consecutiveIdleCycles || 0}</strong></div>
                                <div className="text-slate-600">Quality Offset: <strong>+{agent.qualityOffset || 0}</strong></div>
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-semibold mb-1">Skills</div>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(agent.skills || []).map(skill => (
                                    <span key={skill} className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}>
                                      {skill}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <div className="col-span-4">
                                <div className="text-[10px] uppercase tracking-widest text-indigo-500 font-semibold mb-1">Wallet Address</div>
                                <div className="font-mono text-slate-500 break-all">{agent.walletAddress || '—'}</div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="py-12 text-center text-slate-400 text-sm">
                No agents found matching your filters.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
