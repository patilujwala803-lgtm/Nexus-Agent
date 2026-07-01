/**
 * register-and-create.ts
 * Registers the entity secret with Circle, then creates all 4 agent wallets.
 * Run once: npx tsx --env-file=.env register-and-create.ts
 */
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
  initiateDeveloperControlledWalletsClient: (cfg: { apiKey: string; entitySecret: string }) => {
    createWalletSet: (params: { name: string }) => Promise<{ data?: { walletSet?: { id?: string } } }>;
    createWallets: (params: {
      blockchains: string[];
      count: number;
      walletSetId: string;
      metadata?: Array<{ name: string; refId: string }>;
    }) => Promise<{ data?: { wallets?: Array<{ id?: string; address?: string }> } }>;
    registerEntitySecretCiphertext?: (params: { entitySecret: string }) => Promise<{ data?: { recoveryFile?: string } }>;
  };
};

const API_KEY       = process.env.CIRCLE_API_KEY!;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET!;
const WALLETS_FILE  = path.join(__dirname, 'wallets.json');

if (!API_KEY || !ENTITY_SECRET) {
  console.error('❌  Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env');
  process.exit(1);
}

const client = initiateDeveloperControlledWalletsClient({ apiKey: API_KEY, entitySecret: ENTITY_SECRET });

async function run() {
  console.log('📡 Registering entity secret with Circle...');

  // Try to register (may already be registered)
  try {
    if (typeof (client as { registerEntitySecretCiphertext?: unknown }).registerEntitySecretCiphertext === 'function') {
      const reg = await (client as { registerEntitySecretCiphertext: (p: { entitySecret: string }) => Promise<{ data?: { recoveryFile?: string } }> })
        .registerEntitySecretCiphertext({ entitySecret: ENTITY_SECRET });
      if (reg.data?.recoveryFile) {
        await fs.writeFile(path.join(__dirname, 'circle-recovery-file.dat'), reg.data.recoveryFile);
        console.log('💾 Recovery file saved → circle-recovery-file.dat');
      }
      console.log('✅ Entity secret registered!');
    } else {
      console.log('ℹ️  registerEntitySecretCiphertext not available on client — may already be registered via Console.');
    }
  } catch (err) {
    const msg = (err as Error).message;
    if (msg.includes('already') || msg.includes('409')) {
      console.log('ℹ️  Entity secret already registered — continuing...');
    } else {
      console.warn(`⚠️  Registration notice: ${msg}`);
    }
  }

  // Create wallet set
  console.log('\n🔵 Creating NexusAgent wallet set...');
  const wsResponse = await client.createWalletSet({ name: 'NexusAgent Wallets' });
  const walletSetId = wsResponse.data?.walletSet?.id;
  if (!walletSetId) throw new Error('Failed to create wallet set');
  console.log(`✅ Wallet set created: ${walletSetId}`);

  const agents = ['MasterAgent', 'ResearchAgent', 'WriterAgent', 'JudgeAgent'];
  const createdWallets: Array<{ agentName: string; walletId: string; address: string; blockchain: string; walletSetId: string; createdAt: string }> = [];

  for (const agentName of agents) {
    console.log(`\n🔵 Creating ${agentName} wallet...`);
    const resp = await client.createWallets({
      blockchains: ['ARC-TESTNET'],
      count: 1,
      walletSetId,
      metadata: [{ name: agentName, refId: agentName.toLowerCase() }],
    });
    const wallet = resp.data?.wallets?.[0];
    if (!wallet?.id || !wallet?.address) throw new Error(`Failed to create ${agentName} wallet`);
    console.log(`✅ ${agentName}: ${wallet.address}`);
    createdWallets.push({
      agentName, walletId: wallet.id, address: wallet.address,
      blockchain: 'ARC-TESTNET', walletSetId, createdAt: new Date().toISOString(),
    });
  }

  const walletsData = { walletSetId, walletSetName: 'NexusAgent Wallets', createdAt: new Date().toISOString(), wallets: createdWallets };
  await fs.writeFile(WALLETS_FILE, JSON.stringify(walletsData, null, 2));
  console.log('\n💾 Wallets saved to wallets.json');
  console.log('\n🎉 Setup complete! All 4 agent wallets created on ARC-TESTNET.');
  console.log('\n📋 Wallet Summary:');
  createdWallets.forEach(w => console.log(`   ${w.agentName.padEnd(16)} → ${w.address}`));
}

run().catch(err => { console.error('💥', err.message); process.exit(1); });
