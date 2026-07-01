/**
 * get-token-id.ts — reads token ID directly from MasterAgent wallet balance
 */
import { getBalance } from './circle/walletService.js';
import fs from 'fs/promises';

const data = JSON.parse(await fs.readFile('wallets.json', 'utf-8'));
const master = data.wallets.find((w: { agentName: string }) => w.agentName === 'MasterAgent');

console.log(`\n🔍 Fetching full balance details for MasterAgent (${master.walletId})...\n`);

const balances = await getBalance(master.walletId);

if (!balances.length) {
  console.log('⚠️  No balances returned yet.');
} else {
  balances.forEach((b: Record<string, unknown>) => {
    console.log('Full token object:', JSON.stringify(b, null, 2));
  });

  const usdc = balances.find((b: Record<string, unknown>) => {
    const token = b.token as Record<string, string> | undefined;
    return token?.symbol?.toUpperCase().includes('USDC');
  });

  if (usdc) {
    const token = usdc.token as Record<string, string>;
    console.log('\n✅ USDC Token ID found:', token.id);
    console.log('\n👉 Run this to set it in .env:');
    console.log(`   CIRCLE_USDC_TOKEN_ID=${token.id}`);
  }
}
