/**
 * masterAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Master Agent Orchestrator for NexusAgent — Phase 5 Final.
 *
 * 8-Agent competitive bounty flow:
 *   1. TreasuryAgent.allocateBudget()
 *   2. TreasuryAgent.checkAndRefillWallets()
 *   3. Two pipelines run (Alpha + Beta) in parallel:
 *      a. ResearchAgent.researchTopic()
 *      b. WriterAgent.writeDraft() (now includes polish step)
 *      c. DataAnalystAgent.fetchStatsArticle() + FactCheckerAgent.verifyClaim() [parallel]
 *      d. Append stats + fact-check note to submission
 *   4. JudgeAgent.evaluateSubmissions() (includes inline compliance screening)
 *   5. JudgeAgent.releaseBountyReward()
 *   6. ReputationAgent.recordResult() for both pipelines
 *   7. ReputationAgent.getLeaderboard() — update standings
 *   8. bountyStore update
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { researchTopic, type ResearchResult } from './researchAgent.js';
import { writeDraft, type DraftResult } from './writerAgent.js';
import { evaluateSubmissions, releaseBountyReward, type Submission } from './judgeAgent.js';
import { fetchStatsArticle, type StatsResult } from './dataAnalystAgent.js';
import { verifyClaim, type FactCheckResult } from './factCheckerAgent.js';
import { allocateBudget, checkAndRefillWallets } from './treasuryAgent.js';
import { recordResult, getLeaderboard, emitLeaderboard } from './reputationAgent.js';
import { loadWallets, getBalance } from '../circle/walletService.js';
import { makeNanopayment } from '../circle/paymentService.js';
import { updateBountyStatus, type Bounty } from '../db/bountyStore.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PaymentRecord {
  description: string;
  amount:      number;
  txHash:      string;
  isMock:      boolean;
}

export interface PipelineResult {
  agentId:     string;
  research:    ResearchResult;
  draft:       DraftResult;
  stats:       StatsResult;
  factCheck:   FactCheckResult;
  payments:    PaymentRecord[];
  totalSpent:  number;
  content:     string;  // final enriched content for submission
}

export interface BountyProcessingResult {
  bountyId:    string;
  bountyTitle: string;
  pipelineA:   PipelineResult;
  pipelineB:   PipelineResult;
  verdict: {
    winner:       string;
    winnerReason: string;
    scoreA:       number;
    scoreB:       number;
    feedback:     string;
  };
  reward: {
    txHash: string;
    amount: number;
    winner: string;
  };
  leaderboard:      Array<{ pipelineId: string; wins: number; losses: number; winRate: number; avgScore: number }>;
  totalPayments:    number;
  totalUsdcMoved:   number;
  completedAt:      string;
}

// ── Agent payment fees ────────────────────────────────────────────────────────
/** WriterAgent fee covers both draft AND polish (merged formatter) */
const WRITER_FEE_USDC = 0.010;

// ── Socket.io emitter ─────────────────────────────────────────────────────────
type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerMasterEmitter(fn: EmitFn): void { _emit = fn; }
function emit(event: string, data: unknown): void { _emit(event, data); }

// ── Single pipeline runner ────────────────────────────────────────────────────

/**
 * runPipeline
 * Runs one full 5-agent pipeline: Research → Write → [DataAnalyst + FactCheck in parallel]
 * Collects all payments and assembles the final enriched submission content.
 */
