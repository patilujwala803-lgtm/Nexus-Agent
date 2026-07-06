import dotenv from 'dotenv';
dotenv.config();

import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const _require = createRequire(import.meta.url);
const { initiateDeveloperControlledWalletsClient } = _require(
  '@circle-fin/developer-controlled-wallets'
) as {
  initiateDeveloperControlledWalletsClient: (config: {
    apiKey: string;
    entitySecret: string;
  }) => any;
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const WALLETS_FILE = path.join(__dirname, '..', 'wallets.json');
const BLOCKCHAIN = 'ARC-TESTNET';

const AGENT_INSTANCES = [
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
];

async function main() {
  const apiKey = process.env.CIRCLE_API_KEY;
  const entitySecret = process.env.CIRCLE_ENTITY_SECRET;

  if (!apiKey || !entitySecret) {
    console.error('❌ Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in environment.');
    process.exit(1);
  }

  console.log('🔵 Initializing Circle Developer-Controlled Wallets Client...');
  const client = initiateDeveloperControlledWalletsClient({ apiKey, entitySecret });

  const fileRaw = await fs.readFile(WALLETS_FILE, 'utf-8');
  const walletsJson = JSON.parse(fileRaw);
  const walletSetId = walletsJson.walletSetId || '984627e7-dd4a-555e-bc5f-d78aa501a277';

  console.log(`ℹ️ Target Wallet Set ID: ${walletSetId}`);

  for (const agentName of AGENT_INSTANCES) {
    console.log(`\n🔵 Requesting real Circle wallet creation for: ${agentName}...`);
    try {
      const resp = await client.createWallets({
        blockchains: [BLOCKCHAIN],
        count: 1,
        walletSetId,
        metadata: [{ name: agentName, refId: agentName }],
      });

      const wallet = resp.data?.wallets?.[0];
      if (wallet?.id && wallet?.address) {
        console.log(`✅ Circle API Created Wallet for ${agentName}:`);
        console.log(`   Wallet ID: ${wallet.id}`);
        console.log(`   Address  : ${wallet.address}`);

        // Update or add entry in wallets.json
        const existingIdx = walletsJson.wallets.findIndex(
          (w: any) => w.agentName.toLowerCase() === agentName.toLowerCase()
        );

        const updatedRecord = {
          agentName,
          walletId: wallet.id,
          address: wallet.address,
          blockchain: BLOCKCHAIN,
          walletSetId,
          createdAt: new Date().toISOString(),
        };

        if (existingIdx >= 0) {
          walletsJson.wallets[existingIdx] = updatedRecord;
        } else {
          walletsJson.wallets.push(updatedRecord);
        }
      } else {
        console.warn(`⚠️ Failed to retrieve wallet from Circle response for ${agentName}`);
      }
    } catch (err: any) {
      console.warn(`⚠️ Circle API call error for ${agentName}: ${err.message}`);
    }

    // Delay between API requests to respect Circle API rate limits
    await new Promise((r) => setTimeout(r, 1200));
  }

  await fs.writeFile(WALLETS_FILE, JSON.stringify(walletsJson, null, 2));
  console.log('\n💾 Successfully saved updated Circle wallets to wallets.json!');
}

main().catch(console.error);
