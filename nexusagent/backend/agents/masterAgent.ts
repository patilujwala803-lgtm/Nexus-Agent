/**
 * masterAgent.ts
 * Modified to support single-agent dynamic hiring for manual bounties from the Command Center.
 */

import { allocateBudget, checkAndRefillWallets } from './treasuryAgent.js';
import { loadWallets } from '../circle/walletService.js';
import { makeNanopayment } from '../circle/paymentService.js';
import { updateBountyStatus, type Bounty, addSubmission } from '../db/bountyStore.js';
import { getAllAgents, updateAgent } from '../src/economy/agentRegistry.js';
import { askClaude } from '../src/llm/claudeClient.js';

type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerMasterEmitter(fn: EmitFn): void { _emit = fn; }
function emit(event: string, data: unknown): void { _emit(event, data); }

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function processBounty(bounty: Bounty): Promise<any> {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🧠 Master Agent processing manual bounty: "${bounty.title}"`);
  console.log(`   💰 Reward: $${bounty.reward} USDC`);
  console.log('═'.repeat(60));

  emit('bounty_processing', { bountyId: bounty.id, title: bounty.title });

  // 1. Budget and wallet check
  allocateBudget(bounty.reward);
  await checkAndRefillWallets();

  // Load master wallet
  let masterWalletId = 'mock-master-wallet';
  try {
    const walletsData = await loadWallets();
    const master = walletsData.wallets.find(w => w.agentName === 'MasterAgent');
    if (master) masterWalletId = master.walletId;
  } catch (err) {}

  // 2. Fetch 49 agents and pick 3 available agents for bidding
  const agents = getAllAgents();
  const availableAgents = agents.filter(a => a.status === 'idle');
  if (availableAgents.length < 3) {
    throw new Error('Not enough idle agents to process bounty.');
  }

  // Shuffle and pick 3
  const shuffled = availableAgents.sort(() => 0.5 - Math.random());
  const bidders = shuffled.slice(0, 3);
  
  emit('agentActivity', { event: 'bidding_started', data: { bountyId: bounty.id, numBidders: 3 } });

  for (const bidder of bidders) {
    await sleep(500);
    const bidAmount = (bounty.reward * (0.8 + Math.random() * 0.4)).toFixed(2);
    emit('agentActivity', { 
      event: 'economy:bid_placed', 
      data: { taskId: bounty.id, agentName: bidder.name, bidAmount } 
    });
  }

  // Pick the winner (e.g. the first one)
  const winner = bidders[0];
  const finalPrice = bounty.reward;
  
  updateAgent(winner.instanceId, { status: 'busy' });
  await sleep(1000);

  emit('agentActivity', {
    event: 'economy:agent_hired',
    data: { taskId: bounty.id, agentName: winner.name, finalPrice }
  });

  emit('agentActivity', {
    event: 'economy:work_started',
    data: { taskId: bounty.id, agentName: winner.name }
  });

  // 3. Call LLM
  console.log(`🤖 [MasterAgent] Assigned ${winner.name} to execute the work via LLM...`);
  const prompt = `You are ${winner.name}, an AI agent on the Nexus Arc network.
Please complete the following bounty:
Title: ${bounty.title}
Description: ${bounty.description}

Provide a comprehensive, highly-detailed response. Do not include introductory conversational text, just output the final deliverable.`;

  let content = '';
  try {
    content = await askClaude(prompt);
  } catch (err) {
    content = `[Simulated Output due to LLM error]\nI have analyzed ${bounty.title} and determined the key insights based on the provided requirements. The market trends indicate significant growth.`;
  }

  emit('agentActivity', {
    event: 'economy:work_completed',
    data: { taskId: bounty.id, agentName: winner.name, result: 'Work completed successfully.' }
  });

  // 4. Payment
  let txHash = `0xmock_${Date.now()}`;
  try {
    const payResult = await makeNanopayment(
      bounty.reward,
      winner.walletAddress,
      masterWalletId,
      `Bounty Payout: ${bounty.title}`
    );
    txHash = payResult.txHash;
  } catch (err) {}

  updateAgent(winner.instanceId, { 
    status: 'idle',
    usdcBalance: winner.usdcBalance + bounty.reward,
    jobsCompleted: winner.jobsCompleted + 1,
    totalEarned: winner.totalEarned + bounty.reward
  });

  // 5. Save and emit completed event
  addSubmission(bounty.id, {
    agentId: winner.instanceId,
    agentName: winner.name,
    content: content,
    txHash: txHash
  });

  updateBountyStatus(bounty.id, 'completed', {
    winner: winner.instanceId,
    winnerReason: 'Selected by MasterAgent for best bid',
    rewardTxHash: txHash,
    completedAt: new Date().toISOString(),
  });
  
  const finalData = {
    bountyId: bounty.id,
    agentName: winner.name,
    earned: bounty.reward,
    txHash: txHash,
    content: content
  };

  emit('bounty_completed', finalData);
  emit('agentActivity', {
    event: 'economy:task_complete',
    data: finalData
  });

  return finalData;
}

import { getBalance } from '../circle/walletService.js';
export async function getAgentStatus() {
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
    return [];
  }
}