async function runPipeline(
  agentId: string,
  topic: string,
  bountyTitle: string,
  bountyDescription: string,
  researchBudget: number,
  masterWalletId: string,
  writerAddress: string
): Promise<PipelineResult> {
  console.log(`\n${'─'.repeat(50)}`);
  console.log(`🤖 Pipeline ${agentId.toUpperCase()} starting...`);
  console.log(`${'─'.repeat(50)}`);

  const payments: PaymentRecord[] = [];

  // ── a. Research Agent ──────────────────────────────────────────────────────
  emit('agent_hired', { agent: 'ResearchAgent', pipeline: agentId });
  const research = await researchTopic(topic, researchBudget);

  research.txHashes.forEach((txHash, i) => {
    payments.push({
      description: `Research: article ${i + 1} access`,
      amount:      research.sources[i]?.amountPaid ?? 0,
      txHash,
      isMock:      txHash.startsWith('0xmock') || txHash.startsWith('0xfail') || txHash.startsWith('0xnotok'),
    });
  });

  // ── b. Writer Agent (draft + polish) ──────────────────────────────────────
  emit('agent_hired', { agent: 'WriterAgent', pipeline: agentId });
  const draft = await writeDraft(research, bountyTitle, bountyDescription, agentId);

  // Pay Writer Agent (covers draft + polish — formatter merged in)
  console.log(`💸 [${agentId.toUpperCase()}] Paying WriterAgent $${WRITER_FEE_USDC} USDC (draft + formatting)...`);
  const writerPayment = await makeNanopayment(
    WRITER_FEE_USDC,
    writerAddress,
    masterWalletId,
    `Writer+Format fee: ${bountyTitle.slice(0, 40)} [${agentId}]`
  );
  payments.push({
    description: `WriterAgent fee (draft+polish) [${agentId}]`,
    amount:      writerPayment.amount,
    txHash:      writerPayment.txHash,
    isMock:      writerPayment.isMock,
  });
  emit('payment_sent', { agentId, to: 'WriterAgent', amount: WRITER_FEE_USDC, txHash: writerPayment.txHash });

  // ── c. DataAnalyst + FactChecker in parallel ───────────────────────────────
  emit('agent_hired', { agent: 'DataAnalystAgent', pipeline: agentId });
  emit('agent_hired', { agent: 'FactCheckerAgent', pipeline: agentId });

  const alreadyUsed = research.sources.map((s) => s.articleId);

  const [stats, factCheck] = await Promise.all([
    fetchStatsArticle(topic),
    verifyClaim(draft.formattedContent, topic, alreadyUsed),
  ]);

  // Track DataAnalyst payment
  if (stats.txHash) {
    payments.push({
      description: `DataAnalyst: analytics stats [${agentId}]`,
      amount:      stats.price,
      txHash:      stats.txHash,
      isMock:      stats.txHash.startsWith('0xmock') || stats.txHash.startsWith('0xfail'),
    });
  }

  // Track FactChecker payment
  if (factCheck.txHash) {
    payments.push({
      description: `FactChecker: claim verification [${agentId}]`,
      amount:      0.003, // article price paid
      txHash:      factCheck.txHash,
      isMock:      factCheck.txHash.startsWith('0xmock') || factCheck.txHash.startsWith('0xfail'),
    });
  }

  // ── d. Assemble final enriched submission content ──────────────────────────
  const factNote = factCheck.verified
    ? `✅ Fact-checked: ${factCheck.note} (confidence: ${factCheck.confidence}%)`
    : `⚠️ Claim disputed: ${factCheck.note} (confidence: ${factCheck.confidence}%)`;

  const content = `${draft.formattedContent}

---
📊 Market Data Insights (Data Analyst):
${stats.stats}

🔎 Fact-Check: ${factNote}`;

  const totalSpent = payments.reduce((sum, p) => sum + p.amount, 0);
  console.log(`✅ Pipeline ${agentId.toUpperCase()} complete — spent $${totalSpent.toFixed(6)} USDC`);
  emit('pipeline_complete', { agentId, totalSpent, payments: payments.length });

  return { agentId, research, draft, stats, factCheck, payments, totalSpent, content };
}

// ── Master orchestrator ───────────────────────────────────────────────────────

/**
 * processBounty
 * Full 8-agent competitive flow end-to-end.
 */
