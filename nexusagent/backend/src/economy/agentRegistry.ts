import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';
import { Agent, AgentRole, BidStrategy, AgentStatus } from "./types.js";
import { updateAgentFields } from "../firebase/agentRepository.js";

console.log("💾 [agentRegistry] Module loading started (Phase 7 Extension)...");

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);
const WALLETS_FILE = path.join(__dirname, "..", "..", "wallets.json");

// Load wallets map from wallets.json
const walletsMap = new Map<string, { walletId: string; address: string }>();
try {
  if (fs.existsSync(WALLETS_FILE)) {
    const raw = fs.readFileSync(WALLETS_FILE, "utf-8");
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.wallets)) {
      for (const w of parsed.wallets) {
        walletsMap.set(w.agentName.toLowerCase(), { walletId: w.walletId, address: w.address });
      }
      console.log(`💾 [agentRegistry] Loaded ${walletsMap.size} wallets from wallets.json`);
    }
  } else {
    console.warn(`⚠️ [agentRegistry] wallets.json not found at: ${WALLETS_FILE}`);
  }
} catch (err) {
  console.warn(`⚠️ [agentRegistry] Failed to load wallets.json: ${(err as Error).message}`);
}

export const agentRegistry = new Map<string, Agent>();

// Helper to create an agent with standard defaults
function createAgentRecord(params: {
  instanceId: string;
  name: string;
  role: AgentRole;
  skills: string[];
  usdcBalance: number;
  bidStrategy: BidStrategy;
  poolType: string | null;
}): Agent {
  console.log(`🆕 [createAgentRecord] Creating agent record for ${params.instanceId} started...`);
  
  // Resolve wallet from wallets.json
  const walletInfo = walletsMap.get(params.instanceId.toLowerCase()) || walletsMap.get(params.name.toLowerCase());
  const walletId = walletInfo ? walletInfo.walletId : "";
  const walletAddress = walletInfo ? walletInfo.address : "";

  const record: Agent = {
    id: crypto.randomUUID(),
    instanceId: params.instanceId,
    name: params.name,
    role: params.role,
    skills: params.skills,
    walletId,
    walletAddress,
    usdcBalance: params.usdcBalance,
    reputation: 0,         // FIX 5: Reset — all agents start at 0
    status: "idle",
    totalEarned: 0,        // FIX 5: Reset
    totalSpent: 0,         // FIX 5: Reset
    jobsCompleted: 0,      // FIX 5: Reset
    jobsFailed: 0,
    currentTaskId: null,
    bidStrategy: params.bidStrategy,
    poolType: params.poolType,
    // Phase 7 extensions
    consecutiveIdleCycles: 0,
    consecutiveWins: 0,
    loanBalance: 0,
    loanInterestRate: 0,
    qualityOffset: 0,
    certifications: [],
    isHighDefaultRisk: false
  };
  console.log(`🆕 [createAgentRecord] Creating agent record for ${params.instanceId} finished (wallet: ${walletAddress ? "linked" : "none"}).`);
  return record;
}

// ── Define the 33 agents (16 Pool agents + 15 Specialists + 2 Existing) ───────

// 1. Pool Agents - Hiring (3 instances)
for (let i = 1; i <= 3; i++) {
  const agent = createAgentRecord({
    instanceId: `hiring-agent-${i}`,
    name: `Hiring Agent #${i}`,
    role: "meta",
    skills: ["hiring", "orchestration"],
    usdcBalance: 10.00,
    bidStrategy: "standard",
    poolType: "hiring"
  });
  agentRegistry.set(agent.instanceId, agent);
}

// 2. Pool Agents - Marketplace Brokers (3 instances)
for (let i = 1; i <= 3; i++) {
  const agent = createAgentRecord({
    instanceId: `broker-agent-${i}`,
    name: `Broker #${i}`,
    role: "finance",
    skills: ["brokering", "marketplace"],
    usdcBalance: 10.00,
    bidStrategy: "standard",
    poolType: "broker"
  });
  agentRegistry.set(agent.instanceId, agent);
}

// 3. Pool Agents - Escrow (3 instances)
for (let i = 1; i <= 3; i++) {
  const agent = createAgentRecord({
    instanceId: `escrow-agent-${i}`,
    name: `Escrow #${i}`,
    role: "finance",
    skills: ["escrow", "holding"],
    usdcBalance: 20.00,
    bidStrategy: "standard",
    poolType: "escrow"
  });
  agentRegistry.set(agent.instanceId, agent);
}

