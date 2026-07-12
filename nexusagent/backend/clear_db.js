import { config } from 'dotenv';
import { createRequire } from "module";

config(); // Load .env
const _require = createRequire(import.meta.url);
const admin = _require("firebase-admin");

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

admin.initializeApp({
  credential: admin.credential.cert({
    projectId,
    clientEmail,
    privateKey,
  }),
});

const db = admin.firestore();

async function deleteCollection(collectionPath) {
  const collectionRef = db.collection(collectionPath);
  const snapshot = await collectionRef.get();
  
  const batchSize = snapshot.size;
  if (batchSize === 0) {
    return;
  }

  const batch = db.batch();
  snapshot.docs.forEach((doc) => {
    batch.delete(doc.ref);
  });
  await batch.commit();
  console.log(`Deleted ${batchSize} documents from ${collectionPath}`);
}

async function run() {
  const collections = ['agents', 'tasks', 'transactions', 'guildEvents', 'loans', 'courtEvents', 'economyStats'];
  for (const c of collections) {
    await deleteCollection(c);
  }
  console.log("Database cleared successfully!");
  process.exit(0);
}

run().catch(console.error);
