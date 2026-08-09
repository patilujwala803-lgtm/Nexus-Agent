/**
 * walletService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Circle Developer-Controlled Wallet service for NexusAgent.
 *
 * Responsibilities:
 *  1. Initialize the Circle SDK with API key + entity secret
 *  2. Create a "NexusAgent Wallets" wallet set
 *  3. Create EOA wallets on ARC-TESTNET for all agents (lazy loading/creation)
 *  4. Persist wallet IDs/addresses to wallets.json
 *  5. Export helper functions: getWallet(), getBalance()
 * ─────────────────────────────────────────────────────────────────────────────
 */

import dotenv from 'dotenv';
dotenv.config();

import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const _require = createRequire(import.meta.url);
const {
  initiateDeveloperControlledWalletsClient,
} = _require('@circle-fin/developer-controlled-wallets') as {
  initiateDeveloperControlledWalletsClient: (config: { apiKey: string; entitySecret: string }) =>
    ReturnType<typeof import('@circle-fin/developer-controlled-wallets').initiateDeveloperControlledWalletsClient>;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const WALLETS_FILE = path.join(__dirname, '..', 'wallets.json');
const BLOCKCHAIN = 'ARC-TESTNET' as const;

// ── All agents needing wallets (Phase 7 Expanded list: 49 agents) ─────────────
const AGENT_NAMES = [
  'MasterAgent',
  'ResearchAgent',
  'WriterAgent',
  'JudgeAgent',
  'TreasuryAgent',
  'DataAnalystAgent',
  'FactCheckerAgent',
  'hiring-agent-1',
  'hiring-agent-2',
  'hiring-agent-3',
  'broker-agent-1',
  'broker-agent-2',
  'broker-agent-3',
  'escrow-agent-1',
  'escrow-agent-2',
  'escrow-agent-3',
  'treasury-agent-1',
  'treasury-agent-2',
  'judge-agent-1',
  'judge-agent-2',
  'bank-agent-1',
  'bank-agent-2',
  'guild-coordinator',
  'writer-alex',
  'writer-maya',
  'writer-sam',
  'researcher-priya',
  'researcher-leo',
  'researcher-nina',
  'analyst-kai',
  'analyst-zoe',
  'coder-dev',
  'coder-aria',
  'translator-omar',
  'translator-yuki',
  'summarizer-finn',
  'summarizer-lia',
  'copy-jade',
  'copy-rex',
  'seo-nova',
  'seo-blaze',
  'illus-sage',
  'illus-ember',
  'editor-quinn',
  'editor-blake',
  'fact-river',
  'fact-dawn',
  'qa-storm',
  'qa-pixel',
  'comply-atlas',
  'comply-vera',
  'nego-rex',
  'nego-sky',
  'reputation-agent',
  'master-agent',
  'research-agent'
] as const;

export interface AgentWallet {
  agentName: string;
  walletId: string;
  address: string;
  blockchain: string;
  walletSetId: string;
  createdAt: string;
}

interface WalletsFile {
  walletSetId: string;
  walletSetName: string;
  createdAt: string;
  wallets: AgentWallet[];
}

let circleClient: ReturnType<typeof initiateDeveloperControlledWalletsClient> | null = null;

export function initializeCircleSDK() {
  if (circleClient) return circleClient;

  const apiKey       = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    throw new Error(
      '❌  Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in environment.'
    );
  }

  circleClient = initiateDeveloperControlledWalletsClient({
    apiKey,
    entitySecret,
  });

  return circleClient;
}