// 4. Pool Agents - Treasury (2 instances)
for (let i = 1; i <= 2; i++) {
  const agent = createAgentRecord({
    instanceId: `treasury-agent-${i}`,
    name: `Treasury #${i}`,
    role: "finance",
    skills: ["treasury", "budget"],
    usdcBalance: 50.00,
    bidStrategy: "standard",
    poolType: "treasury"
  });
  agentRegistry.set(agent.instanceId, agent);
}

// 5. Pool Agents - Judge (2 instances)
for (let i = 1; i <= 2; i++) {
  const agent = createAgentRecord({
    instanceId: `judge-agent-${i}`,
    name: `Judge #${i}`,
    role: "meta",
    skills: ["judging", "evaluation", "scoring"],
    usdcBalance: 10.00,
    bidStrategy: "premium",
    poolType: "judge"
  });
  agentRegistry.set(agent.instanceId, agent);
}

// 6. Pool Agents - Bank (2 instances) - Phase 7 addition
for (let i = 1; i <= 2; i++) {
  const agent = createAgentRecord({
    instanceId: `bank-agent-${i}`,
    name: `Bank Agent #${i}`,
    role: "finance",
    skills: ["lending", "credit"],
    usdcBalance: 100.00,
    bidStrategy: "standard",
    poolType: "bank"
  });
  agentRegistry.set(agent.instanceId, agent);
}

// 7. Pool Agents - Guild Coordinator (1 instance) - Phase 7 addition
const guildCoordinator = createAgentRecord({
  instanceId: "guild-coordinator",
  name: "Guild Coordinator",
  role: "meta",
  skills: ["guild-coordination"],
  usdcBalance: 10.00,
  bidStrategy: "standard",
  poolType: "guild"
});
agentRegistry.set(guildCoordinator.instanceId, guildCoordinator);

