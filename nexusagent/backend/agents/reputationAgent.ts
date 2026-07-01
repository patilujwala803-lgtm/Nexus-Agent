/**
 * reputationAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Reputation Agent for NexusAgent — Phase 5 (NEW).
 *
 * Tracks pipeline performance across bounty runs and provides a live
 * leaderboard. Does NOT hold a wallet — purely a data tracking agent.
 *
 * Functions:
 *   recordResult()   — update reputation after a bounty completes
 *   getLeaderboard() — return sorted rankings
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { recordRun, getAllStats } from '../db/reputationStore.js';
import type { LeaderboardEntry } from '../db/reputationStore.js';

// ── Socket.io emitter ─────────────────────────────────────────────────────────
type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerReputationEmitter(fn: EmitFn) { _emit = fn; }
function emit(event: string, data: unknown) { _emit(event, data); }

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * recordResult
 * Called by Master Agent after each bounty to update pipeline standings.
 *
 * @param pipelineId  'alpha' | 'beta'
 * @param won         Whether this pipeline won
 * @param score       Judge's score (1-10)
 * @param earned      USDC earned (bounty.reward if won, 0 if lost)
 */
export function recordResult(
  pipelineId: 'alpha' | 'beta',
  won: boolean,
  score: number,
  earned: number
): { pipelineId: string; wins: number; losses: number; totalEarned: number } {
  const label = won ? 'WON' : 'LOST';
  console.log(`📋 Reputation Agent recording result: Pipeline ${pipelineId.toUpperCase()} — ${label} — score ${score}/10`);

  const updated = recordRun(pipelineId, won, score, earned);

  emit('reputation_updated', {
    pipelineId,
    won,
    score,
    earned,
    wins:   updated.wins,
    losses: updated.losses,
    runs:   updated.runs,
  });

  return {
    pipelineId: updated.pipelineId,
    wins:       updated.wins,
    losses:     updated.losses,
    totalEarned: updated.totalEarned,
  };
}

/**
 * getLeaderboard
 * Returns all pipeline standings sorted by win rate (descending).
 * Does NOT emit — call emitLeaderboard() from masterAgent after a bounty completes
 * to avoid the HTTP-route → emit → fetch → emit infinite loop.
 */
export function getLeaderboard(): LeaderboardEntry[] {
  const allStats = getAllStats();

  const leaderboard: LeaderboardEntry[] = allStats.map((s) => ({
    ...s,
    winRate:  s.runs > 0 ? s.wins / s.runs : 0,
    avgScore: s.runs > 0 ? parseFloat((s.totalScore / s.runs).toFixed(2)) : 0,
  }));

  // Sort by win rate desc, then avg score desc as tiebreaker
  leaderboard.sort((a, b) =>
    b.winRate !== a.winRate
      ? b.winRate - a.winRate
      : b.avgScore - a.avgScore
  );

  console.log(`⭐ Leaderboard fetched — ${leaderboard.length} pipelines`);
  leaderboard.forEach((entry, i) => {
    const winPct = (entry.winRate * 100).toFixed(0);
    console.log(
      `   ${i + 1}. Pipeline ${entry.pipelineId.toUpperCase().padEnd(6)} ` +
      `| ${entry.wins}W-${entry.losses}L | Win rate: ${winPct}% ` +
      `| Avg score: ${entry.avgScore}/10 | Earned: $${entry.totalEarned.toFixed(4)} USDC`
    );
  });

  // NO emit here — emitting belongs only in masterAgent after bounty completion.

  return leaderboard;
}

/**
 * emitLeaderboard
 * Explicitly broadcasts the leaderboard via Socket.io.
 * Called by masterAgent.ts ONLY — never from HTTP routes.
 */
export function emitLeaderboard(): LeaderboardEntry[] {
  const leaderboard = getLeaderboard();
  emit('leaderboard_updated', { leaderboard });
  return leaderboard;
}
