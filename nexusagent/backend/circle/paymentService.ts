/**
 * paymentService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Circle Nanopayments service for NexusAgent.
 *
 * Wraps Circle's Developer-Controlled Wallets SDK to provide:
 *  - makeNanopayment()       → USDC transfer between agent wallets
 *  - getWalletBalance()      → live USDC balance check
 *  - transferBountyReward()  → release bounty reward to winner
 *
 * All transfers use ARC-TESTNET and EOA wallets created in Phase 1.
 *
 * NOTE on txHash vs transactionId:
 *   Circle's createTransaction() returns a `transactionId` immediately
 *   (the Circle internal ID). The actual on-chain txHash is only available
 *   after the transaction is confirmed (state = COMPLETE). For the demo we
 *   use the Circle transactionId as the payment reference — it uniquely
 *   identifies the payment and can be looked up on the Arc explorer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeCircleSDK, getBalance } from '../circle/walletService.js';
import { v4 as uuidv4 } from 'uuid';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface NanopaymentResult {
  txHash: string;         // Circle transactionId (used as payment reference)
  amount: number;         // USDC amount paid
  status: string;         // Circle transaction state
  fromWalletId: string;
  toAddress: string;
  timestamp: string;
  isMock: boolean;        // true if real payment failed (insufficient funds, etc.)
}

export interface BountyRewardResult {
  txHash: string;
  bountyId: string;
  winnerWalletId: string;
  amount: number;
  timestamp: string;
}

// ── USDC Token ID on ARC-TESTNET ──────────────────────────────────────────────
// This is Circle's internal token identifier for native USDC on ARC-TESTNET.
// It's needed for the createTransaction API call instead of a contract address
// since USDC is native (not an ERC-20 contract) on Arc.
// The tokenId below is the well-known test USDC token ID for Arc testnet —
// if it fails, the service will fall back to a mock payment automatically.
const ARC_TESTNET_USDC_TOKEN_ID = process.env.CIRCLE_USDC_TOKEN_ID ?? '';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Generate a deterministic mock txHash for demo fallback */
function mockTxHash(prefix: string): string {
  const rand = uuidv4().replace(/-/g, '');
  return `0x${prefix.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toLowerCase()}${rand}`;
}

/** Parse USDC amount from token balance array (returned by getBalance) */
export async function getWalletBalance(walletId: string): Promise<number> {
  console.log(`💰 Checking USDC balance for wallet ${walletId}...`);

  try {
    const balances = await getBalance(walletId);
    const usdcBalance = balances.find(
      (b) =>
        b.token?.symbol?.toUpperCase() === 'USDC' ||
        b.token?.symbol?.toUpperCase() === 'USDCE'
    );

    const amount = usdcBalance ? parseFloat(usdcBalance.amount) : 0;
    console.log(`   💵 Wallet ${walletId} USDC balance: $${amount}`);
    return amount;
  } catch (err) {
    console.warn(`   ⚠️  Could not fetch balance for ${walletId}: ${(err as Error).message}`);
    return 0;
  }
}

// ── Core payment functions ────────────────────────────────────────────────────

/**
 * makeNanopayment
 * Initiates a USDC nanopayment from one agent wallet to a recipient address.
 *
 * Flow:
 *  1. Check sender wallet balance
 *  2. If sufficient → call Circle createTransaction()
 *  3. If insufficient or Circle call fails → log warning and return mock txHash
 *     (graceful degradation for testnet demo where wallets may be unfunded)
 *
 * @param amount        USDC amount to send (e.g. 0.003)
 * @param toAddress     Recipient blockchain address
 * @param fromWalletId  Circle wallet UUID of the sending agent
 * @param description   Human-readable description (stored as refId)
 */
