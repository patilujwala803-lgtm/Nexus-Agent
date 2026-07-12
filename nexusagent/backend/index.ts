/**
 * index.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NexusAgent Express + Socket.io server — Phase 5 Final (8-Agent Economy)
 *
 * Endpoints:
 *   GET  /health
 *   GET  /wallets
 *   POST /bounty
 *   GET  /bounties
 *   GET  /bounties/:id
 *   GET  /agent/research
 *   GET  /agent/status
 *   GET  /agent/leaderboard    ← NEW Phase 5
 *   GET  /treasury/status      ← NEW Phase 5
 *   POST /bounty/demo
 *   POST /bounty/process/:id
 *   GET  /bounty/:id/result
 * ─────────────────────────────────────────────────────────────────────────────
 */

import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';

import {
  initializeCircleSDK,
  loadWallets,
  getBalance,
} from './circle/walletService.js';

import {
  createBounty,
  getAllBounties,
  getBounty,
} from './db/bountyStore.js';

import { contentRouter } from './content/premiumEndpoint.js';
import { researchTopic, registerEmitter } from './agents/researchAgent.js';
import { processBounty, getAgentStatus, registerMasterEmitter } from './agents/masterAgent.js';
import { registerWriterEmitter } from './agents/writerAgent.js';
import { registerJudgeEmitter } from './agents/judgeAgent.js';
import { registerDataAnalystEmitter } from './agents/dataAnalystAgent.js';
import { registerFactCheckerEmitter } from './agents/factCheckerAgent.js';
import { registerTreasuryEmitter } from './agents/treasuryAgent.js';
import { registerReputationEmitter, getLeaderboard } from './agents/reputationAgent.js';
import { getAllAgents } from './src/economy/agentRegistry.js';
import { syncCircleBalances } from './src/economy/balanceSync.js';
import { saveAllAgents } from './src/firebase/agentRepository.js';


// ── App setup ─────────────────────────────────────────────────────────────────
const app  = express();
const PORT = Number(process.env.PORT ?? 4000);

const httpServer = createServer(app);

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

io.on('connection', (socket) => {
  console.log(`🔌 Frontend connected: ${socket.id}`);

  // Bug Fix 2: Emit full state on every new connection so frontend can resync
  try {
    const agents = getAllAgents();
    socket.emit('economy:full_state', {
      activeTasks: [],
      agents,
      stats: null,
      isRunning: false
    });
  } catch (_e) {
    // Non-critical if fails on startup
  }

  socket.on('disconnect', () => {
    console.log(`🔌 Frontend disconnected: ${socket.id}`);
  });
});


/**
 * emitAgentActivity
 * Broadcasts any agent event to all connected frontend clients.
 */
export function emitAgentActivity(event: string, data: unknown): void {
  console.log(`📡 [Socket] ${event}`, data);
  io.emit('agentActivity', { event, data, timestamp: new Date().toISOString() });
}

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Mount routers ─────────────────────────────────────────────────────────────
app.use('/content', contentRouter);

import { createEconomyRouter } from './src/routes/economyRoutes.js';
app.use('/api/economy', createEconomyRouter(io));

import { createCourtRouter } from './src/routes/courtRoutes.js';
app.use('/court', createCourtRouter(io));

// ── Task Records (from taskStore) ─────────────────────────────────────────────
import { getAllTaskRecords, getTaskRecord, getTaskRecordByInternalId } from './db/taskStore.js';

app.get('/task-records', (_req: Request, res: Response) => {
  res.json(getAllTaskRecords());
});

app.get('/task-records/:taskId', (req: Request, res: Response) => {
  const taskId = String(req.params.taskId);
  const record = getTaskRecord(taskId) || getTaskRecordByInternalId(taskId);
  if (!record) {
    res.status(404).json({ error: `Task record ${taskId} not found` });
    return;
  }
  res.json(record);
});

// ── Routes ────────────────────────────────────────────────────────────────────

/** GET /.well-known/appspecific/com.chrome.devtools.json — silence Chrome DevTools 404 */
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req: Request, res: Response) => {
  res.json({});
});

/** GET /health — heartbeat */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status:    'ok',
    service:   'NexusAgent Backend',
    version:   '5.0.0',
    agents:    8,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /wallets
 * Returns all 7 agent wallets with live USDC balances.
 */
