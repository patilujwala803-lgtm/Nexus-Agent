/**
 * check-low-balances.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Queries Circle API for every agent wallet and lists agents with < $10 USDC.
 *
 * Run: npx tsx --env-file=.env check-low-balances.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const _require = createRequire(import.meta.url);
const {
  initiateDeveloperControlledWalletsClient,
} = _require('@circle-fin/developer-controlled-wallets') as {
  initiateDeveloperControlledWalletsClient: (config: { apiKey: string; entitySecret: string }) => any;
};

const THRESHOLD = 10.00; // USD

interface AgentWallet {
  agentName: string;
  walletId: string;
  address: string;
  blockchain: string;
}

interface WalletsFile {
  walletSetId: string;
  wallets: AgentWallet[];
}

async function main() {
  const apiKey       = process.env.CIRCLE_API_KEY!;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET!;

  if (!apiKey || !entitySecret) {
    console.error('❌ Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env');
    process.exit(1);
  }

  // Load wallets.json
  const walletsPath = path.join(__dirname, 'wallets.json');
  let walletsData: WalletsFile;
  try {
    const raw = await fs.readFile(walletsPath, 'utf-8');
    walletsData = JSON.parse(raw);
  } catch {
    console.error('❌ Could not read wallets.json — run npm run wallets first');
    process.exit(1);
  }

  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  console.log(`\n🔍 Checking ${walletsData.wallets.length} agent wallets on Circle API...`);
  console.log(`   Threshold: < $${THRESHOLD} USDC\n`);

  const lowBalanceAgents: Array<{
    name: string;
    walletId: string;
    address: string;
    balance: number;
  }> = [];

  const errors: string[] = [];

  for (const wallet of walletsData.wallets) {
    try {
      const res = await client.getWalletTokenBalance({ id: wallet.walletId });
      const tokenBalances: any[] = res.data?.tokenBalances ?? [];

      // Find USDC balance
      const usdcEntry = tokenBalances.find(
        (tb: any) =>
          tb.token?.symbol === 'USDC' ||
          tb.token?.name?.toLowerCase().includes('usd')
      );

      const balance = usdcEntry ? parseFloat(usdcEntry.amount) : 0;

      if (balance < THRESHOLD) {
        lowBalanceAgents.push({
          name:     wallet.agentName,
          walletId: wallet.walletId,
          address:  wallet.address,
          balance,
        });
      }
    } catch (err: any) {
      errors.push(`${wallet.agentName}: ${err?.message || 'API error'}`);
    }
  }

  // ── Results ────────────────────────────────────────────────────────────────
  if (lowBalanceAgents.length === 0) {
    console.log('✅ All agents have $10+ USDC — no top-ups needed!\n');
  } else {
    console.log(`⚠️  ${lowBalanceAgents.length} agents with < $${THRESHOLD} USDC:\n`);
    console.log('┌─────────────────────────────────────────┬────────────────────────────────────────┬──────────────┐');
    console.log('│ Agent Name                              │ Wallet ID                              │ Balance USDC │');
    console.log('├─────────────────────────────────────────┼────────────────────────────────────────┼──────────────┤');

    for (const agent of lowBalanceAgents.sort((a, b) => a.balance - b.balance)) {
      const name    = agent.name.padEnd(39).slice(0, 39);
      const wid     = agent.walletId.padEnd(38).slice(0, 38);
      const bal     = `$${agent.balance.toFixed(4)}`.padStart(12);
      console.log(`│ ${name} │ ${wid} │ ${bal} │`);
    }

    console.log('└─────────────────────────────────────────┴────────────────────────────────────────┴──────────────┘');

    console.log('\n📋 Wallet addresses for top-up:');
    for (const agent of lowBalanceAgents) {
      console.log(`   ${agent.name.padEnd(35)} ${agent.address}   ($${agent.balance.toFixed(4)} USDC)`);
    }
  }

  if (errors.length > 0) {
    console.log(`\n⚠️  ${errors.length} wallets had API errors:`);
    errors.forEach(e => console.log(`   • ${e}`));
  }

  console.log(`\n✅ Done. ${walletsData.wallets.length} wallets checked.\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
