/**
 * balanceSync.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Syncs actual Circle on-chain USDC balances into the agent registry.
 * Called once at server startup and every 60 seconds.
 * updateAgent() now automatically fires Firebase sync on every call.
 */

import { createRequire } from 'module';
import dotenv from 'dotenv';
dotenv.config();

import { agentRegistry, updateAgent } from './agentRegistry.js';

const _require = createRequire(import.meta.url);
const {
  initiateDeveloperControlledWalletsClient,
} = _require('@circle-fin/developer-controlled-wallets') as {
  initiateDeveloperControlledWalletsClient: (config: { apiKey: string; entitySecret: string }) => any;
};

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

let client: any = null;
function getClient() {
  if (client) return client;
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;
  if (!apiKey || !entitySecret) throw new Error('Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET');
  client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });
  return client;
}

async function fetchBalanceWithRetry(walletId: string, retries = 3): Promise<number> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const c = getClient();
      const res = await c.getWalletTokenBalance({ id: walletId });
      const balances: any[] = res.data?.tokenBalances ?? [];
      const usdc = balances.find((b: any) =>
        b.token?.symbol === 'USDC' || b.token?.name?.toLowerCase().includes('usdc')
      );
      const amount = usdc ? parseFloat(usdc.amount) : 0;
      return amount;
    } catch (err: any) {
      const isRateLimit = err?.message?.toLowerCase().includes('rate limit') ||
        err?.message?.toLowerCase().includes('429') ||
        err?.statusCode === 429;
      if (isRateLimit && attempt < retries) {
        const delay = 3000 * attempt;
        console.warn(`⏳ [balanceSync] Rate limited fetching ${walletId}, retry ${attempt}/${retries} in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      return -1;
    }
  }
  return -1;
}

/**
 * Syncs Circle on-chain balances → agentRegistry AND Firebase (via updateAgent).
 * Agents are batched 5 at a time with 1.5s between batches.
 */
export async function syncAllWalletBalances(): Promise<void> {
  console.log('\n🔄 [balanceSync] Starting Circle balance sync for all agents...');

  let synced = 0;
  let skipped = 0;
  let failed = 0;

  const agents = Array.from(agentRegistry.values()).filter(a => a.walletId);
  const BATCH_SIZE = 5;
  const BATCH_DELAY_MS = 1500;

  for (let i = 0; i < agents.length; i += BATCH_SIZE) {
    const batch = agents.slice(i, i + BATCH_SIZE);

    const results = await Promise.all(
      batch.map(async (agent) => {
        const balance = await fetchBalanceWithRetry(agent.walletId!);
        return { agent, balance };
      })
    );

    for (const { agent, balance } of results) {
      if (balance === -1) {
        console.warn(`⚠️ [balanceSync] Could not fetch balance for ${agent.instanceId}, keeping in-memory value $${agent.usdcBalance}`);
        failed++;
      } else {
        // updateAgent automatically fires Firebase sync
        updateAgent(agent.instanceId, { usdcBalance: balance });
        console.log(`✅ [balanceSync] ${agent.instanceId.padEnd(24)} → $${balance.toFixed(6)} USDC`);
        synced++;
      }
    }

    if (i + BATCH_SIZE < agents.length) {
      await sleep(BATCH_DELAY_MS);
    }
  }

  const agentsWithNoWallet = Array.from(agentRegistry.values()).filter(a => !a.walletId).length;
  skipped = agentsWithNoWallet;
  console.log(`\n✅ [balanceSync] Done — synced: ${synced}, failed (kept old): ${failed}, no-wallet: ${skipped}`);
}

// Backward compat alias
export const syncCircleBalances = syncAllWalletBalances;

// Setup periodic sync
setInterval(syncAllWalletBalances, 60000);
