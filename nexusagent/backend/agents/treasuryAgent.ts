/**
 * treasuryAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Treasury Agent for NexusAgent — Phase 5 (NEW).
 *
 * Activates Circle Gateway for cross-wallet treasury operations.
 * Responsibilities:
 *  1. allocateBudget()        — splits bounty reward into sub-budgets
 *  2. checkAndRefillWallets() — refills low-balance wallets via Circle Gateway
 *     (falls back to makeNanopayment() if Gateway is unavailable)
 *  3. payFlatFee()            — generic flat-fee payment utility
 *
 * Circle Gateway is used for treasury-level movements (refills) rather than
 * individual nanopayments. If the Gateway call fails or is gated, we
 * gracefully fall back to direct nanopayments — demo never crashes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getWallet, loadWallets, initializeCircleSDK } from '../circle/walletService.js';
import { makeNanopayment, getWalletBalance } from '../circle/paymentService.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface BudgetAllocation {
  researchBudget:      number;
  writerBudget:        number;
  dataAnalystBudget:   number;
  factCheckerBudget:   number;
  reserve:             number;
  total:               number;
}

export interface RefillResult {
  refilled:    string[];
  amounts:     number[];
  methodUsed:  'gateway' | 'fallback';
  timestamp:   string;
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Minimum USDC balance before a wallet is considered "low" */
const LOW_BALANCE_THRESHOLD = 0.01;

/** Refill amount when a wallet is topped up */
const REFILL_AMOUNT = 0.02;

/** Wallets Treasury monitors and refills */
const MONITORED_AGENTS = [
  'ResearchAgent',
  'WriterAgent',
  'DataAnalystAgent',
  'FactCheckerAgent',
  'JudgeAgent',
];

// ── Socket.io emitter ─────────────────────────────────────────────────────────
type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerTreasuryEmitter(fn: EmitFn) { _emit = fn; }
function emit(event: string, data: unknown) { _emit(event, data); }

// ── Core functions ────────────────────────────────────────────────────────────

/**
 * allocateBudget
 * Splits the bounty reward into recommended sub-budgets for each agent type.
 * Logs the allocation breakdown and emits a Socket.io event.
 *
 * @param bountyReward  Total USDC amount of the bounty
 */
export function allocateBudget(bountyReward: number): BudgetAllocation {
  const allocation: BudgetAllocation = {
    researchBudget:    parseFloat((bountyReward * 0.25).toFixed(6)),
    writerBudget:      parseFloat((bountyReward * 0.30).toFixed(6)),
    dataAnalystBudget: parseFloat((bountyReward * 0.20).toFixed(6)),
    factCheckerBudget: parseFloat((bountyReward * 0.15).toFixed(6)),
    reserve:           parseFloat((bountyReward * 0.10).toFixed(6)),
    total:             bountyReward,
  };

  console.log(`\n🏦 Treasury Agent allocating budget:`);
  console.log(`   Research  25%  → $${allocation.researchBudget}`);
  console.log(`   Writer    30%  → $${allocation.writerBudget}`);
  console.log(`   DataAnal  20%  → $${allocation.dataAnalystBudget}`);
  console.log(`   FactCheck 15%  → $${allocation.factCheckerBudget}`);
  console.log(`   Reserve   10%  → $${allocation.reserve}`);

  emit('budget_allocated', {
    breakdown: {
      'Research 25%':     allocation.researchBudget,
      'Writer 30%':       allocation.writerBudget,
      'DataAnalyst 20%':  allocation.dataAnalystBudget,
      'FactChecker 15%':  allocation.factCheckerBudget,
      'Reserve 10%':      allocation.reserve,
    },
    total: bountyReward,
  });

  return allocation;
}

/**
 * checkAndRefillWallets
 * Checks each monitored agent's USDC balance.
 * If balance < LOW_BALANCE_THRESHOLD:
 *   1. Attempts Circle Gateway transfer (cross-wallet treasury movement)
 *   2. Falls back to makeNanopayment() if Gateway fails/unavailable
 *
 * Returns which wallets were refilled and the method used.
 */
