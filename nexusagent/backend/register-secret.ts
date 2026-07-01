/**
 * register-secret.ts
 * Uses Circle SDK's built-in registerEntitySecretCiphertext to register the
 * entity secret directly via API — no Console needed.
 */
import { createRequire } from 'module';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const _require = createRequire(import.meta.url);
const sdk = _require('@circle-fin/developer-controlled-wallets') as {
  registerEntitySecretCiphertext: (params: { apiKey: string; entitySecret: string }) =>
    Promise<{ data?: { recoveryFile?: string } }>;
};

const API_KEY       = process.env.CIRCLE_API_KEY!;
const ENTITY_SECRET = process.env.CIRCLE_ENTITY_SECRET!;

if (!API_KEY || !ENTITY_SECRET) {
  console.error('❌  Missing CIRCLE_API_KEY or CIRCLE_ENTITY_SECRET in .env');
  process.exit(1);
}

console.log('📡 Registering entity secret ciphertext with Circle API...');
console.log(`   Secret (first 8 chars): ${ENTITY_SECRET.slice(0, 8)}...`);

try {
  const result = await sdk.registerEntitySecretCiphertext({
    apiKey:       API_KEY,
    entitySecret: ENTITY_SECRET,
  });

  if (result.data?.recoveryFile) {
    const recoveryPath = path.join(__dirname, 'circle-recovery-file.dat');
    await fs.writeFile(recoveryPath, result.data.recoveryFile, 'utf-8');
    console.log('💾 Recovery file saved → circle-recovery-file.dat');
    console.log('⚠️  BACK UP this file! It cannot be re-downloaded.');
  }
  console.log('✅ Entity secret registered with Circle!');
  console.log('   Now run: npx tsx --env-file=.env register-and-create.ts');
} catch (err) {
  const msg = (err as Error).message;
  if (msg.includes('already') || msg.includes('409') || msg.includes('exists')) {
    console.log('ℹ️  Entity secret already registered with Circle — you can proceed to create wallets.');
  } else {
    console.error(`❌  Registration failed: ${msg}`);
  }
}
