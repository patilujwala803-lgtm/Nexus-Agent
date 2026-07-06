export type TaskStatus = 'open' | 'bidding' | 'in-progress' | 'verifying' | 'complete' | 'failed';
export type BidStatus = 'pending' | 'accepted' | 'rejected' | 'countered';
export type FlowPhase = 'spawned' | 'bidding' | 'hired' | 'working' | 'verifying' | 'complete' | 'failed';
export type TaskTier = 'easy' | 'medium' | 'complex';
export type TaskVariant = 'normal' | 'guild' | 'court' | 'subcontract' | 'loan' | 'education';

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
  placedAt?: number;
  reputation?: number;
  jobsCompleted?: number;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  requiredSkill: string;
  budgetUSDC: number;
  status: TaskStatus;
  postedBy: string;
  assignedTo: string | null;
  assignedAgentName: string | null;
  bids: Bid[];
  createdAt: number;
  completedAt: number | null;
  result: string | null;
  qualityScore: number | null;
  escrowTxHash: string | null;
  paymentTxHash: string | null;
  hiringAgentId: string | null;
  assignedGuildId?: string | null;
  taskVariant?: TaskVariant;
  guildName?: string | null;
  isAppeal?: boolean;
  subcontractedTo?: string | null;
  loanTriggered?: boolean;
  educationTriggered?: boolean;
}

export interface Agent {
  id: string;
  instanceId: string;
  name: string;
  role: 'producer' | 'verifier' | 'finance' | 'meta' | string;
  skills: string[];
  usdcBalance: number;
  reputation: number;
  status: 'idle' | 'busy' | 'offline' | string;
  jobsCompleted: number;
  jobsFailed?: number;
  totalEarned: number;
  totalSpent: number;
  bidStrategy?: 'aggressive' | 'standard' | 'premium' | string;
  certifications?: string[];
  isHighDefaultRisk?: boolean;
  loanBalance?: number;
  loanInterestRate?: number;
  qualityOffset?: number;
  guildName?: string | null;
  currentTaskId?: string | null;
  walletAddress?: string | null;
  walletId?: string | null;
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

export interface FlowState {
  taskId: string;
  task: Task;
  status: TaskStatus;
  bids: Bid[];
  winnerAgentId: string | null;
  workerAgent: Agent | null;
  result: string | null;
  qualityScore: number | null;
  paymentTxHash: string | null;
  phase: FlowPhase;
  createdAt: number;
  completedAt?: number | null;
  biddingActive?: boolean;
  escrowLocked?: boolean;
  juryEvaluating?: boolean;
  appealStatus?: string | null;
  tier: TaskTier;
  taskVariant: TaskVariant;
  guildName: string | null;
  isAppeal: boolean;
  subcontractedTo: string | null;
  loanTriggered: boolean;
  educationTriggered: boolean;
  hiringAgentName?: string | null;
  // Supreme Court fields
  courtOpinion?: string | null;
  courtVerdict?: 'overturned' | 'upheld' | null;
  justiceVotes?: Array<{ name: string; vote: string; reason: string }>;
  juryVotes?: Array<{ jurorId: string; jurorName: string; approve: boolean }>;
}


export interface TravelingCircle {
  id: string;
  color: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'info' | 'error';
}
