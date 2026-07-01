/**
 * setup-entity-secret.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a new entity secret, registers it with Circle, and auto-writes
 * the value into .env so you never have to copy-paste manually.
 *
 * Run ONCE:
 *   npx tsx --env-file=.env setup-entity-secret.ts
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const _require = createRequire(import.meta.url);
const {
  generateEntitySecret,
  registerEntitySecretCiphertext,
} = _require('@circle-fin/developer-controlled-wallets') as {
  generateEntitySecret: () => string;
  registerEntitySecretCiphertext: (params: {
    apiKey: string;
    entitySecret: string;
  }) => Promise<{ data?: { recoveryFile?: string } }>;
};

const ENV_FILE = path.join(__dirname, '.env');
const API_KEY  = process.env.CIRCLE_API_KEY!;

async function run() {
  if (!API_KEY) {
    console.error('❌  CIRCLE_API_KEY not set in .env');
    process.exit(1);
  }

  // ── Step 1: Check if entity secret already exists ────────────────────────
  const existingSecret = process.env.CIRCLE_ENTITY_SECRET;
  if (existingSecret && existingSecret.length === 64) {
    console.log('✅ Entity secret already set in .env — skipping generation.');
    console.log(`   Secret (first 8 chars): ${existingSecret.slice(0, 8)}...`);
    return;
  }

  // ── Step 2: Generate a fresh entity secret ────────────────────────────────
  console.log('🔐 Generating new entity secret...');
  const entitySecret = generateEntitySecret();
  console.log(`✅ Entity secret generated (${entitySecret.length} chars)`);
  console.log(`   Preview: ${entitySecret.slice(0, 8)}...`);

  // ── Step 3: Register with Circle ─────────────────────────────────────────
  console.log('\n📡 Registering entity secret with Circle API...');
  try {
    const result = await registerEntitySecretCiphertext({
      apiKey: API_KEY,
      entitySecret,
    });

    if (result.data?.recoveryFile) {
      const recoveryPath = path.join(__dirname, 'circle-recovery-file.dat');
      await fs.writeFile(recoveryPath, result.data.recoveryFile, 'utf-8');
      console.log(`✅ Registered with Circle!`);
      console.log(`💾 Recovery file saved → circle-recovery-file.dat`);
      console.log(`⚠️  BACK UP circle-recovery-file.dat securely — it cannot be re-downloaded!`);
    } else {
      console.log('✅ Registered with Circle (no recovery file in response)');
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // If already registered, that's fine — just continue with the new secret
    if (msg.includes('already') || msg.includes('409') || msg.includes('exists')) {
      console.log('ℹ️  Entity secret may already be registered — continuing...');
    } else {
      console.error(`❌  Registration failed: ${msg}`);
      console.log('   (Continuing anyway — you may need to register manually in Circle Console)');
    }
  }

  // ── Step 4: Write to .env ─────────────────────────────────────────────────
  console.log('\n💾 Writing CIRCLE_ENTITY_SECRET to .env...');
  let envContent = await fs.readFile(ENV_FILE, 'utf-8');

  if (envContent.includes('CIRCLE_ENTITY_SECRET=')) {
    envContent = envContent.replace(
      /CIRCLE_ENTITY_SECRET=.*/,
      `CIRCLE_ENTITY_SECRET=${entitySecret}`
    );
  } else {
    envContent += `\nCIRCLE_ENTITY_SECRET=${entitySecret}\n`;
  }

  await fs.writeFile(ENV_FILE, envContent, 'utf-8');
  console.log('✅ .env updated with CIRCLE_ENTITY_SECRET');
  console.log('\n🎉 Entity secret setup complete!');
  console.log('   Next: run `npm run wallets` to create the 4 agent wallets.');
}

run().catch((err) => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
