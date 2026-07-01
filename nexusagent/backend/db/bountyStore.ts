/**
 * bountyStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * In-memory bounty store for NexusAgent.
 *
 * Manages the full lifecycle of bounties:
 *  - Created by humans (or the demo script)
 *  - Picked up and competed on by AI agents
 *  - Evaluated by the Judge Agent
 *  - Settled with USDC payments to the winner
 *
 * Note: This is intentionally in-memory for Phase 1.
 *       Phase 3+ will migrate to a persistent database.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { v4 as uuidv4 } from 'uuid';

// ── Types ─────────────────────────────────────────────────────────────────────

/** Status lifecycle of a bounty */
export type BountyStatus =
  | 'open'        // posted, waiting for agents
  | 'in_progress' // at least one agent is working
  | 'judging'     // judge agent is evaluating submissions
  | 'completed'   // winner declared, USDC released
  | 'cancelled';  // cancelled before completion

/** A single submission from an agent */
export interface Submission {
  agentId: string;          // which agent submitted
  agentName: string;        // human-readable agent name
  content: string;          // the actual deliverable text
  txHash?: string;          // optional: tx hash of nanopayment(s) made
  score?: number;           // score assigned by judge (0-100)
  timestamp: string;        // ISO timestamp
}

/** Full bounty record */
export interface Bounty {
  id: string;               // UUID
  title: string;            // short human-readable title
  description: string;      // full task description for agents
  reward: number;           // USDC amount (e.g. 5.00)
  status: BountyStatus;
  postedBy: string;         // wallet address or user alias
  submissions: Submission[];
  winner?: string;          // winning agentId
  winnerTxHash?: string;    // tx hash of the reward payout
  createdAt: string;        // ISO timestamp
  updatedAt: string;        // ISO timestamp
}

// ── In-memory store ───────────────────────────────────────────────────────────

/** Map of bountyId → Bounty, acts as our "database" */
const bounties = new Map<string, Bounty>();

// ── CRUD functions ────────────────────────────────────────────────────────────

/**
 * createBounty
 * Creates a new bounty and adds it to the store.
 *
 * @param params  Title, description, reward, and postedBy fields
 * @returns       The newly created Bounty record
 */
export function createBounty(params: {
  title: string;
  description: string;
  reward: number;
  postedBy: string;
}): Bounty {
  const now = new Date().toISOString();
  const bounty: Bounty = {
    id:          uuidv4(),
    title:       params.title,
    description: params.description,
    reward:      params.reward,
    status:      'open',
    postedBy:    params.postedBy,
    submissions: [],
    createdAt:   now,
    updatedAt:   now,
  };

  bounties.set(bounty.id, bounty);
  console.log(`📋 New bounty created: "${bounty.title}" [${bounty.id}] — $${bounty.reward} USDC`);
  return bounty;
}

/**
 * getBounty
 * Retrieves a single bounty by its ID.
 *
 * @param id  Bounty UUID
 * @returns   The Bounty record, or undefined if not found
 */
export function getBounty(id: string): Bounty | undefined {
  return bounties.get(id);
}

/**
 * getAllBounties
 * Returns all bounties, sorted by creation time (newest first).
 */
export function getAllBounties(): Bounty[] {
  return Array.from(bounties.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * addSubmission
 * Adds an agent's submission to a bounty and transitions status to in_progress.
 *
 * @param bountyId    The target bounty UUID
 * @param submission  Submission data from the agent
 * @returns           Updated Bounty, or undefined if bounty not found
 */
export function addSubmission(
  bountyId: string,
  submission: Omit<Submission, 'timestamp'>
): Bounty | undefined {
  const bounty = bounties.get(bountyId);
  if (!bounty) {
    console.error(`❌  Cannot add submission — bounty ${bountyId} not found`);
    return undefined;
  }

  if (bounty.status === 'completed' || bounty.status === 'cancelled') {
    console.warn(`⚠️  Bounty ${bountyId} is already ${bounty.status} — submission ignored`);
    return bounty;
  }

  const fullSubmission: Submission = {
    ...submission,
    timestamp: new Date().toISOString(),
  };

  bounty.submissions.push(fullSubmission);
  bounty.status    = 'in_progress';
  bounty.updatedAt = new Date().toISOString();

  console.log(
    `📝 Submission received for bounty "${bounty.title}" from agent ${submission.agentName}`
  );
  return bounty;
}

/**
 * declareWinner
 * Marks a bounty as completed and records the winning agent + payout tx.
 *
 * @param bountyId      The target bounty UUID
 * @param agentId       The winning agent's ID
 * @param winnerTxHash  Optional tx hash of the USDC payout
 * @returns             Updated Bounty, or undefined if not found
 */
export function declareWinner(
  bountyId: string,
  agentId: string,
  winnerTxHash?: string
): Bounty | undefined {
  const bounty = bounties.get(bountyId);
  if (!bounty) {
    console.error(`❌  Cannot declare winner — bounty ${bountyId} not found`);
    return undefined;
  }

  bounty.winner       = agentId;
  bounty.winnerTxHash = winnerTxHash;
  bounty.status       = 'completed';
  bounty.updatedAt    = new Date().toISOString();

  console.log(`🏆 Winner declared for bounty "${bounty.title}" → Agent ${agentId}`);
  if (winnerTxHash) {
    console.log(`   💸 Payout tx: ${winnerTxHash}`);
  }

  return bounty;
}

/**
 * updateStatus
 * Generic status update for a bounty (e.g. open → judging).
 *
 * @param bountyId  The target bounty UUID
 * @param status    New BountyStatus value
 * @returns         Updated Bounty, or undefined if not found
 */
export function updateStatus(
  bountyId: string,
  status: BountyStatus
): Bounty | undefined {
  const bounty = bounties.get(bountyId);
  if (!bounty) {
    console.error(`❌  Cannot update status — bounty ${bountyId} not found`);
    return undefined;
  }

  bounty.status    = status;
  bounty.updatedAt = new Date().toISOString();

  console.log(`🔄 Bounty "${bounty.title}" status → ${status}`);
  return bounty;
}

/**
 * getBountiesByStatus
 * Convenience filter — returns bounties matching a given status.
 *
 * @param status  The BountyStatus to filter by
 */
export function getBountiesByStatus(status: BountyStatus): Bounty[] {
  return getAllBounties().filter((b) => b.status === status);
}

/**
 * updateBountyStatus
 * Updates a bounty's status and merges in extra metadata (winner, scores, txHash).
 * Used by Master Agent to record the full completion result.
 */
export function updateBountyStatus(
  bountyId: string,
  status: BountyStatus,
  meta?: Record<string, unknown>
): Bounty | undefined {
  const bounty = bounties.get(bountyId);
  if (!bounty) return undefined;

  bounty.status    = status;
  bounty.updatedAt = new Date().toISOString();

  if (meta?.winner)       bounty.winner       = meta.winner as string;
  if (meta?.rewardTxHash) bounty.winnerTxHash = meta.rewardTxHash as string;

  // Store extra fields directly on the object for the result endpoint
  Object.assign(bounty, meta);

  console.log(`🔄 Bounty "${bounty.title}" → ${status}`);
  return bounty;
}
