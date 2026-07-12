export type AgentRole = "producer" | "verifier" | "finance" | "meta";
export type BidStrategy = "aggressive" | "standard" | "premium";
export type AgentStatus = "idle" | "busy" | "offline" | "educating";
export type TaskStatus = 
  "open" | "bidding" | "in-progress" | "verifying" | "complete" | "failed";
export type BidStatus = 
  "pending" | "accepted" | "rejected" | "countered" | "withdrawn";

export interface Agent {
  id: string;
  instanceId: string;        // e.g. "hiring-agent-1", "hiring-agent-2"
  name: string;              // display name e.g. "Hiring Agent #1"
  role: AgentRole;
  skills: string[];
  walletId: string;          // empty for now, filled in Phase 7
  walletAddress: string;     // empty for now;
  usdcBalance: number;       // starts at 0.10
  reputation: number;        // 0-100, starts at 50
  status: AgentStatus;
  totalEarned: number;
  totalSpent: number;
  jobsCompleted: number;
  jobsFailed: number;
  currentTaskId: string | null;
  bidStrategy: BidStrategy;
  poolType: string | null;   // e.g. "hiring", "escrow", null for specialists

  // ── Phase 7 Advanced Features ──────────────────────────────────────────────
  consecutiveIdleCycles: number; // tracks unemployment
  consecutiveWins: number;       // tracks popularity/high-demand
  loanBalance: number;           // loan amount to repay
  loanInterestRate: number;      // credit score determined rate
  loanDueDate?: number;          // when the loan should be automatically repaid
  qualityOffset: number;         // permanent improvement from education
  certifications: string[];      // dynamic skill certs
  isHighDefaultRisk: boolean;    // collateral default seizure flag
}

export interface Bid {
  id: string;
  agentId: string;
  agentName: string;
  agentInstanceId: string;
  bidAmountUSDC: number;
  estimatedTimeMs: number;
  message: string;
  status: BidStatus;
  counterOfferUSDC: number | null;
  placedAt: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  requiredSkill: string;
  budgetUSDC: number;
  status: TaskStatus;
  postedBy: string;          // agent instanceId
  assignedTo: string | null; // agent instanceId or guildId
  assignedAgentName: string | null;
  bids: Bid[];
  createdAt: number;
  completedAt: number | null;
  result: string | null;
  qualityScore: number | null;
  escrowTxHash: string | null;
  paymentTxHash: string | null;
  hiringAgentId: string | null;  // which hiring agent handled this
  assignedGuildId?: string | null; // Phase 7: if guild wins
  taskVariant: "normal" | "guild" | "court" | "subcontract" | "loan" | "education";
  guildName: string | null;
  isAppeal: boolean;
  subcontractedTo: string | null;
  loanTriggered: boolean;
  educationTriggered: boolean;
}

export interface Guild {
  id: string;
  name: string;
  skills: string[];
  memberInstanceIds: string[];
  treasuryUSDC: number;
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
  // Phase 7 stats
  totalLoansDisbursed: number;
  totalGuildCapital: number;
}
