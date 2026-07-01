/**
 * api.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Axios API client for NexusAgent frontend.
 * All backend HTTP calls go through this module.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Configured Axios instance pointed at the NexusAgent backend. */
export const api = axios.create({
  baseURL: API_URL,
  timeout: 120_000, // 2 min — bounty processing can take a while
  headers: { 'Content-Type': 'application/json' },
});

// ── Type definitions matching backend shapes ────────────────────────────────

export interface Bounty {
  id: string;
  title: string;
  description: string;
  reward: number;
  status: 'open' | 'in_progress' | 'judging' | 'completed' | 'cancelled';
  postedBy: string;
  submissions: Submission[];
  winner?: string;
  winnerTxHash?: string;
  createdAt: string;
  updatedAt: string;
  // Extra fields populated after completion
  scoreA?: number;
  scoreB?: number;
  winnerReason?: string;
  rewardTxHash?: string;
}

export interface Submission {
  agentId: string;
  agentName: string;
  content: string;
  txHash?: string;
  score?: number;
  timestamp: string;
}

export interface AgentStatus {
  agentName: string;
  walletId: string;
  address: string;
  balance: number;
  blockchain: string;
}

export interface CreateBountyPayload {
  title: string;
  description: string;
  reward: number;
  postedBy: string;
}

// ── API functions ───────────────────────────────────────────────────────────

/**
 * getBounties — fetch all bounties, newest first.
 */
export async function getBounties(): Promise<{ count: number; bounties: Bounty[] }> {
  const res = await api.get('/bounties');
  return res.data;
}

/**
 * createBounty — post a new bounty to the board.
 */
export async function createBounty(data: CreateBountyPayload): Promise<Bounty> {
  const res = await api.post('/bounty', data);
  return res.data;
}

/**
 * getAgentStatus — returns live USDC balances for all 7 agent wallets (Phase 5).
 */
export async function getAgentStatus(): Promise<{ agents: AgentStatus[]; timestamp: string }> {
  const res = await api.get('/agent/status');
  return res.data;
}

/**
 * getBountyResult — full result for a completed bounty (scores, winner, txHashes).
 */
export async function getBountyResult(id: string): Promise<Bounty> {
  const res = await api.get(`/bounty/${id}/result`);
  return res.data;
}

/**
 * triggerDemo — one-click demo that creates a bounty and runs the full 8-agent flow.
 */
export async function triggerDemo(): Promise<{
  message: string;
  bountyId: string;
  statusUrl: string;
}> {
  const res = await api.post('/bounty/demo');
  return res.data;
}

/**
 * processBounty — trigger the Master Agent on an existing bounty ID.
 */
export async function processBounty(id: string): Promise<{
  message: string;
  bountyId: string;
  statusUrl: string;
}> {
  const res = await api.post(`/bounty/process/${id}`);
  return res.data;
}

// ── Leaderboard type ─────────────────────────────────────────────────────────

export interface LeaderboardEntry {
  pipelineId:  string;
  wins:        number;
  losses:      number;
  winRate:     number;
  avgScore:    number;
  totalEarned: number;
  runs:        number;
}

// ── Phase 7 Economy simulation types and API helpers ─────────────────────────

export interface EconomyAgent {
  id: string;
  instanceId: string;
  name: string;
  role: string;
  skills: string[];
  walletId: string;
  walletAddress: string;
  usdcBalance: number;
  reputation: number;
  status: string;
  totalEarned: number;
  totalSpent: number;
  jobsCompleted: number;
  jobsFailed: number;
  currentTaskId: string | null;
  bidStrategy: string;
  poolType: string | null;
  consecutiveIdleCycles: number;
  consecutiveWins: number;
  loanBalance: number;
  loanInterestRate: number;
  qualityOffset: number;
}

export interface EconomyTask {
  id: string;
  title: string;
  description: string;
  requiredSkill: string;
  budgetUSDC: number;
  status: string;
  postedBy: string;
  assignedTo: string | null;
  assignedAgentName: string | null;
  bids: any[];
  createdAt: number;
  completedAt: number | null;
  result: string | null;
  qualityScore: number | null;
  escrowTxHash: string | null;
  paymentTxHash: string | null;
  hiringAgentId: string | null;
  assignedGuildId?: string | null;
}

export interface EconomyStats {
  totalAgents: number;
  idleAgents: number;
  busyAgents: number;
  totalTasksSpawned: number;
  completedTasks: number;
  failedTasks: number;
  activeTasks: number;
  totalUSDCFlowed: number;
  topEarner: { name: string; amount: number } | null;
  isRunning: boolean;
  uptimeSeconds: number;
  totalLoansDisbursed: number;
  totalGuildCapital: number;
}

export async function getEconomyAgents(): Promise<EconomyAgent[]> {
  const res = await api.get('/api/economy/agents');
  return res.data;
}

export async function getEconomyTasks(): Promise<EconomyTask[]> {
  const res = await api.get('/api/economy/tasks');
  return res.data;
}

export async function getEconomyStats(): Promise<EconomyStats> {
  const res = await api.get('/api/economy/stats');
  return res.data;
}

export async function startEconomySimulation(): Promise<{ success: boolean; stats: EconomyStats }> {
  const res = await api.post('/api/economy/start');
  return res.data;
}

export async function stopEconomySimulation(): Promise<{ success: boolean }> {
  const res = await api.post('/api/economy/stop');
  return res.data;
}

