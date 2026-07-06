/**
 * agentRepository.ts
 * All Firestore database reads and writes for agents.
 * Collection: "agents" — document ID = instanceId
 */

import { db, isFirebaseEnabled } from "./firebaseAdmin.js";
import { Agent } from "../economy/types.js";

const COLLECTION = "agents";

/**
 * Writes a full agent document to Firestore (merge: true).
 * Fire-and-forget safe.
 */
export async function saveAgent(agent: Agent): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    const docData: Record<string, any> = {
      instanceId: agent.instanceId,
      name: agent.name,
      role: agent.role,
      skills: agent.skills,
      usdcBalance: agent.usdcBalance,
      reputation: agent.reputation,
      totalEarned: agent.totalEarned,
      totalSpent: agent.totalSpent,
      jobsCompleted: agent.jobsCompleted,
      jobsFailed: agent.jobsFailed,
      status: agent.status,
      bidStrategy: agent.bidStrategy,
      walletId: agent.walletId,
      walletAddress: agent.walletAddress,
      currentTaskId: agent.currentTaskId ?? null,
      guildName: (agent as any).guildName ?? null,
      isInGuild: (agent as any).isInGuild ?? false,
      hasAdvancedCert: agent.certifications?.includes("Advanced Certification") ?? false,
      qualityOffset: agent.qualityOffset ?? 0,
      loanAmount: agent.loanBalance ?? 0,
      loanRepaid: 0,
      loanInterestRate: agent.loanInterestRate ?? 0,
      isHighDefaultRisk: agent.isHighDefaultRisk ?? false,
      consecutiveWins: agent.consecutiveWins ?? 0,
      consecutiveIdleCycles: agent.consecutiveIdleCycles ?? 0,
      lastUpdated: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
    };
    await db.collection(COLLECTION).doc(agent.instanceId).set(docData, { merge: true });
  } catch (err) {
    // Silent error — never crash economy loop
    console.error("🔥 [agentRepository] saveAgent error:", (err as Error).message);
  }
}

/**
 * Batch-writes all agents to Firestore.
 * Fire-and-forget safe.
 */
export async function saveAllAgents(agents: Agent[]): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    const batch = db.batch();
    for (const agent of agents) {
      const ref = db.collection(COLLECTION).doc(agent.instanceId);
      const docData: Record<string, any> = {
        instanceId: agent.instanceId,
        name: agent.name,
        role: agent.role,
        skills: agent.skills,
        usdcBalance: agent.usdcBalance,
        reputation: agent.reputation,
        totalEarned: agent.totalEarned,
        totalSpent: agent.totalSpent,
        jobsCompleted: agent.jobsCompleted,
        jobsFailed: agent.jobsFailed,
        status: agent.status,
        bidStrategy: agent.bidStrategy,
        walletId: agent.walletId,
        walletAddress: agent.walletAddress,
        currentTaskId: agent.currentTaskId ?? null,
        guildName: (agent as any).guildName ?? null,
        isInGuild: (agent as any).isInGuild ?? false,
        hasAdvancedCert: agent.certifications?.includes("Advanced Certification") ?? false,
        qualityOffset: agent.qualityOffset ?? 0,
        loanAmount: agent.loanBalance ?? 0,
        loanRepaid: 0,
        loanInterestRate: agent.loanInterestRate ?? 0,
        isHighDefaultRisk: agent.isHighDefaultRisk ?? false,
        consecutiveWins: agent.consecutiveWins ?? 0,
        consecutiveIdleCycles: agent.consecutiveIdleCycles ?? 0,
        lastUpdated: db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString(),
      };
      batch.set(ref, docData, { merge: true });
    }
    await batch.commit();
    console.log(`🔥 [agentRepository] Batch saved ${agents.length} agents to Firestore.`);
  } catch (err) {
    console.error("🔥 [agentRepository] saveAllAgents error:", (err as Error).message);
  }
}

/**
 * Fetches one agent document by instanceId.
 */
export async function getAgentFromDB(instanceId: string): Promise<Agent | null> {
  if (!isFirebaseEnabled()) return null;
  try {
    const doc = await db.collection(COLLECTION).doc(instanceId).get();
    if (!doc.exists) return null;
    return doc.data() as Agent;
  } catch (err) {
    console.error("🔥 [agentRepository] getAgent error:", (err as Error).message);
    return null;
  }
}

/**
 * Fetches all agent documents from Firestore.
 */
export async function getAllAgentsFromDB(): Promise<Agent[]> {
  if (!isFirebaseEnabled()) return [];
  try {
    const snapshot = await db.collection(COLLECTION).get();
    return snapshot.docs.map((doc: any) => doc.data() as Agent);
  } catch (err) {
    console.error("🔥 [agentRepository] getAllAgents error:", (err as Error).message);
    return [];
  }
}

/**
 * Updates specific fields of an agent document.
 * Always adds lastUpdated timestamp.
 * Fire-and-forget safe — never awaited in critical path.
 */
export async function updateAgentFields(
  instanceId: string,
  fields: Partial<Agent>
): Promise<void> {
  if (!isFirebaseEnabled()) return;
  try {
    const updateData: Record<string, any> = { ...fields };
    // Map loanBalance → loanAmount for Firestore schema
    if ("loanBalance" in fields) {
      updateData.loanAmount = fields.loanBalance;
      delete updateData.loanBalance;
    }
    if ("certifications" in fields && Array.isArray(fields.certifications)) {
      updateData.hasAdvancedCert = fields.certifications.includes("Advanced Certification");
    }
    updateData.lastUpdated = db.FieldValue?.serverTimestamp?.() ?? new Date().toISOString();
    await db.collection(COLLECTION).doc(instanceId).update(updateData);
  } catch (err) {
    // Silent — never crash the economy
    console.error("🔥 [agentRepository] updateAgentFields error:", (err as Error).message);
  }
}
