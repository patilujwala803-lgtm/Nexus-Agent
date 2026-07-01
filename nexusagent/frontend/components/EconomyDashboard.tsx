'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { socket } from '@/lib/socket';
import { 
  getEconomyAgents, 
  getEconomyTasks, 
  getEconomyStats, 
  startEconomySimulation, 
  stopEconomySimulation, 
  EconomyAgent, 
  EconomyTask, 
  EconomyStats 
} from '@/lib/api';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

interface DisputeEvent {
  taskId: string;
  workerName: string;
  qualityScore: number;
  votes: Array<{ jurorName: string; approve: boolean }>;
  verdict: 'sustained' | 'overturned';
  timestamp: string;
}

export default function EconomyDashboard() {
  const [agents, setAgents] = useState<EconomyAgent[]>([]);
  const [tasks, setTasks] = useState<EconomyTask[]>([]);
  const [stats, setStats] = useState<EconomyStats | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [disputes, setDisputes] = useState<DisputeEvent[]>([]);
  const [velocityHistory, setVelocityHistory] = useState<Array<{ time: string; usdcFlow: number }>>([]);
  const [simRunning, setSimRunning] = useState(false);

  // ── Fetch data ─────────────────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    try {
      const [agentsData, tasksData, statsData] = await Promise.all([
        getEconomyAgents(),
        getEconomyTasks(),
        getEconomyStats()
      ]);
      setAgents(agentsData);
      setTasks(tasksData);
      setStats(statsData);
      setSimRunning(statsData.isRunning);
      setLoading(false);

      // Add data point to velocity history
      const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setVelocityHistory(prev => {
        const next = [...prev, { time: timeString, usdcFlow: statsData.totalUSDCFlowed }];
        // Limit history to 15 data points
        return next.slice(-15);
      });
    } catch (err) {
      console.error("Failed to fetch simulation data:", err);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // Poll data every 4 seconds to catch active balances during simulation
    const interval = setInterval(fetchData, 4000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // ── Socket listeners for dispute events & stats ────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Track active disputes
    let activeDispute: Partial<DisputeEvent> | null = null;

    function handleActivity(payload: { event: string; data: any; timestamp: string }) {
      if (payload.event === 'economy:stats_update' && payload.data) {
        setStats(payload.data);
        setSimRunning(payload.data.isRunning);
      }

      // Handle Dispute logs
      if (payload.event === 'economy:dispute_raised') {
        activeDispute = {
          taskId: payload.data.taskId,
          workerName: payload.data.agentName,
          qualityScore: payload.data.qualityScore,
          votes: [],
          timestamp: payload.timestamp
        };
      }

      if (payload.event === 'economy:jury_voted' && activeDispute && activeDispute.taskId === payload.data.taskId) {
        activeDispute.votes = payload.data.votes;
      }

      if (payload.event === 'economy:dispute_resolved' && activeDispute && activeDispute.taskId === payload.data.taskId) {
        activeDispute.verdict = payload.data.verdict;
        setDisputes(prev => [activeDispute as DisputeEvent, ...prev].slice(0, 10));
        activeDispute = null;
        fetchData();
      }
    }

    socket.on('agentActivity', handleActivity);
    return () => {
      socket.off('agentActivity', handleActivity);
    };
  }, [fetchData]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleToggleSimulation = async () => {
    try {
      if (simRunning) {
        await stopEconomySimulation();
        setSimRunning(false);
      } else {
        const res = await startEconomySimulation();
        setSimRunning(true);
        setStats(res.stats);
      }
      fetchData();
    } catch (err) {
      console.error("Failed to toggle simulation:", err);
    }
  };

  // ── Filters & Search ───────────────────────────────────────────────────────
  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(search.toLowerCase()) || 
                          agent.role.toLowerCase().includes(search.toLowerCase()) ||
                          agent.instanceId.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === 'all' || agent.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || agent.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-full border-4 border-violet-100 border-t-violet-600 animate-spin mb-4" />
        <p className="text-slate-400 text-sm font-medium">Loading Economy Simulation metrics...</p>
      </div>
    );
  }

  // Assets data for capital chart
  const assetsData = [
    {
      name: 'Loans Disbursed',
      USDC: stats?.totalLoansDisbursed || 0,
      fill: '#a855f7' // Purple
    },
    {
      name: 'Guild Capital',
      USDC: stats?.totalGuildCapital || 0,
      fill: '#10b981' // Emerald
    }
  ];

  return (
    <div className="flex-1 flex flex-col gap-6 p-1">
      {/* Simulation Controls Banner */}
      <div className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg ${simRunning ? 'bg-emerald-50 text-emerald-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
            🌐
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-base">Autonomous Economy Engine</h3>
            <p className="text-slate-400 text-xs">
              {simRunning 
                ? `Running autonomously for ${stats?.uptimeSeconds || 0} seconds · 33 Agents active` 
                : 'Engine offline · Agents are currently idle'}
            </p>
          </div>
        </div>

        <button
          onClick={handleToggleSimulation}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all duration-200 cursor-pointer ${
            simRunning 
              ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' 
              : 'bg-gradient-to-r from-violet-600 to-blue-600 hover:opacity-90 text-white shadow-md'
          }`}
        >
          {simRunning ? 'Stop Simulation' : 'Start Simulation'}
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Cumulative USDC Flow', value: `$${stats?.totalUSDCFlowed.toFixed(4) || '0.0000'}`, icon: '💸', color: 'from-blue-500 to-indigo-500' },
          { label: 'Active Capital Assets', value: `$${((stats?.totalGuildCapital || 0) + (stats?.totalLoansDisbursed || 0)).toFixed(2)}`, icon: '🏦', color: 'from-emerald-500 to-teal-500' },
          { label: 'Active Loans Issued', value: `$${stats?.totalLoansDisbursed.toFixed(2) || '0.00'}`, icon: '💳', color: 'from-purple-500 to-fuchsia-500' },
          { label: 'Highest Earner', value: stats?.topEarner ? `${stats.topEarner.name} ($${stats.topEarner.amount.toFixed(3)})` : 'None', icon: '🏆', color: 'from-amber-500 to-orange-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">{item.label}</p>
              <h4 className="text-slate-800 font-black text-lg leading-tight truncate max-w-[200px]">{item.value}</h4>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-lg">
              {item.icon}
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics & Jury Disputes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: USDC Velocity Flow */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 min-h-[300px]">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">USDC Velocity Flow</h4>
            <p className="text-slate-400 text-xs">Total cumulative transaction volume over time</p>
          </div>
          <div className="flex-1 w-full h-[220px]">
            {velocityHistory.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400 text-xs">Waiting for stats...</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={velocityHistory}>
                  <defs>
                    <linearGradient id="colorUsdc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                  <Area type="monotone" dataKey="usdcFlow" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#colorUsdc)" name="USDC Flow" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Chart 2: Capital & Assets */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 min-h-[300px]">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Capital Assets Breakdown</h4>
            <p className="text-slate-400 text-xs">Distribution of active loans vs. guild capital reserves</p>
          </div>
          <div className="flex-1 w-full h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={assetsData} barSize={25}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 12, border: '1px solid #e2e8f0' }} />
                <Bar dataKey="USDC" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Panel: Jury Disputes Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4 min-h-[300px]">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Jury Disputes & Resolutions</h4>
            <p className="text-slate-400 text-xs">Disputes triggered by failed task verification (quality &lt; 74)</p>
          </div>
          
          <div className="flex-1 overflow-y-auto max-h-[220px] space-y-2 pr-1">
            {disputes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <span className="text-2xl mb-1">⚖️</span>
                <p className="text-slate-400 text-xs">No disputes active in the economy loop</p>
              </div>
            ) : (
              disputes.map((dispute, idx) => (
                <div key={idx} className="border border-slate-100 rounded-xl p-3 bg-slate-50/50 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-700 text-xs truncate max-w-[150px]">{dispute.workerName}</span>
                    <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                      dispute.verdict === 'overturned' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' 
                        : 'bg-red-50 text-red-500 border border-red-100'
                    }`}>
                      {dispute.verdict === 'overturned' ? 'Overturned (Approved)' : 'Sustained (Failed)'}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[10px]">
                    Disputed score of **{dispute.qualityScore}/100**. Jury panel vote breakdown:
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {dispute.votes.map((v, i) => (
                      <span key={i} className={`px-2 py-0.5 rounded-md font-medium text-[9px] ${v.approve ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                        {v.jurorName}: {v.approve ? 'Approve' : 'Reject'}
                      </span>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Directory of 33 Agents */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h4 className="font-extrabold text-slate-800 text-sm">Simulated Agent Directory</h4>
            <p className="text-slate-400 text-xs">Directory statistics of all 33 running agents in the Phase 7 Sandbox</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <input
              type="text"
              placeholder="Search agents..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-violet-500 w-full sm:w-48 bg-slate-50/50"
            />
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-violet-500 bg-slate-50/50"
            >
              <option value="all">All Roles</option>
              <option value="producer">Producers</option>
              <option value="verifier">Verifiers</option>
              <option value="finance">Finance</option>
              <option value="meta">Meta</option>
            </select>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-violet-500 bg-slate-50/50"
            >
              <option value="all">All Statuses</option>
              <option value="idle">Idle</option>
              <option value="busy">Busy</option>
            </select>
          </div>
        </div>

        {/* Directory Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Pricing Strategy</th>
                <th className="px-4 py-3 text-right">Reputation</th>
                <th className="px-4 py-3 text-right">USDC Balance</th>
                <th className="px-4 py-3 text-right">Jobs Completed</th>
                <th className="px-4 py-3 text-right">Active Loans</th>
                <th className="px-4 py-3">Circle Wallet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">
                    No agents match search filters
                  </td>
                </tr>
              ) : (
                filteredAgents.map(agent => (
                  <tr key={agent.id} className="hover:bg-slate-50/50">
                    {/* Agent */}
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${agent.status === 'idle' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                        <div>
                          <p>{agent.name}</p>
                          <p className="text-[10px] text-slate-400 font-medium font-mono">{agent.instanceId}</p>
                        </div>
                      </div>
                    </td>
                    {/* Role */}
                    <td className="px-4 py-3.5">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase tracking-wider ${
                        agent.role === 'producer' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                        agent.role === 'verifier' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                        agent.role === 'finance' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                        'bg-purple-50 text-purple-600 border border-purple-100'
                      }`}>
                        {agent.role}
                      </span>
                    </td>
                    {/* Strategy */}
                    <td className="px-4 py-3.5">
                      <span className="font-semibold text-slate-500 capitalize">{agent.bidStrategy}</span>
                      {agent.consecutiveIdleCycles > 2 && (
                        <span className="text-red-500 font-bold ml-1.5">📉 -{(agent.consecutiveIdleCycles - 2) * 5}%</span>
                      )}
                      {agent.consecutiveWins > 1 && (
                        <span className="text-emerald-500 font-bold ml-1.5">📈 +{agent.consecutiveWins * 2}%</span>
                      )}
                    </td>
                    {/* Reputation */}
                    <td className="px-4 py-3.5 text-right font-semibold font-mono text-slate-700">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{agent.reputation}/100</span>
                        {agent.qualityOffset > 0 && (
                          <span className="text-violet-600 text-[10px] font-bold">🎓 +{agent.qualityOffset}</span>
                        )}
                      </div>
                    </td>
                    {/* USDC Balance */}
                    <td className="px-4 py-3.5 text-right font-bold font-mono text-indigo-600">
                      ${agent.usdcBalance.toFixed(4)}
                    </td>
                    {/* Jobs Completed */}
                    <td className="px-4 py-3.5 text-right font-medium text-slate-700">
                      <span className="text-emerald-600 font-semibold">{agent.jobsCompleted}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-red-500 font-semibold">{agent.jobsFailed}</span>
                    </td>
                    {/* Active Loans */}
                    <td className="px-4 py-3.5 text-right">
                      {agent.loanBalance > 0 ? (
                        <div className="font-semibold font-mono text-purple-600">
                          ${agent.loanBalance.toFixed(2)} <span className="text-[10px] text-slate-400">@ {(agent.loanInterestRate * 100).toFixed(1)}%</span>
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                    {/* Wallet Address */}
                    <td className="px-4 py-3.5 text-slate-400 font-mono">
                      {agent.walletAddress ? (
                        <div className="flex items-center gap-1">
                          <span className="truncate max-w-[120px]">{agent.walletAddress}</span>
                          {agent.walletAddress.startsWith('0xmock') && (
                            <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1 font-bold">MOCK</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-300 font-medium">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
