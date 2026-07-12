/**
 * taskStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * In-memory Task ID ledger for NexusAgent.
 *
 * Every task that spawns gets a unique four-digit Task ID (e.g. "0047", "3891").
 * The full lifecycle of the task — bids, hire, subcontract, guild, loans,
 * payments, appeals, verdict — is stored under that single Task ID.
 *
 * Functions:
 *   createTaskRecord()     → generate 4-digit ID, create record, return taskId
 *   getTaskRecord()        → return full record
 *   updateTaskRecord()     → merge updates into existing record
 *   appendPayment()        → push to payments[]
 *   appendSubcontract()    → push to subcontracts[]
 *   appendAppeal()         → push to appeals[]
 *   getAllTaskRecords()     → return all records
 *   getTasksByStatus()     → filter by status
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BidRecord {
  agentId: string;
  agentName: string;
  bidAmount: number;
  timestamp: string;
}

export interface HiredRecord {
  agentId: string;
  agentName: string;
  hiredAt: string;
  amount: number;
}

export interface SubcontractRecord {
  hiredBy: string;
  subcontractAgent: string;
  amount: number;
  workDescription: string;
  workCompleted: boolean;
  paymentSent: boolean;
  txHash: string | null;
  timestamp: string;
}

export interface GuildActivity {
  guildId: string;
  guildName: string;
  members: string[];
  roles: { agentId: string; role: string }[];
  formed: string;
  outcome: string;
}

export interface BankLoan {
  borrower: string;
  amount: number;
  takenAt: string;
  repaid: boolean;
  repaidAt: string | null;
}

export interface PaymentRecord {
  from: string;
  to: string;
  amount: number;
  txHash: string;
  reason: string;
  timestamp: string;
}

export interface AppealRecord {
  appealId: string;
  filedBy: string;
  filingFeeTxHash: string;
  issue: string;
  filedAt: string;
  verdict: string | null;
  verdictAt: string | null;
  forcedPaymentTxHash: string | null;
  judgeFeeCollected: number | null;
  evidence?: string;
  reasoning?: string;
  amountOwed?: number;
}

export interface TaskRecord {
  taskId: string;                    // Four-digit zero-padded (e.g. "0047")
  internalTaskId: string;            // The internal UUID used by taskQueue
  title: string;
  description: string;
  reward: number;
  spawnedAt: string;
  spawnedBy: string;
  status: 'active' | 'completed' | 'disputed' | 'resolved';
  agents: {
    bids: BidRecord[];
    hired: HiredRecord | null;
  };
  subcontracts: SubcontractRecord[];
  guildActivity: GuildActivity | null;
  bankLoans: BankLoan[];
  payments: PaymentRecord[];
  finalOutput: string | null;
  completedAt: string | null;
  appeals: AppealRecord[];
}

// ── In-memory store ───────────────────────────────────────────────────────────

const store = new Map<string, TaskRecord>();
const usedIds = new Set<string>();

// ── ID Generator ──────────────────────────────────────────────────────────────

function generateFourDigitId(): string {
  let attempts = 0;
  while (attempts < 100) {
    const num = Math.floor(Math.random() * 9000) + 1000; // 1000–9999
    const id = String(num).padStart(4, '0');
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
    attempts++;
  }
  // Fallback: sequential
  for (let i = 1; i <= 9999; i++) {
    const id = String(i).padStart(4, '0');
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
  }
  throw new Error('All 9999 Task IDs exhausted');
}

// ── CRUD Functions ────────────────────────────────────────────────────────────

export function createTaskRecord(taskData: {
  internalTaskId: string;
  title: string;
  description: string;
  reward: number;
  spawnedBy: string;
}): string {
  const taskId = generateFourDigitId();

  const record: TaskRecord = {
    taskId,
    internalTaskId: taskData.internalTaskId,
    title: taskData.title,
    description: taskData.description,
    reward: taskData.reward,
    spawnedAt: new Date().toISOString(),
    spawnedBy: taskData.spawnedBy,
    status: 'active',
    agents: {
      bids: [],
      hired: null,
    },
    subcontracts: [],
    guildActivity: null,
    bankLoans: [],
    payments: [],
    finalOutput: null,
    completedAt: null,
    appeals: [],
  };

  store.set(taskId, record);
  console.log(`📋 Task spawned — Task ID: ${taskId} | "${taskData.title.slice(0, 50)}"`);
  return taskId;
}

export function getTaskRecord(taskId: string): TaskRecord | undefined {
  return store.get(taskId);
}

export function getTaskRecordByInternalId(internalTaskId: string): TaskRecord | undefined {
  for (const record of store.values()) {
    if (record.internalTaskId === internalTaskId) return record;
  }
  return undefined;
}

export function updateTaskRecord(taskId: string, updates: Partial<Omit<TaskRecord, 'taskId'>>): void {
  const record = store.get(taskId);
  if (!record) {
    console.warn(`⚠️ [taskStore] updateTaskRecord: Task ID ${taskId} not found`);
    return;
  }
  Object.assign(record, updates);
  store.set(taskId, record);
}

export function appendPayment(taskId: string, paymentData: PaymentRecord): void {
  const record = store.get(taskId);
  if (!record) {
    console.warn(`⚠️ [taskStore] appendPayment: Task ID ${taskId} not found`);
    return;
  }
  record.payments.push(paymentData);
  store.set(taskId, record);
  console.log(`💳 Payment logged to task ${taskId}: ${paymentData.amount} USDC from ${paymentData.from} → ${paymentData.to}`);
}

export function appendSubcontract(taskId: string, subcontractData: SubcontractRecord): void {
  const record = store.get(taskId);
  if (!record) {
    console.warn(`⚠️ [taskStore] appendSubcontract: Task ID ${taskId} not found`);
    return;
  }
  record.subcontracts.push(subcontractData);
  store.set(taskId, record);
  console.log(`🔗 Subcontract logged to task ${taskId}: ${subcontractData.hiredBy} → ${subcontractData.subcontractAgent}`);
}

export function appendAppeal(taskId: string, appealData: AppealRecord): void {
  const record = store.get(taskId);
  if (!record) {
    console.warn(`⚠️ [taskStore] appendAppeal: Task ID ${taskId} not found`);
    return;
  }
  record.appeals.push(appealData);
  store.set(taskId, record);
  console.log(`⚖️ Appeal logged to task ${taskId}: filed by ${appealData.filedBy}`);
}

export function getAllTaskRecords(): TaskRecord[] {
  return Array.from(store.values());
}

export function getTasksByStatus(status: TaskRecord['status']): TaskRecord[] {
  return Array.from(store.values()).filter(r => r.status === status);
}