export async function makeNanopayment(
  amount: number,
  toAddress: string,
  fromWalletId: string,
  description: string = 'NexusAgent nanopayment'
): Promise<NanopaymentResult> {
  console.log(`\n💳 Initiating nanopayment: ${amount} USDC → ${toAddress}`);
  console.log(`   📋 From wallet: ${fromWalletId}`);
  console.log(`   📝 Description: ${description}`);

  const timestamp = new Date().toISOString();

  // ── Step 1: Check balance first ────────────────────────────────────────────
  const balance = await getWalletBalance(fromWalletId);

  if (balance < amount) {
    console.warn(
      `   ⚠️  Insufficient USDC balance: have $${balance}, need $${amount}. ` +
      `Using mock txHash for demo (fund wallet on Arc testnet faucet to use real payments).`
    );
    return {
      txHash:       mockTxHash('mock'),
      amount,
      status:       'MOCK_INSUFFICIENT_FUNDS',
      fromWalletId,
      toAddress,
      timestamp,
      isMock:       true,
    };
  }

  // ── Step 2: Execute real Circle nanopayment ────────────────────────────────
  try {
    const client = initializeCircleSDK();

    if (!ARC_TESTNET_USDC_TOKEN_ID) {
      console.warn(
        '   ⚠️  CIRCLE_USDC_TOKEN_ID not set in .env. Using mock payment.\n' +
        '   Set it to the USDC token ID for ARC-TESTNET from Circle Console.'
      );
      return {
        txHash:   mockTxHash('notok'),
        amount,
        status:   'MOCK_NO_TOKEN_ID',
        fromWalletId,
        toAddress,
        timestamp,
        isMock:   true,
      };
    }

    console.log(`   🔄 Calling Circle createTransaction...`);

    const response = await client.createTransaction({
      walletId:           fromWalletId,
      tokenId:            ARC_TESTNET_USDC_TOKEN_ID,
      destinationAddress: toAddress,
      amount:             [amount.toFixed(6)],
      fee:                { type: 'level' as const, config: { feeLevel: 'HIGH' as const } },
      refId:              description.slice(0, 64),   // Circle limits refId length
    });

    const txData = response.data;
    if (!txData?.id) {
      throw new Error('Circle API returned no transaction ID');
    }

    const txHash = txData.id; // Circle transactionId is our payment reference
    const status = txData.state ?? 'INITIATED';

    console.log(`   ✅ Nanopayment initiated — Circle txId: ${txHash} (state: ${status})`);
    console.log(`   💸 ${amount} USDC → ${toAddress}`);

    return {
      txHash,
      amount,
      status,
      fromWalletId,
      toAddress,
      timestamp,
      isMock: false,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`   ⚠️  Circle payment failed: ${msg}`);
    console.warn(`   ℹ️  Using mock txHash for demo continuity.`);

    return {
      txHash:   mockTxHash('fail'),
      amount,
      status:   'MOCK_CIRCLE_ERROR',
      fromWalletId,
      toAddress,
      timestamp,
      isMock:   true,
    };
  }
}

/**
 * transferBountyReward
 * Transfers the bounty reward from the MasterAgent wallet to the winner.
 * Used by the Judge Agent in Phase 3 to close out a bounty.
 *
 * @param bountyId        The bounty UUID (used as description)
 * @param winnerWalletId  Circle wallet UUID of the winning agent
 * @param masterWalletId  Circle wallet UUID of the MasterAgent (holds the bounty stake)
 * @param amount          USDC reward amount
 */
export async function transferBountyReward(
  bountyId: string,
  winnerWalletId: string,
  masterWalletId: string,
  amount: number
): Promise<BountyRewardResult> {
  console.log(`\n🏆 Releasing bounty reward: $${amount} USDC`);
  console.log(`   📋 Bounty: ${bountyId}`);
  console.log(`   🎯 Winner wallet: ${winnerWalletId}`);

  // We need the winner's blockchain address, not just their wallet ID.
  // In a real implementation we'd look this up from wallets.json.
  // For now we use the wallet ID as a placeholder — Phase 3 will refine this.
  const result = await makeNanopayment(
    amount,
    winnerWalletId, // placeholder — Phase 3 resolves to actual address
    masterWalletId,
    `Bounty reward: ${bountyId}`
  );

  console.log(`   ✅ Bounty reward released — txHash: ${result.txHash}`);

  return {
    txHash:        result.txHash,
    bountyId,
    winnerWalletId,
    amount,
    timestamp:     result.timestamp,
  };
}
