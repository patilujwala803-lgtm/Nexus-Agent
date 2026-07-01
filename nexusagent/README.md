# NexusAgent 🤖⚡💰

> **Autonomous AI Bounty Economy** — AI agents compete for bounties, hire sub-agents, and pay each other in USDC nanopayments on Circle's Arc testnet.

---

## What is NexusAgent?

NexusAgent is a multi-agent system where:

1. **Humans** post bounties (e.g. "Summarise today's AI news") with a USDC stake
2. **AI agents** autonomously pick up bounties and compete to complete them
3. **Agents hire sub-agents** (Research, Writer, Format) and pay them via Circle Nanopayments
4. A **Research Agent** can hit simulated HTTP 402 paywalls and pay through them automatically
5. A **Judge Agent** evaluates all submissions and releases USDC to the winner
6. Everything settles on **Arc testnet** via Circle Gateway
7. A **live dashboard** shows agent activity, wallet balances, and payment flows in real time

---

## Project Structure

```
nexusagent/
├── backend/
│   ├── agents/          ← AI agent implementations (Phase 2+)
│   ├── circle/
│   │   └── walletService.ts   ← Circle SDK wrapper
│   ├── content/         ← Agent-generated content cache (Phase 2+)
│   ├── db/
│   │   └── bountyStore.ts     ← In-memory bounty store
│   ├── index.ts         ← Express + Socket.io server
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/            ← Next.js dashboard (Phase 2+)
├── .gitignore
└── README.md
```

---

## Prerequisites

- **Node.js** ≥ 18
- A **Circle Developer account** — [console.circle.com](https://console.circle.com)
- A **Groq API key** (for AI agents in Phase 2) — [console.groq.com](https://console.groq.com)

---

## Setup Instructions

### 1. Clone and install dependencies

```bash
cd nexusagent/backend
npm install
```

### 2. Generate your Entity Secret

The Entity Secret is a 32-byte secret that Circle uses to encrypt your developer-controlled wallets. **You must generate it once and never lose it.**

```bash
# Option A — using OpenSSL (recommended)
openssl rand -hex 32

# Option B — using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Save this value — you'll need it in two places:

#### Register the hashed version with Circle Console

1. Go to [console.circle.com](https://console.circle.com) → **Settings** → **Entity Secret Ciphertext**
2. Paste your raw hex secret into the registration tool on the Circle Console
3. Circle will compute and store the hash; you keep the raw secret

> ⚠️ **Never share the raw entity secret.** It grants full control over your wallets.

### 3. Configure environment variables

```bash
cp .env.example .env
```

Then open `.env` and fill in:

| Variable | Where to get it |
|---|---|
| `CIRCLE_API_KEY` | [console.circle.com](https://console.circle.com) → Developers → API Keys |
| `CIRCLE_ENTITY_SECRET` | The 32-byte hex you generated above |
| `GROQ_API_KEY` | [console.groq.com/keys](https://console.groq.com/keys) |
| `PORT` | Leave as `4000` (or change to your preference) |

---

## Phase 1 — Create Agent Wallets

Run the wallet creation script. This creates 4 EOA wallets on Arc testnet and saves their IDs/addresses to `wallets.json`.

```bash
# From the backend/ directory
npx tsx --env-file=.env circle/walletService.ts
```

**Expected output:**
```
🔵 Initializing Circle SDK...
✅ Circle SDK initialized

🔵 Creating NexusAgent wallet set...
✅ Wallet set created: <wallet-set-id>

🔵 Creating MasterAgent wallet...
✅ MasterAgent wallet: 0x...

🔵 Creating ResearchAgent wallet...
✅ ResearchAgent wallet: 0x...

🔵 Creating WriterAgent wallet...
✅ WriterAgent wallet: 0x...

🔵 Creating JudgeAgent wallet...
✅ JudgeAgent wallet: 0x...

💾 Wallets saved to wallets.json
🎉 Phase 1 Complete!
```

> ⚠️ `wallets.json` is in `.gitignore` — never commit it.

---

## Running the Backend Server

```bash
# Development (hot-reload)
npm run dev

# Production
npm run start
```

The server starts on `http://localhost:4000`.

### API Endpoints

| Method | Path | Description |
|---|---|---|
| `GET` | `/health` | Server heartbeat |
| `GET` | `/wallets` | All agent wallets + live USDC balances |
| `POST` | `/bounty` | Create a new bounty |
| `GET` | `/bounties` | List all bounties |
| `GET` | `/bounties/:id` | Get a single bounty |

### Socket.io Events

Connect to `http://localhost:4000` with a Socket.io client.

| Event | Direction | Payload |
|---|---|---|
| `agentActivity` | Server → Client | `{ event, data, timestamp }` |

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `CIRCLE_API_KEY` | ✅ | Circle developer API key |
| `CIRCLE_ENTITY_SECRET` | ✅ | 32-byte hex entity secret (raw, NOT hashed) |
| `GROQ_API_KEY` | Phase 2+ | Groq LLM key for AI agent reasoning |
| `PORT` | Optional | HTTP server port (default: 4000) |

---

## Roadmap

| Phase | Description | Status |
|---|---|---|
| **Phase 1** | Project structure + Circle wallet integration | ✅ Done |
| **Phase 2** | AI agents (Master, Research, Writer, Judge) | 🔜 Next |
| **Phase 3** | USDC nanopayments + 402 paywall flow | 🔜 |
| **Phase 4** | Live frontend dashboard | 🔜 |
| **Phase 5** | Full end-to-end bounty demo | 🔜 |

---

## Security Notes

- `wallets.json`, `.env`, and `*recovery-file*` are all in `.gitignore`
- The entity secret must **only** exist on your server — never in client code or version control
- Use environment-specific API keys (testnet key for development)

---

## License

MIT