app.get('/wallets', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const walletsData = await loadWallets();
    const walletsWithBalances = await Promise.all(
      walletsData.wallets.map(async (wallet) => {
        const balances = await getBalance(wallet.walletId);
        return { ...wallet, balances };
      })
    );
    res.json({
      walletSetId:   walletsData.walletSetId,
      walletSetName: walletsData.walletSetName,
      wallets:       walletsWithBalances,
    });
  } catch (err) { next(err); }
});

/**
 * POST /bounty
 * Creates a new bounty. Body: { title, description, reward, postedBy }
 */
app.post('/bounty', (req: Request, res: Response) => {
  const { title, description, reward, postedBy } = req.body as {
    title?: string; description?: string; reward?: number; postedBy?: string;
  };

  if (!title || !description || reward === undefined || !postedBy) {
    res.status(400).json({ error: 'Missing required fields: title, description, reward, postedBy' });
    return;
  }
  if (typeof reward !== 'number' || reward <= 0) {
    res.status(400).json({ error: 'reward must be a positive number (USDC amount)' });
    return;
  }

  const bounty = createBounty({ title, description, reward, postedBy });
  emitAgentActivity('bounty:created', {
    bountyId: bounty.id, title: bounty.title, reward: bounty.reward, postedBy: bounty.postedBy,
  });
  res.status(201).json(bounty);
});

/** GET /bounties — all bounties newest first */
app.get('/bounties', (_req: Request, res: Response) => {
  const all = getAllBounties();
  res.json({ count: all.length, bounties: all });
});

/** GET /bounties/:id */
app.get('/bounties/:id', (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const bounty = getBounty(id);
  if (!bounty) { res.status(404).json({ error: `Bounty ${id} not found` }); return; }
  res.json(bounty);
});

/**
 * GET /agent/research
 * Trigger Research Agent demo.
 */
app.get('/agent/research', async (req: Request, res: Response, next: NextFunction) => {
  const topic  = (req.query['topic']  as string | undefined) ?? 'artificial intelligence';
  const budget = parseFloat((req.query['budget'] as string | undefined) ?? '0.05');
  try {
    emitAgentActivity('research_started', { topic, budget });
    const result = await researchTopic(topic, budget);
    res.json(result);
  } catch (err) { next(err); }
});

/**
 * GET /agent/status
 * Live USDC balances for all 7 wallet-holding agents.
 */
app.get('/agent/status', async (_req: Request, res: Response) => {
  try {
    const agents = getAllAgents();
    const mapped = agents.map((ag) => ({
      agentName: ag.name,
      instanceId: ag.instanceId,
      walletId: ag.walletId,
      address: ag.walletAddress,
      balance: ag.usdcBalance,
      role: ag.role,
      blockchain: 'ARC-TESTNET',
    }));
    res.json({ agents: mapped, timestamp: new Date().toISOString() });
  } catch {
    const statuses = await getAgentStatus();
    res.json({ agents: statuses, timestamp: new Date().toISOString() });
  }
});

/**
 * GET /agent/leaderboard  ← NEW Phase 5
 * Pipeline reputation standings.
 */
app.get('/agent/leaderboard', (_req: Request, res: Response) => {
  const leaderboard = getLeaderboard();
  res.json({ leaderboard, timestamp: new Date().toISOString() });
});

/**
 * GET /treasury/status  ← NEW Phase 5
 * Returns last treasury allocation (static — demo info endpoint).
 */
app.get('/treasury/status', (_req: Request, res: Response) => {
  res.json({
    info: 'Treasury Agent manages budget allocation and Circle Gateway wallet refills.',
    budgetSplit: {
      research:    '25%',
      writer:      '30%',
      dataAnalyst: '20%',
      factChecker: '15%',
      reserve:     '10%',
    },
    gatewayFallback: 'makeNanopayment()',
    timestamp: new Date().toISOString(),
  });
});

/**
 * POST /bounty/demo
 * One-click demo: creates + processes a bounty with all 8 agents.
 */
