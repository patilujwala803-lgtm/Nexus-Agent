/**
 * fund-wallets.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Funds all NexusAgent wallets with testnet USDC via Circle API.
 * Only works on ARC-TESTNET (testnet funds are free/fake).
 *
 * Run: npx tsx --env-file=.env fund-wallets.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createRequire } from 'module';
import fs from 'fs/promises';

const _require = createRequire(import.meta.url);
const {
  initiateDeveloperControlledWalletsClient,
} = _require('@circle-fin/developer-controlled-wallets') as {
  initiateDeveloperControlledWalletsClient: (cfg: {
    apiKey: string;
    entitySecret: string;
  }) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any;
  };
};

const API_KEY       = process.env.CIRCLE_API_KEY!;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET!;

async function fundWallets() {
  const walletsData = JSON.parse(await fs.readFile('wallets.json', 'utf-8'));

  // Only fund MasterAgent — it pays everyone else
  const master = walletsData.wallets.find((w: { agentName: string }) =>
    w.agentName === 'MasterAgent'
  );

  if (!master) {
    console.error('❌  MasterAgent wallet not found in wallets.json');
    process.exit(1);
  }

  console.log('💰 Requesting testnet USDC for NexusAgent wallets...');
  console.log(`   MasterAgent: ${master.address}`);
  console.log('');

  // Circle testnet faucet endpoint
  const faucetUrl = `https://api.circle.com/v1/w3s/developer/wallets/${master.walletId}/balances/fund`;

  try {
    const res = await fetch(faucetUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        blockchain: 'ARC-TESTNET',
        native:     false,   // USDC not native gas token
      }),
    });

    const data = await res.json();
    console.log('API Response:', JSON.stringify(data, null, 2));

    if (res.ok) {
      console.log('\n✅ Testnet USDC requested successfully!');
      console.log('   Wait ~30 seconds then check balance with:');
      console.log('   curl http://localhost:4000/agent/status');
    } else {
      console.log('\n⚠️  API returned error — try the Circle Console instead:');
      console.log('   https://console.circle.com → Wallets → MasterAgent → Fund');
    }
  } catch (err) {
    console.error('❌  Request failed:', (err as Error).message);
    console.log('\n👉 Manual option: Go to https://console.circle.com');
    console.log('   Find MasterAgent wallet and click "Fund Wallet"');
  }
}

fundWallets();
