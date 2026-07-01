/**
 * test-phase3.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Phase 3 Integration Test — Full Competitive Bounty Flow
 *
 * Tests the complete NexusAgent pipeline:
 *   Create bounty → 2 agent pipelines compete → Judge picks winner → USDC paid
 *
 * Run:
 *   npm run test:phase3
 *   (or: npx tsx --env-file=.env test-phase3.ts)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createBounty } from './db/bountyStore.js';
import { processBounty } from './agents/masterAgent.js';

const SEP = '═'.repeat(60);

async function runPhase3Test() {
  console.log('\n🧪 Testing Phase 3 — Full Bounty Competition Flow');
  console.log(SEP);
  console.log('   Agents: MasterAgent, ResearchAgent, WriterAgent,');
  console.log('           FormatterAgent, JudgeAgent');
  console.log('   AI:     Google Gemini 2.0 Flash');
  console.log('   Chain:  ARC-TESTNET (Circle)');
  console.log(SEP);

  const startTime = Date.now();

  // ── Create test bounty ──────────────────────────────────────────────────────
  console.log('\n📋 Creating test bounty...');
  const bounty = createBounty({
    title:       'Summarize the latest AI agent trends',
    description: 'Research current AI agent trends and provide a comprehensive summary with key insights for developers building autonomous systems in 2025. Focus on multi-agent frameworks, payment integration, and practical use cases.',
    reward:      0.05,
    postedBy:    'hackathon-judge',
  });

  console.log(`   ✅ Bounty created: [${bounty.id}]`);
  console.log(`   📋 Title: "${bounty.title}"`);
  console.log(`   💰 Reward: $${bounty.reward} USDC\n`);

  // ── Process bounty through full agent pipeline ──────────────────────────────
  let result;
  try {
    result = await processBounty(bounty);
  } catch (err) {
    console.error('\n💥 Fatal error during bounty processing:', (err as Error).message);
    console.error((err as Error).stack);
    process.exit(1);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  // ── Print final summary ─────────────────────────────────────────────────────
  console.log('\n' + SEP);
  console.log('🎉 Phase 3 Complete!');
  console.log(SEP);
  console.log(`📋 Bounty: "${result.bountyTitle}"`);
  console.log(`⏱️  Completed in: ${elapsed}s`);
  console.log('');
  console.log('📊 Pipeline Results:');
  console.log(`   🤖 Agent Alpha score: ${result.verdict.scoreA}/10`);
  console.log(`   🤖 Agent Beta score:  ${result.verdict.scoreB}/10`);
  console.log('');
  console.log(`🏆 Winner: Agent ${result.verdict.winner.toUpperCase()}`);
  console.log(`   💬 Reason: ${result.verdict.winnerReason}`);
  console.log(`   📝 Feedback: ${result.verdict.feedback}`);
  console.log('');
  console.log(`💰 Reward paid: $${result.reward.amount} USDC`);
  console.log(`🔗 Reward txHash: ${result.reward.txHash}`);
  console.log('');
  console.log(`📊 Total payments made: ${result.totalPayments}`);
  console.log(`💸 Total USDC moved: $${result.totalUsdcMoved.toFixed(6)}`);
  console.log('');
  console.log('📦 Pipeline A payments:');
  result.pipelineA.payments.forEach((p, i) => {
    const mockFlag = p.isMock ? ' [MOCK]' : ' [REAL]';
    console.log(`   ${i + 1}. ${p.description}: $${p.amount} USDC${mockFlag}`);
    console.log(`      txHash: ${p.txHash}`);
  });
  console.log('📦 Pipeline B payments:');
  result.pipelineB.payments.forEach((p, i) => {
    const mockFlag = p.isMock ? ' [MOCK]' : ' [REAL]';
    console.log(`   ${i + 1}. ${p.description}: $${p.amount} USDC${mockFlag}`);
    console.log(`      txHash: ${p.txHash}`);
  });
  console.log('');
  console.log('📝 Winning Submission Preview:');
  const winner = result.verdict.winner === 'alpha' ? result.pipelineA : result.pipelineB;
  console.log(`   Title: "${winner.formatted.title}"`);
  const preview = winner.formatted.formattedContent.slice(0, 200).replace(/\n/g, ' ');
  console.log(`   Content: ${preview}...`);
  console.log('');
  console.log(SEP);
  console.log('✅ All Phase 3 systems operational!');
  console.log('   → 2 parallel agent pipelines ran successfully');
  console.log('   → Judge Agent evaluated and picked a winner');
  console.log('   → USDC reward transfer initiated');
  console.log('   → Socket.io events emitted throughout');
  console.log('');
  console.log('📌 Next: POST http://localhost:4000/bounty/demo');
  console.log('         for a live API demo with real-time Socket.io events');
  console.log(SEP);
}

runPhase3Test().catch((err) => {
  console.error('\n💥 Test failed:', err);
  process.exit(1);
});
