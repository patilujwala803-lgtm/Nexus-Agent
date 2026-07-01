/**
 * judgeAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Judge Agent for NexusAgent — Phase 5 update.
 *
 * Now handles BOTH compliance screening AND comparative evaluation
 * (standalone Compliance Agent merged in).
 *
 * Flow inside evaluateSubmissions():
 *   Step A: Screen each submission for policy violations (Groq JSON)
 *   Step B: If both approved → run comparative scoring (Groq JSON)
 *   Step B alt: If one fails → auto-disqualify, other wins by default
 *
 * releaseBountyReward() — unchanged.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { askGeminiJSON } from '../circle/geminiClient.js';
import { transferBountyReward } from '../circle/paymentService.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Submission {
  agentId:  string;        // 'alpha' | 'beta'
  walletId: string;        // Circle wallet UUID for reward transfer
  content:  string;        // Formatted submission content
  title:    string;        // Submission title
}

export interface ComplianceResult {
  approved:  boolean;
  riskLevel: 'low' | 'medium' | 'high';
}

export interface JudgeVerdict {
  winner:       'A' | 'B';
  winnerAgentId: string;
  winnerReason: string;
  scoreA:       number;   // 1-10
  scoreB:       number;   // 1-10
  feedback:     string;
  complianceA:  ComplianceResult;
  complianceB:  ComplianceResult;
  timestamp:    string;
}

export interface RewardResult {
  txHash:   string;
  amount:   number;
  winner:   string;
  bountyId: string;
}

interface GroqJudgeResponse {
  winner:       'A' | 'B';
  winnerReason: string;
  scoreA:       number;
  scoreB:       number;
  feedback:     string;
}

// ── Socket.io emitter ─────────────────────────────────────────────────────────
type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerJudgeEmitter(fn: EmitFn) { _emit = fn; }
function emit(event: string, data: unknown) { _emit(event, data); }

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * screenSubmission
 * Compliance screen — Step A of evaluateSubmissions.
 * Defaults to approved:true if Groq response fails to parse (never blocks demo).
 */
async function screenSubmission(
  content: string,
  label: string
): Promise<ComplianceResult> {
  console.log(`   🛡️  Judge Agent screening submission ${label} for compliance...`);

  const safeDefault: ComplianceResult = { approved: true, riskLevel: 'low' };

  try {
    const result = await askGeminiJSON<ComplianceResult>(
      `Review this content for policy violations, misinformation, or inappropriate claims.
Content: ${content.slice(0, 800)}

Respond with ONLY valid JSON (no markdown):
{ "approved": true or false, "riskLevel": "low" or "medium" or "high" }`,
      'You are a content compliance reviewer. Respond ONLY with valid JSON. No prose.',
      2
    );
    // Validate shape
    if (typeof result.approved !== 'boolean') return safeDefault;
    if (!['low', 'medium', 'high'].includes(result.riskLevel)) result.riskLevel = 'low';
    return result;
  } catch {
    console.warn(`   ⚠️  Compliance screen for ${label} failed to parse — defaulting to approved`);
    return safeDefault;
  }
}

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * evaluateSubmissions
 * Step A: Screen both submissions for compliance.
 * Step B: Evaluate the approved ones; auto-disqualify any that fail.
 *
 * @param bountyTitle       Title of the bounty being judged
 * @param bountyDescription Full task description
 * @param submissions       Array of exactly 2 submissions [A, B]
 */