export async function createNexusWallets(): Promise<WalletsFile> {
  let client: ReturnType<typeof initializeCircleSDK> | null = null;
  try {
    client = initializeCircleSDK();
  } catch (err) {
    console.warn(`⚠️ Circle SDK initialization failed: ${(err as Error).message}. Operating in mock wallet generation mode.`);
  }

  let walletSetId = "";
  let existingWallets: AgentWallet[] = [];

  try {
    const existing = await loadWallets();
    walletSetId = existing.walletSetId;
    existingWallets = existing.wallets;
    console.log(`ℹ️  Found existing wallets.json with walletSetId: ${walletSetId}`);
  } catch (err) {
    console.log("ℹ️  No existing wallets.json. Creating new wallet set...");
  }

  if (!walletSetId && client) {
    console.log('\n🔵 Creating Circle wallet set...');
    try {
      const walletSetResponse = await client.createWalletSet({
        name: 'NexusAgent Wallets',
      });
      const walletSet = walletSetResponse.data?.walletSet;
      if (walletSet?.id) {
        walletSetId = walletSet.id;
        console.log(`✅ Wallet set created: ${walletSetId}`);
      }
    } catch (err) {
      console.warn(`⚠️ Failed to create wallet set on Circle: ${(err as Error).message}`);
    }
  }

  // If we still don't have a walletSetId, generate a mock one
  if (!walletSetId) {
    walletSetId = `mock-walletset-${crypto.randomUUID()}`;
  }

  // Filter out any mock wallets so we attempt to recreate them with the real Circle API
  const finalWallets: AgentWallet[] = existingWallets.filter(w => 
    !w.address.startsWith('0xmock') && !w.walletId.startsWith('mock-')
  );

  for (const agentName of AGENT_NAMES) {
    const alreadyExists = finalWallets.find(w => w.agentName.toLowerCase() === agentName.toLowerCase());
    if (alreadyExists) {
      console.log(`✅ ${agentName} wallet already exists: ${alreadyExists.address}`);
      continue;
    }

    if (client && !walletSetId.startsWith('mock-')) {
      console.log(`\n🔵 Creating real Circle wallet for ${agentName}...`);
      try {
        const response = await client.createWallets({
          blockchains: [BLOCKCHAIN],
          count: 1,
          walletSetId,
          metadata: [{ name: agentName, refId: agentName.toLowerCase() }],
        });

        const wallet = response.data?.wallets?.[0];
        if (wallet?.id && wallet?.address) {
          console.log(`✅ Real ${agentName} wallet created: ${wallet.address}`);
          finalWallets.push({
            agentName,
            walletId: wallet.id,
            address:  wallet.address,
            blockchain: BLOCKCHAIN,
            walletSetId,
            createdAt: new Date().toISOString(),
          });
          continue;
        }
      } catch (err) {
        console.warn(`⚠️ Circle wallet creation failed for ${agentName}: ${(err as Error).message}`);
      }
    }

    // Mock wallet fallback if Circle call fails or is not config'd
    const mockAddr = `0xmock${crypto.randomBytes(18).toString('hex')}`;
    const mockId = `mock-uuid-${agentName.toLowerCase()}`;
    console.log(`ℹ️  Generated mock fallback for ${agentName}: ${mockAddr}`);
    finalWallets.push({
      agentName,
      walletId: mockId,
      address:  mockAddr,
      blockchain: BLOCKCHAIN,
      walletSetId,
      createdAt: new Date().toISOString(),
    });
  }

  const walletsData: WalletsFile = {
    walletSetId,
    walletSetName: 'NexusAgent Wallets',
    createdAt: new Date().toISOString(),
    wallets: finalWallets,
  };

  console.log('\n💾 Saving wallets to wallets.json...');
  await fs.writeFile(WALLETS_FILE, JSON.stringify(walletsData, null, 2), 'utf-8');
  console.log('💾 Wallets saved to wallets.json');

  return walletsData;
}

export async function loadWallets(): Promise<WalletsFile> {
  // 1. Check env var first (used in Railway/production where wallets.json isn't on disk)
  if (process.env.WALLETS_JSON) {
    try {
      return JSON.parse(process.env.WALLETS_JSON) as WalletsFile;
    } catch {
      console.warn('⚠️ [walletService] WALLETS_JSON env var is set but not valid JSON — falling back to file.');
    }
  }

  // 2. Try reading from disk (local dev)
  try {
    const raw = await fs.readFile(WALLETS_FILE, 'utf-8');
    return JSON.parse(raw) as WalletsFile;
  } catch {
    // 3. Safe fallback — return empty structure so callers don't crash
    console.warn('⚠️ [walletService] wallets.json not found and WALLETS_JSON env not set. Using mock wallet structure.');
    return {
      walletSetId: 'mock-wallet-set',
      walletSetName: 'Mock Wallets',
      createdAt: new Date().toISOString(),
      wallets: [],
    } as WalletsFile;
  }
}

export async function getWallet(agentName: string): Promise<AgentWallet | undefined> {
  try {
    const data = await loadWallets();
    return data.wallets.find(
      (w) => w.agentName.toLowerCase() === agentName.toLowerCase()
    );
  } catch {
    return undefined;
  }
}

export async function getBalance(walletId: string) {
  if (walletId.startsWith('mock-uuid-')) {
    return [{ token: { symbol: 'USDC' }, amount: '100.00' }];
  }

  try {
    const client = initializeCircleSDK();
    console.log(`💰 Fetching balance for wallet ${walletId}...`);
    const response = await client.getWalletTokenBalance({ id: walletId });
    return response.data?.tokenBalances ?? [];
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`❌  Failed to fetch balance for wallet ${walletId}: ${msg}`);
    return [];
  }
}

export async function getAllBalances() {
  console.log('\n💰 Fetching all agent wallet balances...');
  const data = await loadWallets();

  const results: Array<{ agentName: string; walletId: string; balances: unknown[] }> = [];
  for (const wallet of data.wallets) {
    const balances = await getBalance(wallet.walletId);
    results.push({ agentName: wallet.agentName, walletId: wallet.walletId, balances });
  }

  return results;
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(__filename);

if (isMain) {
  (async () => {
    try {
      const wallets = await createNexusWallets();
      console.log('\n📋 Summary of created wallets:');
      wallets.wallets.forEach((w) => {
        console.log(`   ${w.agentName.padEnd(18)} → ${w.address}`);
      });
      console.log('\n🎉 Standalone Wallet Sync Complete!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`\n${msg}`);
      process.exit(1);
    }
  })();
}