app.post('/bounty/demo', async (_req: Request, res: Response, next: NextFunction) => {
  console.log('\n🎮 POST /bounty/demo — starting Phase 5 one-click demo...');
  try {
    const bounty = createBounty({
      title:       'Summarize the latest AI agent trends',
      description: 'Research current AI agent trends and provide a comprehensive summary with key insights for developers building autonomous systems in 2025.',
      reward:      0.05,
      postedBy:    'demo-user',
    });
    emitAgentActivity('bounty:created', { bountyId: bounty.id, title: bounty.title });

    // Run in background — frontend listens via Socket.io
    processBounty(bounty)
      .then((result) => emitAgentActivity('bounty_completed', result))
      .catch((err) => emitAgentActivity('error', { message: (err as Error).message }));

    res.status(202).json({
      message:   '🚀 Demo bounty started! Watch Socket.io for live updates.',
      bountyId:  bounty.id,
      statusUrl: `/bounty/${bounty.id}/result`,
    });
  } catch (err) { next(err); }
});

/**
 * POST /bounty/process/:id
 * Trigger Master Agent on an existing bounty.
 */
app.post('/bounty/process/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params['id'] as string;
  const bounty = getBounty(id);
  if (!bounty) { res.status(404).json({ error: `Bounty ${id} not found` }); return; }

  processBounty(bounty)
    .then((result) => emitAgentActivity('bounty_completed', result))
    .catch((err) => emitAgentActivity('error', { message: (err as Error).message }));

  res.status(202).json({
    message:   'Bounty processing started',
    bountyId:  id,
    statusUrl: `/bounty/${id}/result`,
  });
});

/**
 * GET /bounty/:id/result
 * Full result for a completed bounty.
 */
app.get('/bounty/:id/result', (req: Request, res: Response) => {
  const id = req.params['id'] as string;
  const bounty = getBounty(id);
  if (!bounty) { res.status(404).json({ error: `Bounty ${id} not found` }); return; }
  res.json(bounty);
});

// ── Global error handler ──────────────────────────────────────────────────────
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const message = err instanceof Error ? err.message : 'Internal server error';
  console.error('💥 Unhandled error:', message);
  res.status(500).json({ error: message });
});

// ── Boot ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🚀 Starting NexusAgent backend (Phase 5 — 8-Agent Economy)...');

  // Register Socket.io emitters with ALL 8 agents
  registerEmitter(emitAgentActivity);           // Research Agent
  registerMasterEmitter(emitAgentActivity);     // Master Agent
  registerWriterEmitter(emitAgentActivity);     // Writer Agent (+ formatter)
  registerJudgeEmitter(emitAgentActivity);      // Judge Agent (+ compliance)
  registerDataAnalystEmitter(emitAgentActivity); // Data Analyst Agent (NEW)
  registerFactCheckerEmitter(emitAgentActivity); // Fact-Checker Agent (NEW)
  registerTreasuryEmitter(emitAgentActivity);   // Treasury Agent (NEW)
  registerReputationEmitter(emitAgentActivity); // Reputation Agent (NEW)

  try {
    initializeCircleSDK();
  } catch (err) {
    console.warn('⚠️  Circle SDK not initialised (check .env):', (err as Error).message);
  }

  httpServer.listen(PORT, () => {
    console.log(`✅ NexusAgent Phase 5 running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.io ready`);
    console.log(`📡 Key endpoints:`);
    console.log(`   POST http://localhost:${PORT}/bounty/demo   ← One-click 8-agent demo!`);
    console.log(`   GET  http://localhost:${PORT}/agent/status`);
    console.log(`   GET  http://localhost:${PORT}/agent/leaderboard`);
    console.log(`   GET  http://localhost:${PORT}/treasury/status`);
  });

  // Sync real Circle balances into registry (non-blocking)
  syncCircleBalances().catch((err) => {
    console.warn('⚠️  Balance sync failed (non-critical):', (err as Error).message);
  });

  // 🔥 Sync initial agent state to Firebase (fire-and-forget)
  const allStartupAgents = getAllAgents();
  saveAllAgents(allStartupAgents)
    .then(() => console.log('🔥 Agent registry synced to Firebase'))
    .catch(console.error);

  // Section 2: Periodic balance sync every 60 seconds
  setInterval(() => {
    syncCircleBalances().catch((err) => {
      console.warn('⚠️  Periodic balance sync failed:', (err as Error).message);
    });
  }, 60000);
}

main().catch((err) => {
  console.error('💥 Fatal startup error:', err);
  process.exit(1);
});
