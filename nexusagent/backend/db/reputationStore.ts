/**
 * reputationStore.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * In-memory reputation ledger for NexusAgent — Phase 5 (NEW).
 *
 * Tracks competitive performance across all pipeline runs:
 *  { pipelineId: 'alpha'|'beta', wins, losses, totalScore, runs, totalEarned }
 *
 * Functions: recordRun(), getStats(), getAllStats()
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PipelineReputation {
  pipelineId:   string;   // 'alpha' | 'beta'
  wins:         number;
  losses:       number;
  totalScore:   number;   // sum of all scores (for average calculation)
  runs:         number;   // total number of bounty runs
  totalEarned:  number;   // total USDC earned (from wins)
}

export interface LeaderboardEntry extends PipelineReputation {
  winRate:  number;  // wins / runs (0-1)
  avgScore: number;  // totalScore / runs
}

// ── In-memory store ────────────────────────────────────────────────────────────

const store = new Map<string, PipelineReputation>();

// Initialise both pipelines
function ensureExists(pipelineId: string): PipelineReputation {
  if (!store.has(pipelineId)) {
    store.set(pipelineId, {
      pipelineId,
      wins: 0, losses: 0, totalScore: 0, runs: 0, totalEarned: 0,
    });
  }
  return store.get(pipelineId)!;
}

// ── CRUD functions ─────────────────────────────────────────────────────────────

/**
 * recordRun
 * Updates a pipeline's reputation record after a bounty run completes.
 *
 * @param pipelineId  'alpha' or 'beta'
 * @param won         Whether this pipeline won the bounty
 * @param score       Judge's score (1-10)
 * @param earned      USDC earned (0 if lost, bounty.reward if won)
 */
export function recordRun(
  pipelineId: string,
  won: boolean,
  score: number,
  earned: number
): PipelineReputation {
  const record = ensureExists(pipelineId);
  record.runs++;
  record.totalScore += score;
  record.totalEarned += earned;
  if (won) {
    record.wins++;
  } else {
    record.losses++;
  }
  store.set(pipelineId, record);
  return { ...record };
}

/**
 * getStats
 * Returns the reputation record for a specific pipeline.
 */
export function getStats(pipelineId: string): PipelineReputation {
  return { ...ensureExists(pipelineId) };
}

/**
 * getAllStats
 * Returns all pipeline records as an array.
 */
export function getAllStats(): PipelineReputation[] {
  // Ensure both pipelines exist even if never run
  ensureExists('alpha');
  ensureExists('beta');
  return Array.from(store.values()).map((r) => ({ ...r }));
}