export async function evaluateSubmissions(
  bountyTitle: string,
  bountyDescription: string,
  submissions: Submission[]
): Promise<JudgeVerdict> {
  if (submissions.length < 2) {
    throw new Error('Judge Agent requires exactly 2 submissions to evaluate');
  }

  const [subA, subB] = submissions;

  console.log(`\n⚖️  Judge Agent evaluating ${submissions.length} submissions...`);
  console.log(`   📋 Bounty: "${bountyTitle}"`);
  emit('judging_started', { bountyTitle, submissionCount: submissions.length });

  // ── Step A: Compliance screening ───────────────────────────────────────────
  const [complianceA, complianceB] = await Promise.all([
    screenSubmission(subA.content, 'A'),
    screenSubmission(subB.content, 'B'),
  ]);

  const aLabel = `Agent ${subA.agentId.toUpperCase()}`;
  const bLabel = `Agent ${subB.agentId.toUpperCase()}`;

  console.log(`   🛡️  ${aLabel} compliance: ${complianceA.approved ? '✅ approved' : '❌ rejected'} (risk: ${complianceA.riskLevel})`);
  console.log(`   🛡️  ${bLabel} compliance: ${complianceB.approved ? '✅ approved' : '❌ rejected'} (risk: ${complianceB.riskLevel})`);

  emit('compliance_checked', {
    agentA: subA.agentId, complianceA,
    agentB: subB.agentId, complianceB,
  });

  // ── Auto-disqualify logic ──────────────────────────────────────────────────
  if (!complianceA.approved && !complianceB.approved) {
    console.warn('   ⚠️  Both submissions failed compliance — declaring tie, awarding A by default');
    return {
      winner: 'A', winnerAgentId: subA.agentId,
      winnerReason: 'Both submissions failed compliance screening. Defaulting to A.',
      scoreA: 0, scoreB: 0,
      feedback: 'Both submissions were disqualified for policy violations.',
      complianceA, complianceB,
      timestamp: new Date().toISOString(),
    };
  }

  if (!complianceA.approved) {
    console.warn(`   ⚠️  Submission A failed compliance screen — ${bLabel} wins by default`);
    emit('judging_complete', { winner: subB.agentId, scoreA: 0, scoreB: 10, reason: 'Compliance disqualification' });
    return {
      winner: 'B', winnerAgentId: subB.agentId,
      winnerReason: `${aLabel} was auto-disqualified for compliance failure.`,
      scoreA: 0, scoreB: 10,
      feedback: `${aLabel} disqualified. ${bLabel} wins by default.`,
      complianceA, complianceB,
      timestamp: new Date().toISOString(),
    };
  }

  if (!complianceB.approved) {
    console.warn(`   ⚠️  Submission B failed compliance screen — ${aLabel} wins by default`);
    emit('judging_complete', { winner: subA.agentId, scoreA: 10, scoreB: 0, reason: 'Compliance disqualification' });
    return {
      winner: 'A', winnerAgentId: subA.agentId,
      winnerReason: `${bLabel} was auto-disqualified for compliance failure.`,
      scoreA: 10, scoreB: 0,
      feedback: `${bLabel} disqualified. ${aLabel} wins by default.`,
      complianceA, complianceB,
      timestamp: new Date().toISOString(),
    };
  }

  // ── Step B: Comparative evaluation (both approved) ─────────────────────────
  console.log(`\n⚖️  Judge Agent scoring both approved submissions...`);

  const evalPrompt = `You are an impartial judge evaluating two AI agent submissions for a bounty task.

Task: ${bountyTitle}
Description: ${bountyDescription}

Submission A (${aLabel}):
${subA.content}

Submission B (${bLabel}):
${subB.content}

Evaluate based on: Accuracy, Clarity, Relevance, Completeness.

Respond with ONLY valid JSON (no markdown, no explanation outside the JSON):
{
  "winner": "A" or "B",
  "winnerReason": "one clear sentence explaining why this submission won",
  "scoreA": <integer 1-10>,
  "scoreB": <integer 1-10>,
  "feedback": "brief constructive feedback for both submissions"
}`;

  const systemPrompt = 'You are an impartial technical judge. Evaluate fairly and respond ONLY with valid JSON. No prose outside the JSON object.';

  const verdict = await askGeminiJSON<GroqJudgeResponse>(evalPrompt, systemPrompt, 3);

  // Validate
  const winner = verdict.winner === 'A' ? 'A' : 'B';
  const winnerAgentId = winner === 'A' ? subA.agentId : subB.agentId;
  const winnerScore   = winner === 'A' ? verdict.scoreA : verdict.scoreB;

  console.log(`\n🏆 Winner: Agent ${winnerAgentId.toUpperCase()} — score ${winnerScore}/10`);
  console.log(`   📊 Score A: ${verdict.scoreA}/10 | Score B: ${verdict.scoreB}/10`);
  console.log(`   💬 Reason: ${verdict.winnerReason}`);

  emit('judging_complete', {
    winner: winnerAgentId,
    scoreA: verdict.scoreA,
    scoreB: verdict.scoreB,
    winnerReason: verdict.winnerReason,
  });

  // Emit bounty_won for frontend banner
  emit('bounty_won', { winner: winnerAgentId, scoreA: verdict.scoreA, scoreB: verdict.scoreB });

  return {
    winner,
    winnerAgentId,
    winnerReason: verdict.winnerReason,
    scoreA:       verdict.scoreA,
    scoreB:       verdict.scoreB,
    feedback:     verdict.feedback,
    complianceA,
    complianceB,
    timestamp:    new Date().toISOString(),
  };
}

/**
 * releaseBountyReward
 * Triggers the USDC bounty reward transfer from Master wallet to winner wallet.
 * Unchanged from Phase 3.
 */
export async function releaseBountyReward(
  bountyId: string,
  winnerAgentId: string,
  winnerWalletId: string,
  masterWalletId: string,
  amount: number
): Promise<RewardResult> {
  console.log(`\n💰 Releasing ${amount} USDC bounty reward to Agent ${winnerAgentId.toUpperCase()}...`);
  emit('bounty_won', { bountyId, winner: winnerAgentId, amount });

  const result = await transferBountyReward(
    bountyId,
    winnerWalletId,
    masterWalletId,
    amount
  );

  console.log(`   ✅ Reward released — txHash: ${result.txHash}`);
  emit('reward_released', { bountyId, txHash: result.txHash, amount, winner: winnerAgentId });

  return {
    txHash:   result.txHash,
    amount,
    winner:   winnerAgentId,
    bountyId,
  };
}
