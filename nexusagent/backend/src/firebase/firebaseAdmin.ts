/**
 * firebaseAdmin.ts
 * Firebase Admin SDK initialization for NexusAgent backend.
 * Uses environment variables for service account credentials.
 */

import { createRequire } from "module";

const _require = createRequire(import.meta.url);

let _admin: any = null;
let _db: any = null;

function getAdmin() {
  if (_admin) return _admin;
  try {
    _admin = _require("firebase-admin");
    return _admin;
  } catch {
    console.warn("⚠️ [firebaseAdmin] firebase-admin not installed. Firebase features disabled.");
    return null;
  }
}

function initializeFirebase() {
  const admin = getAdmin();
  if (!admin) return null;

  // Already initialized
  if (admin.apps && admin.apps.length > 0) {
    return admin.apps[0];
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    console.warn("⚠️ [firebaseAdmin] Firebase credentials not set. Firebase features disabled.");
    return null;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    console.log("🔥 [firebaseAdmin] Firebase Admin SDK initialized successfully.");
    return app;
  } catch (err) {
    console.warn("⚠️ [firebaseAdmin] Failed to initialize Firebase Admin:", (err as Error).message);
    return null;
  }
}

function getFirestoreDB() {
  if (_db) return _db;
  const admin = getAdmin();
  if (!admin) return null;
  const app = initializeFirebase();
  if (!app) return null;
  try {
    _db = admin.firestore();
    return _db;
  } catch {
    return null;
  }
}

// Export db as a getter-initialized instance (lazy)
export const db = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getFirestoreDB();
    if (!instance) return undefined;
    const val = instance[prop];
    if (typeof val === "function") return val.bind(instance);
    return val;
  },
});

export const isFirebaseEnabled = (): boolean => {
  return getFirestoreDB() !== null;
};