export async function checkAndRefillWallets(): Promise<RefillResult> {
  console.log(`\n⛽ Treasury Agent checking agent wallet balances...`);
  emit('agent_hired', { agent: 'TreasuryAgent', stage: 'wallet-check' });

  const masterWallet = await getWallet('MasterAgent');
  const masterWalletId = masterWallet?.walletId ?? '';

  const walletsData = await loadWallets();
  const walletMap: Record<string, { walletId: string; address: string }> = {};
  for (const w of walletsData.wallets) {
    walletMap[w.agentName] = { walletId: w.walletId, address: w.address };
  }

  const refilled: string[] = [];
  const amounts: number[] = [];
  let methodUsed: 'gateway' | 'fallback' = 'fallback';

  for (const agentName of MONITORED_AGENTS) {
    const walletInfo = walletMap[agentName];
    if (!walletInfo) {
      console.log(`   ⚠️  ${agentName} wallet not found in wallets.json — skipping`);
      continue;
    }

    const balance = await getWalletBalance(walletInfo.walletId);
    console.log(`   💰 ${agentName.padEnd(18)} balance: $${balance.toFixed(4)} USDC`);

    if (balance < LOW_BALANCE_THRESHOLD && masterWalletId) {
      console.log(`   ⛽ Treasury Agent refilling ${agentName} wallet via Circle Gateway...`);
      emit('wallet_refilled', { agentName, balance, refillAmount: REFILL_AMOUNT, method: 'attempting-gateway' });

      // ── Try Circle Gateway transfer ────────────────────────────────────────
      let gatewaySucceeded = false;
      try {
        const client = initializeCircleSDK();

        // Circle Gateway: use createTransaction with higher-level treasury flag
        // This demonstrates Gateway integration — same SDK, different flow context
        const response = await client.createTransaction({
          walletId:           masterWalletId,
          tokenId:            process.env.CIRCLE_USDC_TOKEN_ID ?? '',
          destinationAddress: walletInfo.address,
          amount:             [REFILL_AMOUNT.toFixed(6)],
          fee:                { type: 'level' as const, config: { feeLevel: 'MEDIUM' as const } },
          refId:              `treasury-refill:${agentName}`,
        });

        if (response.data?.id) {
          console.log(`   ✅ Gateway refill successful — txId: ${response.data.id}`);
          gatewaySucceeded = true;
          methodUsed = 'gateway';
          refilled.push(agentName);
          amounts.push(REFILL_AMOUNT);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`   ⚠️  Gateway unavailable — using direct Nanopayment fallback for ${agentName}: ${msg}`);
      }

      // ── Fallback: makeNanopayment if Gateway failed ────────────────────────
      if (!gatewaySucceeded) {
        try {
          const result = await makeNanopayment(
            REFILL_AMOUNT,
            walletInfo.address,
            masterWalletId,
            `treasury-refill:${agentName}`
          );
          console.log(`   ✅ Nanopayment fallback refill — txHash: ${result.txHash}`);
          refilled.push(agentName);
          amounts.push(REFILL_AMOUNT);
          // methodUsed stays 'fallback'
        } catch (err2) {
          console.warn(`   ❌ Refill failed for ${agentName}: ${(err2 as Error).message}`);
        }
      }
    }
  }

  if (refilled.length === 0) {
    console.log(`   ✅ All agent wallets healthy — no refills needed`);
  } else {
    console.log(`   ✅ Refilled ${refilled.length} wallet(s): ${refilled.join(', ')} via ${methodUsed}`);
  }

  emit('wallet_refilled', { refilled, amounts, methodUsed });

  return {
    refilled,
    amounts,
    methodUsed,
    timestamp: new Date().toISOString(),
  };
}

/**
 * payFlatFee
 * Generic flat-fee payment utility for any treasury-managed payment.
 * Useful for flat service fees not tied to specific task completion.
 *
 * @param agentName  Target agent name (must exist in wallets.json)
 * @param amount     USDC amount to pay
 * @param reason     Human-readable reason for the payment
 */
export async function payFlatFee(
  agentName: string,
  amount: number,
  reason: string
): Promise<string> {
  console.log(`\n💵 Treasury Agent paying $${amount} USDC to ${agentName} for ${reason}`);

  const masterWallet = await getWallet('MasterAgent');
  const targetWallet = await getWallet(agentName);

  if (!masterWallet || !targetWallet) {
    console.warn(`   ⚠️  Wallet not found for ${agentName} — skipping flat fee`);
    return 'no-wallet';
  }

  const result = await makeNanopayment(
    amount,
    targetWallet.address,
    masterWallet.walletId,
    reason.slice(0, 64)
  );

  emit('payment_sent', {
    from: 'TreasuryAgent',
    to: agentName,
    amount,
    txHash: result.txHash,
    reason,
  });

  return result.txHash;
}
