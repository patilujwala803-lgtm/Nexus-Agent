/**
 * taskRepository.ts
 * Firestore reads/writes for tasks and the economy transaction log.
 * Collection: "tasks" — document ID = task.id
 * Collection: "transactions" — document ID = txHash or auto-ID
 */

import { db, isFirebaseEnabled } from "./firebaseAdmin.js";

const TASKS_COL = "tasks";
const TXN_COL = "transactions";
const ECONOMY_COL = "economy";

// ── Task Document Schema ───────────────────────────────────────────────────────
interface TaskDoc {
  id: string;
  title: string;
  description: string;
  requiredSkill: string;
  budgetUSDC: number;
  status: string;
  postedBy: string;
  assignedTo: string | null;
  assignedAgentName: string | null;
  taskVariant: string;
  tier: string;
  isAppeal: boolean;
  loanTriggered: boolean;
  educationTriggered: boolean;
  guildName: string | null;
  subcontractedTo: string | null;
  hiringAgentId: string | null;
  qualityScore: number | null;
  escrowTxHash: string | null;
  paymentTxHash: string | null;
  result: string | null;
  createdAt: number;
  completedAt: number | null;
  lastUpdated: any;
}

/**
 * Writes a task document to Firestore. Fire-and-forget.
 */
export async function saveTask(task: any): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    const docData: TaskDoc = {
      id: task.id,
      title: task.title,
      description: task.description,
      requiredSkill: task.requiredSkill,
      budgetUSDC: task.budgetUSDC,
      status: task.status,
      postedBy: task.postedBy ?? "system",
      assignedTo: task.assignedTo ?? null,
      assignedAgentName: task.assignedAgentName ?? null,
      taskVariant: task.taskVariant ?? "normal",
      tier: task.tier ?? "easy",
      isAppeal: task.isAppeal ?? false,
      loanTriggered: task.loanTriggered ?? false,
      educationTriggered: task.educationTriggered ?? false,
      guildName: task.guildName ?? null,
      subcontractedTo: task.subcontractedTo ?? null,
      hiringAgentId: task.hiringAgentId ?? null,
      qualityScore: task.qualityScore ?? null,
      escrowTxHash: task.escrowTxHash ?? null,
      paymentTxHash: task.paymentTxHash ?? null,
      result: task.result ?? null,
      createdAt: task.createdAt ?? Date.now(),
      completedAt: task.completedAt ?? null,
      lastUpdated: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
    };
    await db.collection(TASKS_COL).doc(task.id).set(docData, { merge: true });
  } catch (err) {
    console.error("🔥 [taskRepository] saveTask error:", (err as Error).message);
  }
}

/**
 * Updates specific task fields. Fire-and-forget.
 */
export async function updateTaskFields(taskId: string, fields: Record<string, any>): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    await db.collection(TASKS_COL).doc(taskId).update({
      ...fields,
      lastUpdated: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
    });
  } catch (err) {
    console.error("🔥 [taskRepository] updateTaskFields error:", (err as Error).message);
  }
}

/**
 * Records a completed payment transaction in Firestore.
 */
export async function saveTransaction(tx: {
  txHash: string;
  taskId: string;
  taskTitle: string;
  fromAgentId: string;
  fromAgentName: string;
  toAgentId: string;
  toAgentName: string;
  amountUSDC: number;
  type: "escrow" | "payment" | "loan" | "education" | "guild_seed" | "jury_fee" | "court_appeal" | "subcontract";
  isMock?: boolean;
}): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    const docId = tx.txHash || `tx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await db.collection(TXN_COL).doc(docId).set({
      ...tx,
      timestamp: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("🔥 [taskRepository] saveTransaction error:", (err as Error).message);
  }
}

/**
 * Saves a complete snapshot of the current economy stats to Firestore.
 * Called every 30 seconds by the economy loop.
 */
export async function saveEconomySnapshot(stats: {
  totalAgents: number;
  idleAgents: number;
  busyAgents: number;
  totalTasksSpawned: number;
  completedTasks: number;
  failedTasks: number;
  activeTasks: number;
  totalUSDCFlowed: number;
  totalLoansDisbursed: number;
  totalGuildCapital: number;
  isRunning: boolean;
  uptimeSeconds: number;
  topEarner: { name: string; amount: number } | null;
}): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    await db.collection(ECONOMY_COL).doc("current_stats").set({
      ...stats,
      lastUpdated: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
      snapshotAt: Date.now(),
    });
  } catch (err) {
    console.error("🔥 [taskRepository] saveEconomySnapshot error:", (err as Error).message);
  }
}

/**
 * Saves a guild formation event to Firestore.
 */
export async function saveGuildEvent(event: {
  guildId: string;
  guildName: string;
  memberIds: string[];
  memberNames: string[];
  taskId: string;
  taskTitle: string;
  seedAmount: number;
}): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    await db.collection("guilds").doc(event.guildId).set({
      ...event,
      formedAt: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
      createdAt: Date.now(),
    }, { merge: true });
  } catch (err) {
    console.error("🔥 [taskRepository] saveGuildEvent error:", (err as Error).message);
  }
}

/**
 * Saves a loan record to Firestore.
 */
export async function saveLoanRecord(loan: {
  agentId: string;
  agentName: string;
  amount: number;
  interestRate: number;
  taskId: string;
  bankId: string;
  txHash?: string;
}): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    const loanId = `loan-${loan.agentId}-${Date.now()}`;
    await db.collection("loans").doc(loanId).set({
      ...loan,
      status: "active",
      issuedAt: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
      createdAt: Date.now(),
      repaidAt: null,
    });
  } catch (err) {
    console.error("🔥 [taskRepository] saveLoanRecord error:", (err as Error).message);
  }
}

/**
 * Saves a court dispute event to Firestore.
 */
export async function saveCourtEvent(event: {
  taskId: string;
  taskTitle: string;
  agentId: string;
  agentName: string;
  appealFee: number;
  originalScore: number;
  verdict: string;
  round: string;
}): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    const eventId = `court-${event.taskId}-${Date.now()}`;
    await db.collection("court_events").doc(eventId).set({
      ...event,
      timestamp: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
      createdAt: Date.now(),
    });
  } catch (err) {
    console.error("🔥 [taskRepository] saveCourtEvent error:", (err as Error).message);
  }
}

/**
 * Fetches all tasks from Firestore.
 */
export async function getAllTasks(): Promise<any[]> {
  if (!isFirebaseEnabled()) return [];
  try {
    const snapshot = await db.collection(TASKS_COL)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();
    return snapshot.docs.map((doc: any) => doc.data());
  } catch (err) {
    console.error("🔥 [taskRepository] getAllTasks error:", (err as Error).message);
    return [];
  }
}

/**
 * Fetches a specific task's history from Firestore by ID.
 */
export async function getTaskHistory(taskId: string): Promise<any | null> {
  if (!isFirebaseEnabled()) return null;
  try {
    const doc = await db.collection(TASKS_COL).doc(taskId).get();
    if (!doc.exists) return null;
    return doc.data();
  } catch (err) {
    console.error("🔥 [taskRepository] getTaskHistory error:", (err as Error).message);
    return null;
  }
}