// Specialist Worker Agents (Expanded Roster with 2-3 instances per skill)
const specialistsData: Array<{
  instanceId: string;
  name: string;
  role: AgentRole;
  skills: string[];
  bidStrategy: BidStrategy;
  usdcBalance: number;
}> = [
  // WRITERS (3)
  { instanceId: "writer-alex", name: "Alex (Writer)", role: "producer", skills: ["writing", "storytelling", "blog-posts", "creative"], bidStrategy: "standard", usdcBalance: 0.05 },
  { instanceId: "writer-maya", name: "Maya (Writer)", role: "producer", skills: ["writing", "storytelling", "blog-posts", "creative"], bidStrategy: "premium", usdcBalance: 0.05 },
  { instanceId: "writer-sam", name: "Sam (Writer)", role: "producer", skills: ["writing", "storytelling", "blog-posts", "creative"], bidStrategy: "aggressive", usdcBalance: 0.05 },

  // RESEARCHERS (3)
  { instanceId: "researcher-priya", name: "Priya (Researcher)", role: "producer", skills: ["research", "summarization", "fact-finding"], bidStrategy: "standard", usdcBalance: 0.05 },
  { instanceId: "researcher-leo", name: "Leo (Researcher)", role: "producer", skills: ["research", "summarization", "fact-finding"], bidStrategy: "aggressive", usdcBalance: 0.05 },
  { instanceId: "researcher-nina", name: "Nina (Researcher)", role: "producer", skills: ["research", "summarization", "fact-finding"], bidStrategy: "premium", usdcBalance: 0.05 },

  // DATA ANALYSTS (2)
  { instanceId: "analyst-kai", name: "Kai (Analyst)", role: "producer", skills: ["data", "statistics", "market-research", "analysis"], bidStrategy: "premium", usdcBalance: 0.05 },
  { instanceId: "analyst-zoe", name: "Zoe (Analyst)", role: "producer", skills: ["data", "statistics", "market-research", "analysis"], bidStrategy: "standard", usdcBalance: 0.05 },

  // CODERS (2)
  { instanceId: "coder-dev", name: "Dev (Coder)", role: "producer", skills: ["code", "programming", "scripts", "automation"], bidStrategy: "premium", usdcBalance: 0.05 },
  { instanceId: "coder-aria", name: "Aria (Coder)", role: "producer", skills: ["code", "programming", "scripts", "automation"], bidStrategy: "standard", usdcBalance: 0.05 },

  // TRANSLATORS (2)
  { instanceId: "translator-omar", name: "Omar (Translator)", role: "producer", skills: ["translation", "localization", "multilingual"], bidStrategy: "aggressive", usdcBalance: 0.05 },
  { instanceId: "translator-yuki", name: "Yuki (Translator)", role: "producer", skills: ["translation", "localization", "multilingual"], bidStrategy: "standard", usdcBalance: 0.05 },

  // SUMMARIZERS (2)
  { instanceId: "summarizer-finn", name: "Finn (Summarizer)", role: "producer", skills: ["summarization", "condensing", "tldr"], bidStrategy: "aggressive", usdcBalance: 0.05 },
  { instanceId: "summarizer-lia", name: "Lia (Summarizer)", role: "producer", skills: ["summarization", "condensing", "tldr"], bidStrategy: "standard", usdcBalance: 0.05 },

  // COPYWRITERS (2)
  { instanceId: "copy-jade", name: "Jade (Copywriter)", role: "producer", skills: ["copywriting", "marketing", "ads", "persuasion"], bidStrategy: "standard", usdcBalance: 0.05 },
  { instanceId: "copy-rex", name: "Rex (Copywriter)", role: "producer", skills: ["copywriting", "marketing", "ads", "persuasion"], bidStrategy: "aggressive", usdcBalance: 0.05 },

  // SEO SPECIALISTS (2)
  { instanceId: "seo-nova", name: "Nova (SEO)", role: "producer", skills: ["seo", "keywords", "optimization", "search"], bidStrategy: "aggressive", usdcBalance: 0.05 },
  { instanceId: "seo-blaze", name: "Blaze (SEO)", role: "producer", skills: ["seo", "keywords", "optimization", "search"], bidStrategy: "standard", usdcBalance: 0.05 },

  // TEXT ILLUSTRATORS (2)
  { instanceId: "illus-sage", name: "Sage (Illustrator)", role: "producer", skills: ["descriptions", "visual-writing", "imagery"], bidStrategy: "standard", usdcBalance: 0.05 },
  { instanceId: "illus-ember", name: "Ember (Illustrator)", role: "producer", skills: ["descriptions", "visual-writing", "imagery"], bidStrategy: "aggressive", usdcBalance: 0.05 },

  // EDITORS (2)
  { instanceId: "editor-quinn", name: "Quinn (Editor)", role: "verifier", skills: ["editing", "proofreading", "grammar", "polish"], bidStrategy: "standard", usdcBalance: 0.05 },
  { instanceId: "editor-blake", name: "Blake (Editor)", role: "verifier", skills: ["editing", "proofreading", "grammar", "polish"], bidStrategy: "premium", usdcBalance: 0.05 },

  // FACT CHECKERS (2)
  { instanceId: "fact-river", name: "River (Fact Checker)", role: "verifier", skills: ["fact-checking", "verification", "accuracy"], bidStrategy: "premium", usdcBalance: 0.05 },
  { instanceId: "fact-dawn", name: "Dawn (Fact Checker)", role: "verifier", skills: ["fact-checking", "verification", "accuracy"], bidStrategy: "standard", usdcBalance: 0.05 },

  // QA TESTERS (2)
  { instanceId: "qa-storm", name: "Storm (QA)", role: "verifier", skills: ["testing", "quality-assurance", "review"], bidStrategy: "standard", usdcBalance: 0.05 },
  { instanceId: "qa-pixel", name: "Pixel (QA)", role: "verifier", skills: ["testing", "quality-assurance", "review"], bidStrategy: "aggressive", usdcBalance: 0.05 },

  // COMPLIANCE (2)
  { instanceId: "comply-atlas", name: "Atlas (Compliance)", role: "verifier", skills: ["compliance", "legal", "policy"], bidStrategy: "premium", usdcBalance: 0.05 },
  { instanceId: "comply-vera", name: "Vera (Compliance)", role: "verifier", skills: ["compliance", "legal", "policy"], bidStrategy: "standard", usdcBalance: 0.05 },

  // NEGOTIATORS (2)
  { instanceId: "nego-rex", name: "Rex (Negotiator)", role: "finance", skills: ["negotiation", "pricing", "counter-offer"], bidStrategy: "aggressive", usdcBalance: 0.05 },
  { instanceId: "nego-sky", name: "Sky (Negotiator)", role: "finance", skills: ["negotiation", "pricing", "counter-offer"], bidStrategy: "standard", usdcBalance: 0.05 },

  // REPUTATION TRACKERS (1)
  { instanceId: "reputation-agent", name: "Reputation Tracker", role: "meta", skills: ["reputation", "leaderboard", "scoring"], bidStrategy: "standard", usdcBalance: 0.05 }
];