export async function processBounty(bounty: Bounty): Promise<BountyProcessingResult> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧠 Master Agent processing bounty: "${bounty.title}"`);
  console.log(`   💰 Reward: $${bounty.reward} USDC`);
  console.log(`   📋 Bounty ID: ${bounty.id}`);
  console.log('═'.repeat(60));

  emit('bounty_processing', { bountyId: bounty.id, title: bounty.title });

  // ── Step 1: Budget allocation ──────────────────────────────────────────────
  const budget = allocateBudget(bounty.reward);
  emit('budget_allocated', { ...budget, bountyId: bounty.id });

  // ── Step 2: Wallet health check + refill ──────────────────────────────────
  const refillResult = await checkAndRefillWallets();
  if (refillResult.refilled.length > 0) {
    emit('wallet_refilled', {
      refilled: refillResult.refilled,
      method: refillResult.methodUsed,
    });
  }

  // ── Load agent wallets ──────────────────────────────────────────────────────
  let masterWalletId = '';
  let writerAddress  = '';
  let writerWalletId = '';
  let judgeWalletId  = '';

  try {
    const walletsData = await loadWallets();
    const walletMap: Record<string, { walletId: string; address: string }> = {};
    for (const w of walletsData.wallets) {
      walletMap[w.agentName] = { walletId: w.walletId, address: w.address };
    }

    masterWalletId = walletMap['MasterAgent']?.walletId   ?? '';
    writerAddress  = walletMap['WriterAgent']?.address     ?? '';
    writerWalletId = walletMap['WriterAgent']?.walletId    ?? '';
    judgeWalletId  = walletMap['JudgeAgent']?.walletId     ?? '';

    if (!masterWalletId) {
      console.warn('⚠️  MasterAgent wallet not found — payments will use mock mode');
    }
  } catch {
    console.warn('⚠️  wallets.json not found — running in mock payment mode');
    masterWalletId = 'mock-master-wallet';
    writerAddress  = '0xMOCK_WRITER_ADDRESS';
  }

  const researchBudget = Math.min(budget.researchBudget, 0.01);

  // ── Step 3: Run both pipelines in parallel ─────────────────────────────────
  console.log('\n🚀 Launching both agent pipelines in parallel...');

  const [pipelineA, pipelineB] = await Promise.all([
    runPipeline(
      'alpha',
      bounty.description,  // Alpha researches the full description
      bounty.title,
      bounty.description,
      researchBudget,
      masterWalletId,
      writerAddress
    ),
    runPipeline(
      'beta',
      bounty.title,         // Beta uses title as research angle (different perspective)
      bounty.title,
      bounty.description,
      researchBudget,
      masterWalletId,
      writerAddress
    ),
  ]);

  console.log('\n✅ Both pipelines complete — sending to Judge Agent...');

  // ── Step 4: Prepare submissions ────────────────────────────────────────────
  emit('submissions_ready', {
    bountyId:   bounty.id,
    alphaTitle: pipelineA.draft.title,
    betaTitle:  pipelineB.draft.title,
  });

  const submissions: Submission[] = [
    {
      agentId:  'alpha',
      walletId: writerWalletId || 'mock-wallet',
      content:  pipelineA.content,
      title:    pipelineA.draft.title,
    },
    {
      agentId:  'beta',
      walletId: writerWalletId || 'mock-wallet',
      content:  pipelineB.content,
      title:    pipelineB.draft.title,
    },
  ];

  // ── Step 5: Judge evaluates (includes compliance screening) ───────────────
  emit('judging_started', { bountyId: bounty.id });
  const verdict = await evaluateSubmissions(
    bounty.title,
    bounty.description,
    submissions
  );

  const winnerPipeline   = verdict.winner === 'A' ? pipelineA : pipelineB;
  const winnerSubmission = submissions.find((s) => s.agentId === winnerPipeline.agentId)!;

  // ── Step 6: Release reward ─────────────────────────────────────────────────
  const reward = await releaseBountyReward(
    bounty.id,
    verdict.winnerAgentId,
    winnerSubmission.walletId,
    masterWalletId,
    bounty.reward
  );

  // ── Step 7: Reputation tracking ───────────────────────────────────────────
  const alphaWon = verdict.winnerAgentId === 'alpha';

  recordResult('alpha', alphaWon, verdict.scoreA, alphaWon ? bounty.reward : 0);
  recordResult('beta',  !alphaWon, verdict.scoreB, !alphaWon ? bounty.reward : 0);

  // Use emitLeaderboard() here — this is the ONLY place that should broadcast the leaderboard.
  // (getLeaderboard() on its own does NOT emit, to avoid the HTTP-route feedback loop.)
  const leaderboard = emitLeaderboard();

  emit('reputation_updated', {
    winner:      verdict.winnerAgentId,
    scoreA:      verdict.scoreA,
    scoreB:      verdict.scoreB,
    leaderboard: leaderboard.slice(0, 3),
  });

  // ── Step 8: Update bounty store ────────────────────────────────────────────
  try {
    updateBountyStatus(bounty.id, 'completed', {
      winner:       verdict.winnerAgentId,
      scoreA:       verdict.scoreA,
      scoreB:       verdict.scoreB,
      winnerReason: verdict.winnerReason,
      rewardTxHash: reward.txHash,
      completedAt:  new Date().toISOString(),
    });
    console.log(`\n✅ Bounty ${bounty.id} marked as COMPLETED`);
  } catch {
    console.warn('   ⚠️  Could not update bounty store (non-fatal)');
  }

  // ── Totals ────────────────────────────────────────────────────────────────
  const allPayments    = [...pipelineA.payments, ...pipelineB.payments];
  const totalUsdcMoved = pipelineA.totalSpent + pipelineB.totalSpent + bounty.reward;

  console.log('\n' + '═'.repeat(60));
  console.log('🎉 Master Agent completed bounty processing!');
  console.log(`   🏆 Winner: Agent ${verdict.winnerAgentId.toUpperCase()}`);
  console.log(`   📊 Score A: ${verdict.scoreA}/10 | Score B: ${verdict.scoreB}/10`);
  console.log(`   💰 Reward: $${bounty.reward} USDC → ${verdict.winnerAgentId}`);
  console.log(`   📊 Total payments: ${allPayments.length + 1}`);
  console.log(`   💸 Total USDC moved: $${totalUsdcMoved.toFixed(6)}`);
  console.log('═'.repeat(60));

  emit('bounty_completed', {
    bountyId:      bounty.id,
    winner:        verdict.winnerAgentId,
    reward:        bounty.reward,
    totalUsdcMoved,
    totalPayments: allPayments.length + 1,
    rewardTxHash:  reward.txHash,
  });

  return {
    bountyId:    bounty.id,
    bountyTitle: bounty.title,
    pipelineA,
    pipelineB,
    verdict: {
      winner:       verdict.winnerAgentId,
      winnerReason: verdict.winnerReason,
      scoreA:       verdict.scoreA,
      scoreB:       verdict.scoreB,
      feedback:     verdict.feedback,
    },
    reward: {
      txHash: reward.txHash,
      amount: bounty.reward,
      winner: verdict.winnerAgentId,
    },
    leaderboard: leaderboard.map((e) => ({
      pipelineId: e.pipelineId,
      wins:       e.wins,
      losses:     e.losses,
      winRate:    e.winRate,
      avgScore:   e.avgScore,
    })),
    totalPayments:  allPayments.length + 1,
    totalUsdcMoved,
    completedAt:    new Date().toISOString(),
  };
}

/**
 * getAgentStatus
 * Returns live USDC balances for all 7 wallet-holding agents.
 */
export async function getAgentStatus() {
  console.log('\n📊 Agent Status Report (7 wallets)');
  console.log('─'.repeat(50));

  try {
    const walletsData = await loadWallets();
    const statuses = await Promise.all(
      walletsData.wallets.map(async (wallet) => {
        const balances = await getBalance(wallet.walletId);
        const usdcBalance = balances.find(
          (b) =>
            b.token?.symbol?.toUpperCase() === 'USDC' ||
            b.token?.symbol?.toUpperCase() === 'USDCE'
        );
        const balance = usdcBalance ? parseFloat(usdcBalance.amount) : 0;
        console.log(
          `   🤖 ${wallet.agentName.padEnd(18)} | $${balance.toFixed(6)} USDC | ${wallet.address.slice(0, 12)}...`
        );
        return {
          agentName:  wallet.agentName,
          walletId:   wallet.walletId,
          address:    wallet.address,
          balance,
          blockchain: wallet.blockchain,
        };
      })
    );
    return statuses;
  } catch {
    console.log('   ⚠️  wallets.json not found — run wallet creation first');
    return [];
  }
}
