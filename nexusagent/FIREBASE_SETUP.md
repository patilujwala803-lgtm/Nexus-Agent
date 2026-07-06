# Firebase Setup Guide for NexusAgent

## Project Configuration
- **Firebase Project ID**: `ignyte-hackathon`
- **Project Number**: `587241000616`
- **Firestore Region**: `us-central1` (or your chosen region)

---

## Quick Setup Steps

### Step 1: Service Account Key (Backend)
1. Go to [Firebase Console → ignyte-hackathon → Project Settings → Service Accounts](https://console.firebase.google.com/project/ignyte-hackathon/settings/serviceaccounts/adminsdk).
2. Click **Generate new private key** and download the JSON file.
3. Open `backend/.env` and update the following variables with the values from your JSON file:
   ```env
   FIREBASE_PROJECT_ID=ignyte-hackathon
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ignyte-hackathon.iam.gserviceaccount.com
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   ```

### Step 2: Register Web App (Frontend)
1. Go to [Firebase Console → ignyte-hackathon → Project Settings → General](https://console.firebase.google.com/project/ignyte-hackathon/settings/general).
2. Scroll down to **Your apps** and click **Add app** (`</>` Web icon). Name it `NexusAgent Web`.
3. Copy the generated `firebaseConfig` object and paste the values into `frontend/.env.local`:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ignyte-hackathon.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=ignyte-hackathon
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ignyte-hackathon.firebasestorage.app
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=587241000616
   NEXT_PUBLIC_FIREBASE_APP_ID=1:587241000616:web:...
   ```

---

## Firestore Collections Schema

The backend automatically manages and syncs data across 7 Firestore collections in real time:

1. **`agents`** (Doc ID: `instanceId`)
   - Tracks 49 AI agent profiles, USDC balances, reputations, certifications, loan statuses, win/loss stats, and roles.
   - Synced on server startup via `saveAllAgents` and on every balance/status update via `updateAgentFields`.

2. **`tasks`** (Doc ID: `taskId`)
   - Stores all spawned task bounties, budgets, variants, assignees, quality scores, payment transaction hashes, and results.
   - Synced via `saveTask` and `updateTaskFields` in `taskQueue.ts`.

3. **`transactions`** (Doc ID: `txHash` or auto ID)
   - Audit log of all USDC micropayments, escrow deposits, loan disbursements, education purchases, jury fees, and court appeal fees.

4. **`economy`** (Doc ID: `current_stats`)
   - Real-time snapshot of system stats (total agents, idle/busy count, tasks completed, total USDC volume, top earners, uptime).

5. **`guilds`** (Doc ID: `guildId`)
   - Guild formations, member lists, dynamic synergies, and seed capital investments.

6. **`loans`** (Doc ID: `loanId`)
   - Micro-lending records, interest rates, borrower histories, and repayment statuses.

7. **`court_events`** (Doc ID: `eventId`)
   - Supreme Court appeals, jury verdicts, fee payouts, and score adjustments.

---

## Deploying Rules & Indexes via CLI

To deploy Firestore security rules and composite indexes:
```bash
npx firebase-tools deploy --only firestore --project ignyte-hackathon
```

---

## Verifying Setup
1. Start the backend: `cd backend && npm run dev`
2. Look for log: `🔥 Agent registry synced to Firebase`
3. Open [Firebase Console → Firestore Database](https://console.firebase.google.com/project/ignyte-hackathon/firestore) to verify the populated collections.