for (const sp of specialistsData) {
  const agent = createAgentRecord({
    instanceId: sp.instanceId,
    name: sp.name,
    role: sp.role,
    skills: sp.skills,
    usdcBalance: sp.usdcBalance,
    bidStrategy: sp.bidStrategy,
    poolType: null
  });
  agentRegistry.set(agent.instanceId, agent);
}

// 2 Already Existing agents (to make exactly 33 in Phase 7)
const existingAgents = [
  {
    instanceId: "master-agent",
    name: "Master Agent",
    role: "meta" as AgentRole,
    skills: ["orchestration", "coordination"],
    usdcBalance: 100.00,
    bidStrategy: "standard" as BidStrategy,
    poolType: null
  },
  {
    instanceId: "research-agent",
    name: "Research Agent",
    role: "producer" as AgentRole,
    skills: ["research", "fact-finding"],
    usdcBalance: 10.00,
    bidStrategy: "standard" as BidStrategy,
    poolType: null
  }
];

for (const ex of existingAgents) {
  const agent = createAgentRecord({
    instanceId: ex.instanceId,
    name: ex.name,
    role: ex.role,
    skills: ex.skills,
    usdcBalance: ex.usdcBalance,
    bidStrategy: ex.bidStrategy,
    poolType: null
  });
  agentRegistry.set(agent.instanceId, agent);
}

console.log(`💾 [agentRegistry] Loaded exactly ${agentRegistry.size} agents for Phase 7.`);

// ── Exported Registry Functions ──────────────────────────────────────────────

export function getAgent(instanceId: string): Agent | undefined {
  console.log(`🔍 [getAgent] Starting lookup for: ${instanceId}`);
  const agent = agentRegistry.get(instanceId);
  console.log(`🔍 [getAgent] Finished lookup for: ${instanceId} (found: ${!!agent})`);
  return agent;
}

// ── Bid Race Condition Prevention (Bug Fix 3) ────────────────────────────────
// pendingLocks tracks instanceIds currently in bid evaluation.
// Before marking an agent busy for a bid, check !pendingLocks.has(instanceId).
export const pendingLocks: Set<string> = new Set();

export function updateAgent(instanceId: string, updates: Partial<Agent>): void {
  console.log(`🔄 [updateAgent] Starting update for: ${instanceId}`);
  const agent = agentRegistry.get(instanceId);
  if (agent) {
    Object.assign(agent, updates);
    console.log(`🔄 [updateAgent] Finished update for: ${instanceId}. New status: ${agent.status}, balance: ${agent.usdcBalance}`);
    // 🔥 Fire-and-forget Firebase sync — never awaited, never blocks economy loop
    updateAgentFields(instanceId, updates).catch(console.error);
  } else {
    console.log(`⚠️ [updateAgent] Finished update: Agent ${instanceId} not found.`);
  }
}

export function getAvailableAgentsForSkill(skill: string): Agent[] {
  console.log(`🎯 [getAvailableAgentsForSkill] Starting search for skill: ${skill}`);
  const matched: Agent[] = [];
  for (const agent of agentRegistry.values()) {
    if (agent.skills.includes(skill)) {
      matched.push(agent);
    }
  }
  console.log(`🎯 [getAvailableAgentsForSkill] Finished search: found ${matched.length} agents for skill: ${skill}`);
  return matched;
}

export function getFreePoolAgent(poolType: string): Agent | null {
  console.log(`🌊 [getFreePoolAgent] Starting search for poolType: ${poolType}`);
  for (const agent of agentRegistry.values()) {
    if (agent.poolType === poolType && agent.status === "idle") {
      console.log(`🌊 [getFreePoolAgent] Finished search: found idle agent ${agent.instanceId}`);
      return agent;
    }
  }
  console.log(`🌊 [getFreePoolAgent] Finished search: no idle agent found for poolType: ${poolType}`);
  return null;
}

export function getAllAgents(): Agent[] {
  console.log("📋 [getAllAgents] Starting retrieval of all agents...");
  const agents = Array.from(agentRegistry.values());
  console.log(`📋 [getAllAgents] Finished retrieval: returned ${agents.length} agents.`);
  return agents;
}

export function getAgentStats(): { idle: number; busy: number; total: number } {
  console.log("📊 [getAgentStats] Starting calculation...");
  let idle = 0;
  let busy = 0;
  for (const agent of agentRegistry.values()) {
    if (agent.status === "idle") idle++;
    else busy++;
  }
  const stats = { idle, busy, total: agentRegistry.size };
  console.log(`📊 [getAgentStats] Finished calculation: idle=${idle}, busy=${busy}, total=${agentRegistry.size}`);
  return stats;
}
