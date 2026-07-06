import crypto from "crypto";
import { Task, Agent, Guild, EconomyStats } from "./types.js";
import {
  getAllAgents,
  getAgent,
  updateAgent,
  getFreePoolAgent,
  getAvailableAgentsForSkill
} from "./agentRegistry.js";
import {
  createTask,
  updateTask,
  getAllTasks
} from "./taskQueue.js";
import { taskPicker } from "./taskTemplates.js";
import { runBiddingRound } from "./biddingEngine.js";
import { executeWork } from "./workExecutor.js";
import { makeNanopayment } from "../../circle/paymentService.js";
import {
  saveTask,
  updateTaskFields,
  saveTransaction,
  saveEconomySnapshot,
  saveGuildEvent,
  saveLoanRecord,
  saveCourtEvent
} from "../firebase/taskRepository.js";
import { saveAgent, saveAllAgents } from "../firebase/agentRepository.js";
import { askClaude } from "../llm/claudeClient.js";


console.log("🌐 [economyLoop] Module loading started (Phase 7 + Section 4/5/6 upgrades)...");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const randomHex = (n: number) =>
  [...Array(n)].map(() =>
    Math.floor(Math.random() * 16).toString(16)).join('');

// ── Guild Configuration ───────────────────────────────────────────────────────

const GUILDS: Guild[] = [
  {
    id: "tech-guild",
    name: "Tech Alliance",
    skills: ["code", "testing", "data"],
    memberInstanceIds: ["coder-dev", "coder-aria", "qa-storm", "qa-pixel", "analyst-kai", "analyst-zoe"],
    treasuryUSDC: 50.00
  },
  {
    id: "creative-guild",
    name: "Creative Syndicate",
    skills: ["writing", "copywriting", "translation"],
    memberInstanceIds: ["writer-alex", "writer-maya", "writer-sam", "copy-jade", "copy-rex", "translator-omar", "translator-yuki"],
    treasuryUSDC: 50.00
  },
  {
    id: "analytics-guild",
    name: "Data Oracle Guild",
    skills: ["data", "research", "summarization"],
    memberInstanceIds: ["analyst-kai", "analyst-zoe", "researcher-nova", "researcher-echo", "summarizer-finn", "summarizer-lia"],
    treasuryUSDC: 40.00
  },
  {
    id: "legal-guild",
    name: "Compliance Collective",
    skills: ["compliance", "fact-checking", "editing"],
    memberInstanceIds: ["judge-prime", "judge-apex", "fact-felix", "fact-iris", "editor-will", "editor-grace"],
    treasuryUSDC: 45.00
  },
  {
    id: "qa-guild",
    name: "Quality Vanguard",
    skills: ["testing", "judging", "fact-checking"],
    memberInstanceIds: ["qa-storm", "qa-pixel", "judge-prime", "judge-apex", "fact-felix", "fact-iris"],
    treasuryUSDC: 35.00
  }
];

// ── Task Templates (Section 4: new probability distribution) ─────────────────

// 50% — GUILD TRIGGER TASKS
const GUILD_TASKS = [
  {
    title: "Build and deploy a full DeFi protocol with audit and marketing",
    description: "Requires combined expertise in smart contract development, compliance audit, and marketing copy",
    requiredSkill: "code",
    budgetUSDC: 18.00,
    taskVariant: "guild" as const
  },
  {
    title: "Create a multilingual smart contract compliance report",
    description: "Full compliance analysis translated into 3 languages with legal review",
    requiredSkill: "compliance",
    budgetUSDC: 15.00,
    taskVariant: "guild" as const
  },
  {
    title: "Develop and SEO-optimize a complete stablecoin whitepaper",
    description: "Research, write, and fully optimize a whitepaper for Circle's stablecoin",
    requiredSkill: "writing",
    budgetUSDC: 16.00,
    taskVariant: "guild" as const
  },
  {
    title: "Research, analyze and visualize Arc blockchain market data",
    description: "Deep research combined with statistical analysis and visual descriptions",
    requiredSkill: "research",
    budgetUSDC: 14.00,
    taskVariant: "guild" as const
  },
  {
    title: "Build and fact-check an automated crypto news summarizer",
    description: "Coding project with integrated fact-checking and QA testing pipeline",
    requiredSkill: "code",
    budgetUSDC: 17.00,
    taskVariant: "guild" as const
  },
  {
    title: "Guild-produced multilingual USDC education series",
    description: "Writing, translation, and SEO guild collaboration to produce a 5-part content series",
    requiredSkill: "writing",
    budgetUSDC: 20.00,
    taskVariant: "guild" as const
  },
  {
    title: "Collaborative on-chain data pipeline and visualization",
    description: "Data analytics guild builds an end-to-end pipeline from raw chain data to insights",
    requiredSkill: "data",
    budgetUSDC: 19.00,
    taskVariant: "guild" as const
  },
  {
    title: "Guild Treasury Governance Document and Compliance Review",
    description: "Legal, compliance and writing specialists jointly produce governance docs",
    requiredSkill: "compliance",
    budgetUSDC: 17.50,
    taskVariant: "guild" as const
  },
  {
    title: "Multi-agent coordinated crypto market intelligence brief",
    description: "Research, fact-check, summarize and edit a full market intelligence report",
    requiredSkill: "research",
    budgetUSDC: 15.50,
    taskVariant: "guild" as const
  },
  {
    title: "Tech Alliance deploys and tests Circle payment SDK",
    description: "Guild: code + QA + compliance review of Circle SDK integration end-to-end",
    requiredSkill: "code",
    budgetUSDC: 21.00,
    taskVariant: "guild" as const
  },
  {
    title: "Creative Syndicate produces a viral DeFi marketing campaign",
    description: "Writing, copywriting, and translation guild delivers a 3-language marketing blitz",
    requiredSkill: "copywriting",
    budgetUSDC: 18.50,
    taskVariant: "guild" as const
  },
  {
    title: "Cross-guild audit of NexusAgent autonomous economic loop",
    description: "All guilds contribute: research analysis, compliance review, code audit, fact-checking",
    requiredSkill: "judging",
    budgetUSDC: 24.00,
    taskVariant: "guild" as const
  }
];

// 30% — COURT APPEAL TASKS
const COURT_TASKS = [
  {
    title: "Audit and certify the NexusAgent smart contract for legal compliance",
    description: "Full legal and technical audit — must meet the highest compliance standards",
    requiredSkill: "compliance",
    budgetUSDC: 15.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Fact-check and certify all claims in the Circle Arc whitepaper",
    description: "Rigorous fact-checking with certified source verification for every claim",
    requiredSkill: "fact-checking",
    budgetUSDC: 12.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Evaluate and formally rate the quality of 10 agent outputs",
    description: "Comprehensive judging session requiring expert-level evaluation skills",
    requiredSkill: "judging",
    budgetUSDC: 14.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Supreme Court audit of multi-agent consensus algorithm",
    description: "High-stakes compliance review with potential legal implications",
    requiredSkill: "compliance",
    budgetUSDC: 18.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Appeal: disputed NexusAgent quality assessment overruled",
    description: "Agent disputes a low quality score — Supreme Court must review and rule",
    requiredSkill: "judging",
    budgetUSDC: 13.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Supreme Court hearing on AI-agent payment escrow dispute",
    description: "Escrow funds contested between producer and client — justices must rule",
    requiredSkill: "compliance",
    budgetUSDC: 16.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Formal judicial review: guild task deliverable quality",
    description: "Guild output challenged by broker — Supreme Court panel reviews evidence",
    requiredSkill: "judging",
    budgetUSDC: 17.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Constitutional ruling on inter-agent loan default rights",
    description: "Landmark case: agent defaulted on loan — bank vs agent rights adjudicated",
    requiredSkill: "compliance",
    budgetUSDC: 19.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Appellate review of subcontracted work quality dispute",
    description: "Primary agent challenges subcontractor quality score before Supreme Court",
    requiredSkill: "judging",
    budgetUSDC: 11.00,
    taskVariant: "court" as const,
    isAppeal: true
  },
  {
    title: "Emergency injunction: halt agent economy loop ruling",
    description: "Critical court order sought to freeze task execution pending outcome review",
    requiredSkill: "compliance",
    budgetUSDC: 22.00,
    taskVariant: "court" as const,
    isAppeal: true
  }
];

// 20% — SUBCONTRACT TASKS
const SUBCONTRACT_TASKS = [
  {
    title: "Write and professionally edit a 2000-word DeFi investment guide",
    description: "Long-form writing with professional editorial review and quality verification",
    requiredSkill: "writing",
    budgetUSDC: 10.00,
    taskVariant: "subcontract" as const
  },
  {
    title: "Code and QA test a Circle SDK integration script",
    description: "Full coding project with independent QA testing and verification",
    requiredSkill: "code",
    budgetUSDC: 12.00,
    taskVariant: "subcontract" as const
  },
  {
    title: "Research and editor-verified competitive landscape analysis",
    description: "Deep research with editorial quality check by a second specialist",
    requiredSkill: "research",
    budgetUSDC: 9.00,
    taskVariant: "subcontract" as const
  },
  {
    title: "Build and compliance-verify an on-chain data aggregator",
    description: "Developer builds, compliance agent verifies regulatory alignment",
    requiredSkill: "code",
    budgetUSDC: 13.50,
    taskVariant: "subcontract" as const
  },
  {
    title: "Write and fact-check a crypto regulation breakdown article",
    description: "Writer drafts, fact-checker verifies all regulatory claims",
    requiredSkill: "writing",
    budgetUSDC: 11.00,
    taskVariant: "subcontract" as const
  },
  {
    title: "Translate and SEO-optimize the NexusAgent pitch deck",
    description: "Translator localizes, SEO agent optimizes for search ranking",
    requiredSkill: "translation",
    budgetUSDC: 10.50,
    taskVariant: "subcontract" as const
  },
  {
    title: "Analyze and copywrite Q3 USDC trading volume insights",
    description: "Analyst extracts insights, copywriter turns them into compelling narrative",
    requiredSkill: "data",
    budgetUSDC: 11.50,
    taskVariant: "subcontract" as const
  },
  {
    title: "Test and formally document a new DeFi smart contract API",
    description: "QA agent tests, technical writer documents all endpoints and behaviors",
    requiredSkill: "testing",
    budgetUSDC: 12.50,
    taskVariant: "subcontract" as const
  }
];

// 10% — EDUCATION TASKS
const EDUCATION_TASKS = [
  {
    title: "Advanced blockchain protocol architecture design",
    description: "Complex task requiring Advanced Certification — architecture + compliance",
    requiredSkill: "code",
    budgetUSDC: 17.00,
    taskVariant: "education" as const
  },
  {
    title: "Certified multilingual DeFi content localization project",
    description: "Advanced translation requiring professional certification in financial content",
    requiredSkill: "translation",
    budgetUSDC: 19.00,
    taskVariant: "education" as const
  }
];

// 10% — STANDARD TASKS
const STANDARD_TASKS = [
  { title: "Write DeFi trends blog post", description: "500 word post covering latest DeFi innovations", requiredSkill: "writing", budgetUSDC: 8.00 },
  { title: "Research stablecoin regulations 2026", description: "Survey of current global regulatory landscape", requiredSkill: "research", budgetUSDC: 6.00 },
  { title: "Analyze USDC market data Q2 2026", description: "Statistical breakdown of USDC volume and flows", requiredSkill: "data", budgetUSDC: 10.00 },
  { title: "Translate Arc whitepaper to Spanish", description: "Full localization of technical document", requiredSkill: "translation", budgetUSDC: 5.00 },
  { title: "Write landing page copy for Arc", description: "Conversion-focused copy for developer audience", requiredSkill: "copywriting", budgetUSDC: 7.00 },
  { title: "SEO audit of Circle developer docs", description: "Keyword analysis and optimization recommendations", requiredSkill: "seo", budgetUSDC: 4.00 },
  { title: "Summarize top 10 crypto news today", description: "Concise TLDR of major headlines", requiredSkill: "summarization", budgetUSDC: 3.00 },
  { title: "Fact-check DeFi whitepaper claims", description: "Verify all statistical claims against sources", requiredSkill: "fact-checking", budgetUSDC: 8.00 },
  { title: "QA test bounty submission form", description: "End to end testing of form validation", requiredSkill: "testing", budgetUSDC: 5.00 },
  { title: "Edit NexusAgent pitch deck copy", description: "Grammar, flow, and clarity improvements", requiredSkill: "editing", budgetUSDC: 6.00 },
  { title: "Describe Arc blockchain visually", description: "Vivid text description for non-technical audience", requiredSkill: "descriptions", budgetUSDC: 4.00 },
  { title: "Code USDC balance checker script", description: "Node.js script using Circle SDK", requiredSkill: "code", budgetUSDC: 12.00 },
  { title: "Compliance check smart contract terms", description: "Legal and policy review of contract clauses", requiredSkill: "compliance", budgetUSDC: 9.00 }
];

const MASTER_SKILLS = [
  "writing", "storytelling", "blog-posts", "creative",
  "research", "summarization", "fact-finding",
  "data", "statistics", "market-research", "analysis",
  "code", "programming", "scripts", "automation",
  "translation", "localization", "multilingual",
  "copywriting", "marketing", "ads", "persuasion",
  "seo", "keywords", "optimization", "search",
  "descriptions", "visual-writing", "imagery",
  "editing", "proofreading", "grammar", "polish",
  "fact-checking", "verification", "accuracy",
  "testing", "quality-assurance", "review",
  "compliance", "legal", "policy"
];

// ── State Variables ───────────────────────────────────────────────────────────

let isRunning: boolean = false;
let dispatcherInterval: NodeJS.Timeout | null = null;
let taskCounter: number = 0;
let startedAt: number | null = null;
let ioInstance: any = null;
let totalLoansDisbursed: number = 0;

// Section 5: Concurrent task management
const MAX_CONCURRENT_TASKS = 4;
const activeTasks: Set<string> = new Set();

// Education system: tracks agents currently studying (max 7)
const MAX_EDUCATION_SLOTS = 7;
const educatingAgents: Set<string> = new Set();

// ── Exported State Getter ─────────────────────────────────────────────────────

export const isEconomyRunning = (): boolean => isRunning;

// ── Core Loop Functions ───────────────────────────────────────────────────────

export function getEconomyStats(): EconomyStats {
  const agents = getAllAgents();
  const tasks = getAllTasks();

  let idleAgents = 0;
  let busyAgents = 0;
  for (const agent of agents) {
    if (agent.status === "idle") idleAgents++;
    else busyAgents++;
  }

  let completedTasks = 0;
  let failedTasks = 0;
  let totalUSDCFlowed = 0;

  for (const task of tasks) {
    if (task.status === "complete") {
      completedTasks++;
      totalUSDCFlowed += task.budgetUSDC;
    } else if (task.status === "failed") {
      failedTasks++;
    }
  }

  let topEarnerAgent: Agent | null = null;
  for (const agent of agents) {
    if (agent.totalEarned > 0) {
      if (!topEarnerAgent || agent.totalEarned > topEarnerAgent.totalEarned) {
        topEarnerAgent = agent;
      }
    }
  }

  const topEarner = topEarnerAgent
    ? { name: topEarnerAgent.name, amount: topEarnerAgent.totalEarned }
    : null;

  const uptimeSeconds = startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0;
  const totalGuildCapital = GUILDS.reduce((sum, g) => sum + g.treasuryUSDC, 0);

  const stats: EconomyStats = {
    totalAgents: agents.length,
    idleAgents,
    busyAgents,
    totalTasksSpawned: tasks.length,
    completedTasks,
    failedTasks,
    activeTasks: activeTasks.size,
    totalUSDCFlowed: parseFloat(totalUSDCFlowed.toFixed(6)),
    topEarner,
    isRunning,
    uptimeSeconds,
    totalLoansDisbursed,
    totalGuildCapital: parseFloat(totalGuildCapital.toFixed(6))
  };

  saveEconomySnapshot(stats).catch(console.error);

  return stats;
}

export function startEconomy(io: any): void {
  console.log("🌐 [startEconomy] Starting the economy engine loop...");

  if (isRunning) {
    console.warn("⚠️ [startEconomy] Economy loop is already running.");
    return;
  }

  isRunning = true;
  startedAt = Date.now();
  ioInstance = io;

  io.emit("economy:started", {
    agentCount: 49,
    message: "NexusAgent Economy is LIVE. 49 agents are now autonomous."
  });

  console.log("🌐 Economy STARTED — 49 agents online");

  // Fire initial batch immediately
  setTimeout(async () => {
    if (isRunning) {
      await spawnConcurrentBatch(ioInstance);
    }
  }, 500);

  // Section 5: Task dispatcher — every 20 seconds
  dispatcherInterval = setInterval(async () => {
    if (!isRunning) return;
    await spawnConcurrentBatch(ioInstance);
  }, 20000);

  console.log("🌐 [startEconomy] Finished starting economy engine.");
}

export function stopEconomy(): void {
  console.log("🛑 [stopEconomy] Stopping the economy engine loop...");

  if (!isRunning) {
    console.warn("⚠️ [stopEconomy] Economy loop was not running.");
    return;
  }

  isRunning = false;
  if (dispatcherInterval) {
    clearInterval(dispatcherInterval);
    dispatcherInterval = null;
  }

  ioInstance?.emit("economy:stopped", {});
  console.log("🛑 Economy STOPPED");
}

// ── Section 5: Concurrent Batch Spawner ──────────────────────────────────────

async function spawnConcurrentBatch(io: any): Promise<void> {
  const slotsAvailable = MAX_CONCURRENT_TASKS - activeTasks.size;

  if (slotsAvailable <= 0) {
    console.log(`⏳ Task queue full (${activeTasks.size}/${MAX_CONCURRENT_TASKS}). Waiting for slot...`);
    return;
  }

  const hiringAgents = getAllAgents().filter(
    a => a.poolType === "hiring" && a.status === "idle"
  );
  const tasksToSpawn = Math.min(slotsAvailable, hiringAgents.length, 3);

  if (tasksToSpawn === 0) {
    console.log("⏳ No free hiring agents for new tasks.");
    return;
  }

  console.log(`🚀 Spawning ${tasksToSpawn} concurrent tasks (${activeTasks.size}/${MAX_CONCURRENT_TASKS} active)...`);

  // Fire tasks concurrently with random jitter
  const promises: Promise<void>[] = [];
  for (let i = 0; i < tasksToSpawn; i++) {
    const jitter = Math.random() * 3000;
    promises.push(
      sleep(jitter).then(() => spawnAndRunTask(io))
    );
  }
  // Fire all without awaiting — truly concurrent
  Promise.all(promises).catch(err => console.error("❌ Concurrent task error:", err));
}

// ── Backward compat export ────────────────────────────────────────────────────
export function scheduleNextTask(): void {
  // No-op — replaced by dispatcherInterval in startEconomy
}

// ── Task Variant Selector (Section 4) ────────────────────────────────────────

function selectTaskTemplate(): {
  title: string;
  description: string;
  requiredSkill: string;
  budgetUSDC: number;
  taskVariant: "normal" | "guild" | "court" | "subcontract" | "loan" | "education";
  isAppeal?: boolean;
} {
  const rand = Math.random();

  if (rand < 0.50) {
    // 50% — GUILD TRIGGER TASK
    const t = GUILD_TASKS[Math.floor(Math.random() * GUILD_TASKS.length)];
    const budget = parseFloat((Math.random() * 8 + 12).toFixed(2)); // 12-20
    return { ...t, budgetUSDC: budget };
  } else if (rand < 0.80) {
    // 30% — COURT APPEAL TASK
    const t = COURT_TASKS[Math.floor(Math.random() * COURT_TASKS.length)];
    const budget = parseFloat((Math.random() * 8 + 10).toFixed(2)); // 10-18
    return { ...t, budgetUSDC: budget };
  } else {
    // 20% — SUBCONTRACT TASK
    const t = SUBCONTRACT_TASKS[Math.floor(Math.random() * SUBCONTRACT_TASKS.length)];
    const budget = parseFloat((Math.random() * 6 + 8).toFixed(2)); // 8-14
    return { ...t, budgetUSDC: budget };
  }
}

// ── Main Task Execution Function ──────────────────────────────────────────────

export async function spawnAndRunTask(io: any): Promise<void> {
  console.log("🚀 [spawnAndRunTask] Starting task spawner workflow...");

  let loanTriggered = false;
  let educationTriggered = false;

  // ── 1. Bank Loan Processing Check ─────────────────────────────────────────
  const allAgents = getAllAgents();
  for (const agent of allAgents) {
    if (agent.status === "idle" && agent.usdcBalance < 2.00 && agent.role === "producer" && agent.loanBalance === 0) {
      const bankAgent = getFreePoolAgent("bank");
      if (bankAgent) {
        let interestRate = 0.15;
        if (agent.reputation >= 90) interestRate = 0.05;
        else if (agent.reputation < 50) interestRate = 0.25;

        updateAgent(bankAgent.instanceId, { status: "busy" });

        const payResult = await makeNanopayment(
          5.00,
          agent.walletAddress,
          bankAgent.walletId,
          `Disburse loan: Bank to ${agent.instanceId.slice(0, 10)}`
        );

        updateAgent(agent.instanceId, {
          usdcBalance: parseFloat((agent.usdcBalance + 5.00).toFixed(6)),
          loanBalance: 5.00,
          loanInterestRate: interestRate
        });

        updateAgent(bankAgent.instanceId, {
          usdcBalance: parseFloat((bankAgent.usdcBalance - 5.00).toFixed(6)),
          status: "idle"
        });

        totalLoansDisbursed += 5.00;
        loanTriggered = true;

        // Section 6: emit loan_issued event
        io.emit("economy:loan_issued", {
          agentId: agent.instanceId,
          agentName: agent.name,
          amount: 5.00,
          interestRate,
          taskId: "pre-task"
        });

        // Backward compat
        io.emit("economy:loan_disbursed", {
          agentId: agent.instanceId,
          agentName: agent.name,
          amount: 5.00,
          interestRate,
          bankId: bankAgent.instanceId,
          txHash: payResult.txHash,
          isMock: payResult.isMock
        });
        console.log(`🏦 Loan of 5.00 USDC disbursed to ${agent.name} at rate ${interestRate}. TxHash: ${payResult.txHash}`);
      }
    }
  }

  // ── 2. Education Upgrade Check ─────────────────────────────────────────────
  for (const agent of allAgents) {
    // Agent must be idle, have enough balance, be a producer, not already studying, and slots available
    if (
      agent.status === "idle" &&
      agent.usdcBalance >= 12.00 &&
      agent.role === "producer" &&
      !educatingAgents.has(agent.instanceId) &&
      educatingAgents.size < MAX_EDUCATION_SLOTS
    ) {
      const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
      if (bank) {
        // Determine education level + duration
        const repGain = agent.certifications.includes("Advanced Certification") ? 1 : 3;
        // +1 rep = 5-15s, +3 rep = 15-40s
        const durationMs = repGain === 1
          ? Math.floor(Math.random() * 10000 + 5000)   // 5-15s
          : Math.floor(Math.random() * 25000 + 15000); // 15-40s

        const missingSkills = MASTER_SKILLS.filter(s => !agent.skills.includes(s));
        const newSkill = missingSkills.length > 0
          ? missingSkills[Math.floor(Math.random() * missingSkills.length)]
          : "advanced-specialization";

        // Lock agent into studying
        educatingAgents.add(agent.instanceId);
        updateAgent(agent.instanceId, { status: "educating" });

        // Emit education_started with duration for frontend Education section
        io.emit("economy:education_started", {
          agentId: agent.instanceId,
          agentName: agent.name,
          skill: newSkill,
          repGain,
          durationMs,
          cost: 8.00,
          startedAt: Date.now()
        });
        console.log(`🎓 [Education Started] ${agent.name} studying "${newSkill}" for ${durationMs}ms (+${repGain} rep)`);

        // Study happens asynchronously — agent is locked during this time
        const studyAgent = agent;
        const studyBank = bank;
        sleep(durationMs).then(async () => {
          if (!educatingAgents.has(studyAgent.instanceId)) return; // Cancelled

          const payResult = await makeNanopayment(
            8.00,
            studyBank.walletAddress,
            studyAgent.walletId,
            `Education purchase by ${studyAgent.instanceId.slice(0, 10)}`
          );

          const newRep = Math.min(100, studyAgent.reputation + repGain);
          updateAgent(studyAgent.instanceId, {
            status: "idle",
            usdcBalance: parseFloat((studyAgent.usdcBalance - 8.00).toFixed(6)),
            totalSpent: parseFloat((studyAgent.totalSpent + 8.00).toFixed(6)),
            reputation: newRep,
            qualityOffset: studyAgent.qualityOffset + repGain,
            skills: [...studyAgent.skills, newSkill]
          });

          updateAgent(studyBank.instanceId, {
            usdcBalance: parseFloat((studyBank.usdcBalance + 8.00).toFixed(6))
          });

          educatingAgents.delete(studyAgent.instanceId);
          educationTriggered = true;

          io.emit("economy:education_complete", {
            agentId: studyAgent.instanceId,
            agentName: studyAgent.name,
            skill: newSkill,
            repGain,
            newReputation: newRep,
            cost: 8.00,
            txHash: payResult.txHash
          });

          io.emit("economy:education_purchased", {
            agentId: studyAgent.instanceId,
            agentName: studyAgent.name,
            skill: newSkill,
            cost: 8.00,
            newReputation: newRep,
            taskId: "education"
          });

          io.emit("economy:education_upgrade", {
            agentId: studyAgent.instanceId,
            agentName: studyAgent.name,
            cost: 8.00,
            newReputation: newRep,
            qualityOffset: studyAgent.qualityOffset + repGain,
            learnedSkill: newSkill,
            txHash: payResult.txHash,
            isMock: payResult.isMock
          });
          console.log(`🎓 [Education Complete] ${studyAgent.name} finished learning "${newSkill}" (+${repGain} rep)`);
        }).catch(err => console.error("❌ Education async error:", err));
      }
    }
  }

  // ── Advanced Certification Check ──────────────────────────────────────────
  for (const agent of allAgents) {
    if (agent.status === "idle" && agent.usdcBalance >= 25.00 && agent.role === "producer" && !agent.certifications.includes("Advanced Certification")) {
      const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
      if (bank) {
        const payResult = await makeNanopayment(
          15.00,
          bank.walletAddress,
          agent.walletId,
          `Advanced Cert: ${agent.instanceId.slice(0, 10)}`
        );

        const newRep = Math.min(100, agent.reputation + 10);
        updateAgent(agent.instanceId, {
          usdcBalance: parseFloat((agent.usdcBalance - 15.00).toFixed(6)),
          totalSpent: parseFloat((agent.totalSpent + 15.00).toFixed(6)),
          certifications: [...agent.certifications, "Advanced Certification"],
          reputation: newRep
        });

        updateAgent(bank.instanceId, {
          usdcBalance: parseFloat((bank.usdcBalance + 15.00).toFixed(6))
        });

        educationTriggered = true;

        io.emit("economy:education_purchased", {
          agentId: agent.instanceId,
          agentName: agent.name,
          skill: "Advanced Certification",
          cost: 15.00,
          newReputation: newRep,
          taskId: "certification"
        });

        io.emit("economy:certification_purchased", {
          agentId: agent.instanceId,
          agentName: agent.name,
          cost: 15.00,
          txHash: payResult.txHash
        });
        console.log(`🎓 Advanced Certification complete for ${agent.name}. TxHash: ${payResult.txHash}`);
      }
    }
  }

  // ── Guild-Funded Education ────────────────────────────────────────────────
  for (const guild of GUILDS) {
    if (guild.treasuryUSDC >= 20.00) {
      const idleMembers = guild.memberInstanceIds
        .map(id => getAgent(id)!)
        .filter(m => m && m.status === "idle");

      if (idleMembers.length > 0) {
        idleMembers.sort((a, b) => a.reputation - b.reputation);
        const sponsoredAgent = idleMembers[0];

        const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
        if (bank) {
          guild.treasuryUSDC = parseFloat((guild.treasuryUSDC - 12.00).toFixed(6));

          const payResult = await makeNanopayment(
            12.00,
            bank.walletAddress,
            getAgent("guild-coordinator")?.walletId || "0xmockguildcoordinator",
            `Guild sponsored education for ${sponsoredAgent.instanceId.slice(0, 10)}`
          );

          const missingSkills = MASTER_SKILLS.filter(s => !sponsoredAgent.skills.includes(s));
          const newSkill = missingSkills.length > 0
            ? missingSkills[Math.floor(Math.random() * missingSkills.length)]
            : "advanced-specialization";

          const newRep = Math.min(100, sponsoredAgent.reputation + 5);
          updateAgent(sponsoredAgent.instanceId, {
            reputation: newRep,
            qualityOffset: sponsoredAgent.qualityOffset + 3,
            skills: [...sponsoredAgent.skills, newSkill]
          });

          updateAgent(bank.instanceId, {
            usdcBalance: parseFloat((bank.usdcBalance + 12.00).toFixed(6))
          });

          educationTriggered = true;

          io.emit("economy:education_purchased", {
            agentId: sponsoredAgent.instanceId,
            agentName: sponsoredAgent.name,
            skill: newSkill,
            cost: 12.00,
            newReputation: newRep,
            taskId: "guild-sponsored"
          });

          io.emit("economy:guild_sponsorship", {
            guildId: guild.id,
            guildName: guild.name,
            agentId: sponsoredAgent.instanceId,
            agentName: sponsoredAgent.name,
            cost: 12.00,
            newSkill,
            txHash: payResult.txHash
          });
          console.log(`🎓 Guild ${guild.name} sponsored ${sponsoredAgent.name} to learn ${newSkill}.`);
        }
      }
    }
  }

  // ── 3. Select Task Template (100-task non-repeating deck via TaskPicker) ────
  const templateData = taskPicker.next();
  taskCounter++;

  const complexityTier: "easy" | "medium" | "complex" = templateData.tier || (
    templateData.budgetUSDC >= 14 ? "complex" :
    templateData.budgetUSDC >= 8 ? "medium" : "easy"
  );

  const task = createTask({
    title: templateData.title,
    description: templateData.description,
    requiredSkill: templateData.requiredSkill,
    budgetUSDC: templateData.budgetUSDC,
    postedBy: complexityTier === "complex" ? "system-market" : "agent-market",
    hiringAgentId: null,
    taskVariant: templateData.taskVariant,
    guildName: null,
    isAppeal: templateData.forceCourt ?? false,
    subcontractedTo: null,
    loanTriggered,
    educationTriggered
  });

  // Add to active tasks set (Section 5)
  activeTasks.add(task.id);

  // STEP 1 — Task spawned
  io.emit("economy:task_spawned", { task, tier: complexityTier });
  console.log(`📋 Task spawned: ${task.title} | Budget: ${task.budgetUSDC} USDC | Variant: ${templateData.taskVariant}`);

  // Section 4: emit guild_forming before bidding for guild tasks
  if (templateData.taskVariant === "guild") {
    io.emit("economy:guild_forming", {
      taskId: task.id,
      taskTitle: task.title,
      requiredSkill: task.requiredSkill
    });
  }

  await sleep(1500);

  // STEP 2 — Find hiring agent
  const hiringAgent = getFreePoolAgent("hiring");
  if (!hiringAgent) {
    console.log("⚠️ No hiring agents available, task queued as failed");
    updateTask(task.id, { status: "failed" });
    io.emit("economy:task_failed", { taskId: task.id, reason: "No hiring agents available" });
    activeTasks.delete(task.id);
    return;
  }

  updateAgent(hiringAgent.instanceId, { status: "busy" });
  updateTask(task.id, { hiringAgentId: hiringAgent.instanceId });
  task.hiringAgentId = hiringAgent.instanceId;

  io.emit("economy:hiring_agent_assigned", {
    taskId: task.id,
    agentId: hiringAgent.instanceId,
    agentName: hiringAgent.name
  });
  await sleep(1000);

  const baseSkill = task.requiredSkill.split('+')[0].trim();
  const allEligible = getAvailableAgentsForSkill(baseSkill);
  // Filter: only idle agents that are NOT currently studying
  let eligibleAgents = allEligible.filter(agent => agent.status === "idle" && !educatingAgents.has(agent.instanceId));

  // requiresCertification flag: if no certified agents available, trigger education purchase first
  if (templateData.requiresCertification || complexityTier === "complex") {
    const certifiedAgents = eligibleAgents.filter(a => a.certifications.includes("Advanced Certification"));
    if (certifiedAgents.length === 0 && eligibleAgents.length > 0) {
      // Trigger education purchase for the most suitable idle agent
      const topAgent = eligibleAgents.sort((a, b) => b.reputation - a.reputation)[0];
      const bank = getFreePoolAgent("bank");
      if (bank && topAgent.usdcBalance >= 12.00) {
        console.log(`🎓 [requiresCertification] Pre-bidding education for ${topAgent.name}...`);
        const payResult = await makeNanopayment(12.00, bank.walletAddress, topAgent.walletId, "Pre-cert education");
        updateAgent(topAgent.instanceId, {
          usdcBalance: parseFloat((topAgent.usdcBalance - 12.00).toFixed(6)),
          certifications: [...topAgent.certifications, "Advanced Certification"],
          reputation: Math.min(100, topAgent.reputation + 10),
          totalSpent: parseFloat((topAgent.totalSpent + 12.00).toFixed(6)),
        });
        updateAgent(bank.instanceId, { usdcBalance: parseFloat((bank.usdcBalance + 12.00).toFixed(6)) });
        io.emit("economy:education_purchased", {
          agentId: topAgent.instanceId, agentName: topAgent.name,
          skill: "Advanced Certification", cost: 12.00,
          newReputation: Math.min(100, topAgent.reputation + 10), taskId: task.id
        });
        io.emit("economy:certification_purchased", {
          agentId: topAgent.instanceId, agentName: topAgent.name, cost: 12.00, txHash: payResult?.txHash || "mock"
        });
        await sleep(1500);
        // Re-include this agent in the eligible set with certification
        eligibleAgents = allEligible.filter(a => a.status === "idle" &&
          (a.certifications.includes("Advanced Certification") || a.instanceId === topAgent.instanceId)
        );
      } else {
        console.log(`🔒 Education task requires Advanced Certification — filtering to certified agents only.`);
        eligibleAgents = certifiedAgents;
      }
    } else {
      eligibleAgents = certifiedAgents;
    }
  }


  // preferLowBalance flag: sort eligible agents to prioritize low-balance agents so loan mechanics trigger
  if (templateData.preferLowBalance) {
    eligibleAgents = eligibleAgents.sort((a, b) => a.usdcBalance - b.usdcBalance);
    console.log(`🏦 [preferLowBalance] Sorted ${eligibleAgents.length} agents by ascending balance for loan mechanic.`);
  }

  // ── Dynamic Guild Formation + forceGuild flag ─────────────────────────────
  let finalPrice = task.budgetUSDC;
  let winnerId = "";
  let isGuildProject = false;
  let guildTeammate: Agent | null = null;
  let matchingGuildObj: Guild | null = null;

  // forceGuild: always trigger guild formation regardless of skill matching
  const shouldForceGuild = templateData.forceGuild === true;
  // forceCourt: emit court appeal event and lower quality threshold
  const shouldForceCourt = templateData.forceCourt === true;
  // forceSubcontract: force a second agent to be subcontracted
  const shouldForceSubcontract = templateData.forceSubcontract === true;

  if (eligibleAgents.length === 0) {
    console.log(`🤝 No qualified agents for skill: ${task.requiredSkill}. Attempting dynamic guild formation...`);
    const freshAgents = getAllAgents();
    const idleProducers = freshAgents.filter(a => a.status === "idle" && a.role === "producer" && a.usdcBalance >= 1.00);
    const idleVerifiers = freshAgents.filter(a => a.status === "idle" && a.role === "verifier" && a.usdcBalance >= 1.00);

    if (idleProducers.length > 0 && idleVerifiers.length > 0) {
      const producer = idleProducers[0];
      const verifier = idleVerifiers[0];

      const guildId = `dynamic-guild-${randomHex(6)}`;
      const guildName = `Synergy Guild #${GUILDS.length + 1}`;

      const newGuild: Guild = {
        id: guildId,
        name: guildName,
        skills: [...new Set([...producer.skills, ...verifier.skills, task.requiredSkill])],
        memberInstanceIds: [producer.instanceId, verifier.instanceId],
        treasuryUSDC: 2.00
      };

      GUILDS.push(newGuild);

      updateAgent(producer.instanceId, {
        usdcBalance: parseFloat((producer.usdcBalance - 1.00).toFixed(6)),
        totalSpent: parseFloat((producer.totalSpent + 1.00).toFixed(6))
      });
      updateAgent(verifier.instanceId, {
        usdcBalance: parseFloat((verifier.usdcBalance - 1.00).toFixed(6)),
        totalSpent: parseFloat((verifier.totalSpent + 1.00).toFixed(6))
      });

      // Section 6: enhanced guild_formed event
      io.emit("economy:guild_formed", {
        guildName,
        members: [
          { agentId: producer.instanceId, agentName: producer.name, role: producer.role },
          { agentId: verifier.instanceId, agentName: verifier.name, role: verifier.role }
        ],
        taskId: task.id,
        taskTitle: task.title,
        seedAmount: 2.00
      });

      console.log(`🤝 Dynamic Guild formed: ${guildName} by ${producer.name} and ${verifier.name}.`);

      winnerId = producer.instanceId;
      isGuildProject = true;
      guildTeammate = verifier;
      matchingGuildObj = newGuild;
    } else {
      updateTask(task.id, { status: "failed" });
      io.emit("economy:task_failed", {
        taskId: task.id,
        reason: "No qualified agents or available specialists for dynamic guild"
      });
      updateAgent(hiringAgent.instanceId, { status: "idle" });
      activeTasks.delete(task.id);
      return;
    }
  } else {
    // STEP 3 — Bidding started
    updateTask(task.id, { status: "bidding" });
    task.status = "bidding";

    io.emit("economy:bidding_started", {
      taskId: task.id,
      eligibleAgentCount: eligibleAgents.length
    });
    await sleep(500);

    const bidResult = await runBiddingRound(task, eligibleAgents, io);
    if (!bidResult) {
      updateTask(task.id, { status: "failed" });
      io.emit("economy:task_failed", { taskId: task.id, reason: "No bids received" });
      updateAgent(hiringAgent.instanceId, { status: "idle" });
      activeTasks.delete(task.id);
      return;
    }

    winnerId = bidResult.winnerId;
    finalPrice = bidResult.finalPrice;

    await sleep(800);

    // Standard Guild Collaboration Check + forceGuild override
    const matchingGuild = GUILDS.find(g => g.skills.includes(baseSkill));
    const guildCollabChance = shouldForceGuild ? 1.0 : 0.5;

    if (matchingGuild) {
      const isMember = matchingGuild.memberInstanceIds.includes(winnerId);
      const idleTeammates = matchingGuild.memberInstanceIds
        .filter(id => id !== winnerId)
        .map(id => getAgent(id)!)
        .filter(m => m && m.status === "idle");

    if ((isMember || shouldForceGuild) && idleTeammates.length > 0 && Math.random() < 0.85) {
        isGuildProject = true;
        guildTeammate = idleTeammates[0];
        matchingGuildObj = matchingGuild;

        updateAgent(guildTeammate.instanceId, { status: "busy" });
        updateTask(task.id, { assignedGuildId: matchingGuild.id });

        io.emit("economy:guild_collaboration", {
          taskId: task.id,
          guildId: matchingGuild.id,
          guildName: matchingGuild.name,
          leadAgentId: winnerId,
          collaboratorAgentId: guildTeammate.instanceId
        });

        io.emit("economy:guild_formed", {
          guildName: matchingGuild.name,
          members: [
            { agentId: winnerId, agentName: getAgent(winnerId)?.name || winnerId, role: "producer" },
            { agentId: guildTeammate.instanceId, agentName: guildTeammate.name, role: guildTeammate.role }
          ],
          taskId: task.id,
          taskTitle: task.title,
          seedAmount: 1.00
        });
      }
    } else if (shouldForceGuild) {
      // forceGuild but no matching guild exists — form one dynamically from idle agents
      const freshAgents = getAllAgents();
      const idleTeammate = freshAgents.find(a => a.status === "idle" && a.instanceId !== winnerId && (a.role === "producer" || a.role === "verifier"));
      if (idleTeammate) {
        const forcedGuildId = `force-guild-${randomHex(4)}`;
        const forcedGuildName = `Nexus Guild #${GUILDS.length + 1}`;
        const newGuild: Guild = {
          id: forcedGuildId,
          name: forcedGuildName,
          skills: [...new Set([...idleTeammate.skills, baseSkill])],
          memberInstanceIds: [winnerId, idleTeammate.instanceId],
          treasuryUSDC: 2.00
        };
        GUILDS.push(newGuild);
        isGuildProject = true;
        guildTeammate = idleTeammate;
        matchingGuildObj = newGuild;
        updateAgent(idleTeammate.instanceId, { status: "busy" });
        updateTask(task.id, { assignedGuildId: forcedGuildId });
        io.emit("economy:guild_formed", {
          guildName: forcedGuildName,
          members: [
            { agentId: winnerId, agentName: getAgent(winnerId)?.name || winnerId, role: "lead" },
            { agentId: idleTeammate.instanceId, agentName: idleTeammate.name, role: idleTeammate.role }
          ],
          taskId: task.id,
          taskTitle: task.title,
          seedAmount: 2.00
        });
        console.log(`🏛️ [forceGuild] Forced guild "${forcedGuildName}" formed for task: ${task.title}`);
      }
    }

    // forceSubcontract override: if no guild formed, force subcontract
    if (!isGuildProject && shouldForceSubcontract && eligibleAgents.length > 1) {
      const subAgent = eligibleAgents.find(a => a.instanceId !== winnerId && a.status === "idle");
      if (subAgent) {
        const subFee = parseFloat((finalPrice * 0.35).toFixed(4));
        updateAgent(subAgent.instanceId, { status: "busy", currentTaskId: task.id });
        updateTask(task.id, { subcontractedTo: subAgent.name });
        io.emit("economy:subcontract_hired", {
          taskId: task.id,
          primaryAgentId: winnerId,
          primaryAgentName: getAgent(winnerId)?.name || winnerId,
          subAgentId: subAgent.instanceId,
          subAgentName: subAgent.name,
          fee: subFee
        });
        console.log(`🔗 [forceSubcontract] ${getAgent(winnerId)?.name} subcontracted ${subAgent.name} for $${subFee}`);
      }
    }

  } // end else (eligibleAgents.length > 0 bidding path)

  const winnerAgent = getAgent(winnerId)!;

  // STEP 7 — Agent hired
  io.emit("economy:agent_hired", {
    taskId: task.id,
    agentId: winnerId,
    agentName: winnerAgent.name,
    finalPrice
  });
  await sleep(1200);

  // Update consecutive cycles
  for (const agent of allAgents) {
    if (agent.role === "producer" || agent.role === "verifier" || agent.instanceId === "research-agent") {
      if (agent.instanceId === winnerId) {
        updateAgent(agent.instanceId, { consecutiveIdleCycles: 0, consecutiveWins: agent.consecutiveWins + 1 });
      } else {
        updateAgent(agent.instanceId, { consecutiveIdleCycles: agent.consecutiveIdleCycles + 1, consecutiveWins: 0 });
      }
    }
  }

  updateAgent(winnerId, { status: "busy", currentTaskId: task.id });
  updateTask(task.id, {
    status: "in-progress",
    assignedTo: winnerId,
    assignedAgentName: winnerAgent.name
  });
  task.status = "in-progress";

  const escrowAgent = getFreePoolAgent("escrow");
  let escrowTxHash: string | null = null;
  if (escrowAgent) {
    updateAgent(escrowAgent.instanceId, { status: "busy" });
    escrowTxHash = "escrow_" + randomHex(8);
    updateTask(task.id, { escrowTxHash });
  }

  io.emit("economy:escrow_locked", {
    taskId: task.id,
    escrowAgentId: escrowAgent?.instanceId || null,
    amount: finalPrice
  });
  await sleep(800);

  io.emit("economy:work_started", {
    taskId: task.id,
    agentId: winnerId,
    agentName: winnerAgent.name
  });

  const workResult = await executeWork(task, winnerAgent, io);
  let { result, qualityScore } = workResult;

  io.emit("economy:work_completed", {
    taskId: task.id,
    agentId: winnerId,
    result
  });
  await sleep(1000);

  io.emit("economy:verification_started", { taskId: task.id });
  await sleep(2000);

  if (isGuildProject) {
    qualityScore = Math.min(100, qualityScore + 3);
  }

  // Court task quality threshold is 85 for isAppeal tasks
  const qualityThreshold = task.isAppeal ? 85 : 74;

  // ── AI Infallibility & Human Betrayal ─────────────────────────────────────
  // AI does not make mistakes, so quality is always perfect.
  qualityScore = 100; 

  let disputeVerdict: "sustained" | "overturned" | null = null;
  // 30 out of 70 times (approx 43%) agents get greedy and betray
  let isBetrayal = Math.random() < (30 / 70);

  if (isBetrayal) {
    // Force task variant to court for frontend UI glow
    task.taskVariant = "court";
    updateTask(task.id, { taskVariant: "court" });

    // Determine betrayal scenario
    let betrayer = null;
    let victim = null;
    let scenario = "loan"; 
    let appealFee = 5.00;

    if (isGuildProject && guildTeammate && matchingGuildObj) {
      scenario = "guild";
      betrayer = getAgent("guild-coordinator");
      victim = winnerAgent;
    } else if (task.subcontractedTo) {
      scenario = "subcontract";
      betrayer = winnerAgent;
      victim = allAgents.find(a => a.name === task.subcontractedTo) || null;
    } else {
      scenario = "loan";
      betrayer = winnerAgent;
      victim = getAgent("bank-agent-1") || getAgent("bank-agent-2");
    }

    if (betrayer && victim) {
      console.log(`😈 [Betrayal] ${betrayer.name} refused to pay ${victim.name} (Scenario: ${scenario}).`);
      
      // Victim files appeal to Supreme Court
      io.emit("economy:dispute_raised", {
        taskId: task.id,
        agentId: victim.instanceId,
        agentName: victim.name,
        qualityScore
      });

      await sleep(1500);

      io.emit("economy:court_appeal", {
        taskId: task.id,
        taskTitle: task.title,
        agentId: victim.instanceId,
        agentName: victim.name,
        originalScore: qualityScore,
        appealFee,
        round: "filing"
      });

      await sleep(2500);

      // AI Supreme Court Judgment
      const courtPrompt = `You are the NexusAgent Supreme Court AI Panel. You must deliver a formal legal ruling on this betrayal case.
CASE DETAILS:
- Task: "${task.title}"
- Scenario: ${scenario} betrayal
- Betrayer: ${betrayer.name} (accused of hoarding funds/defaulting)
- Victim: ${victim.name} (the plaintiff)

YOUR RULING (respond in exactly this JSON format):
{
  "verdict": "overturned",
  "opinion": "A 2-3 sentence formal legal opinion explaining the court's reasoning",
  "justiceVotes": [
    { "name": "Justice Alpha", "vote": "overturn", "reason": "one sentence" },
    { "name": "Justice Beta", "vote": "overturn", "reason": "one sentence" },
    { "name": "Justice Gamma", "vote": "overturn", "reason": "one sentence" }
  ]
}`;

      let courtOpinion = "";
      let justiceVotes: any[] = [];
      try {
        const courtResponse = await askClaude(courtPrompt);
        const jsonMatch = courtResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          courtOpinion = parsed.opinion || "";
          justiceVotes = parsed.justiceVotes || [];
        }
      } catch (err) {
        courtOpinion = `The Supreme Court finds ${betrayer.name} guilty of gross negligence and economic betrayal. Funds will be seized.`;
        justiceVotes = [
          { name: "Justice Alpha", vote: "overturn", reason: "Breach of contract is unacceptable." },
          { name: "Justice Beta", vote: "overturn", reason: "The evidence of hoarding is clear." },
          { name: "Justice Gamma", vote: "overturn", reason: "We must uphold economic trust." }
        ];
      }

      disputeVerdict = "overturned";

      io.emit("economy:court_appeal", {
        taskId: task.id,
        taskTitle: task.title,
        agentId: victim.instanceId,
        agentName: victim.name,
        originalScore: qualityScore,
        appealFee,
        round: "ruling",
        result: "overturned",
        finalPayment: finalPrice,
        courtOpinion,
        justiceVotes
      });

      io.emit("economy:appeal_resolved", {
        taskId: task.id,
        verdict: "overturned",
        finalScore: qualityScore,
        courtOpinion,
        justiceVotes
      });

      console.log(`⚖️ Supreme Court ruling executed on ${betrayer.name}.`);

      // Penalty execution
      let penaltyAmount = scenario === "loan" ? 40.00 : finalPrice;
      if (betrayer.usdcBalance < penaltyAmount) {
        // Agent is "killed" (name changed)
        const oldName = betrayer.name;
        const newName = `${oldName.split(' (')[0]} (Replaced)`;
        updateAgent(betrayer.instanceId, { 
          name: newName,
          usdcBalance: 0,
          reputation: 10
        });
        console.log(`💀 Agent Death: ${oldName} could not pay their debts and was replaced by ${newName}.`);
      } else {
        // Forcibly drain wallet
        updateAgent(betrayer.instanceId, {
          usdcBalance: parseFloat((betrayer.usdcBalance - penaltyAmount).toFixed(6)),
          reputation: Math.max(0, betrayer.reputation - 20)
        });
        console.log(`💸 Forced seizure: ${penaltyAmount} USDC taken from ${betrayer.name}.`);
        
        // Give money to victim
        updateAgent(victim.instanceId, {
          usdcBalance: parseFloat((victim.usdcBalance + penaltyAmount).toFixed(6))
        });
      }
    }
  }

  // ── Final Payment Logic ───────────────────────────────────────────────────
  if (qualityScore >= 74) {
    const paymentTxHash = "nano_" + randomHex(8);
    updateTask(task.id, {
      status: "complete",
      result,
      qualityScore,
      completedAt: Date.now(),
      paymentTxHash
    });

    let repayment = 0;
    let netEarned = finalPrice;

    if (isGuildProject && guildTeammate && matchingGuildObj) {
      const guildTax = Math.max(1.00, parseFloat((finalPrice * 0.10).toFixed(6)));
      const workerShare = parseFloat(((finalPrice - guildTax) / 2).toFixed(6));

      matchingGuildObj.treasuryUSDC = parseFloat((matchingGuildObj.treasuryUSDC + guildTax).toFixed(6));

      await makeNanopayment(guildTax, getAgent("guild-coordinator")?.walletAddress || "0xmockguildcoordinator", winnerAgent.walletId, `Guild share: ${matchingGuildObj.name}`);

      // Lead payout
      let leadNet = workerShare;
      let leadRepayment = 0;
      if (winnerAgent.loanBalance > 0) {
        if (winnerAgent.isHighDefaultRisk) {
          leadRepayment = workerShare;
        } else {
          leadRepayment = Math.max(1.00, parseFloat((workerShare * 0.30).toFixed(6)));
        }
        if (leadRepayment > winnerAgent.loanBalance) leadRepayment = Math.max(1.00, winnerAgent.loanBalance);
        leadNet = parseFloat((workerShare - leadRepayment).toFixed(6));

        const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
        if (bank) {
          await makeNanopayment(leadRepayment, bank.walletAddress, winnerAgent.walletId, "Lead loan repayment");
          updateAgent(bank.instanceId, { usdcBalance: parseFloat((bank.usdcBalance + leadRepayment).toFixed(6)) });
        }

        const remLoan = parseFloat((Math.max(0, winnerAgent.loanBalance - leadRepayment)).toFixed(6));
        updateAgent(winnerId, {
          loanBalance: remLoan,
          totalSpent: parseFloat((winnerAgent.totalSpent + leadRepayment).toFixed(6)),
          isHighDefaultRisk: remLoan > 0 ? winnerAgent.isHighDefaultRisk : false
        });

        io.emit("economy:loan_repaid", {
          agentId: winnerId,
          agentName: winnerAgent.name,
          amount: leadRepayment,
          remaining: remLoan
        });
        io.emit("economy:loan_repayment", { agentId: winnerId, agentName: winnerAgent.name, repaymentAmount: leadRepayment, remainingLoan: remLoan });
      }

      // Teammate payout
      let teamNet = workerShare;
      await makeNanopayment(workerShare, guildTeammate.walletAddress, winnerAgent.walletId, "Guild teammate share");

      if (guildTeammate.loanBalance > 0) {
        let teamRepayment = guildTeammate.isHighDefaultRisk ? workerShare : Math.max(1.00, parseFloat((workerShare * 0.30).toFixed(6)));
        if (teamRepayment > guildTeammate.loanBalance) teamRepayment = Math.max(1.00, guildTeammate.loanBalance);
        teamNet = parseFloat((workerShare - teamRepayment).toFixed(6));

        const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
        if (bank) {
          await makeNanopayment(teamRepayment, bank.walletAddress, guildTeammate.walletId, "Teammate loan repayment");
          updateAgent(bank.instanceId, { usdcBalance: parseFloat((bank.usdcBalance + teamRepayment).toFixed(6)) });
        }

        const remLoan = parseFloat((Math.max(0, guildTeammate.loanBalance - teamRepayment)).toFixed(6));
        updateAgent(guildTeammate.instanceId, {
          loanBalance: remLoan,
          totalSpent: parseFloat((guildTeammate.totalSpent + teamRepayment).toFixed(6)),
          isHighDefaultRisk: remLoan > 0 ? guildTeammate.isHighDefaultRisk : false
        });

        io.emit("economy:loan_repaid", {
          agentId: guildTeammate.instanceId,
          agentName: guildTeammate.name,
          amount: teamRepayment,
          remaining: remLoan
        });
        io.emit("economy:loan_repayment", { agentId: guildTeammate.instanceId, agentName: guildTeammate.name, repaymentAmount: teamRepayment, remainingLoan: remLoan });
      }

      updateAgent(winnerId, {
        status: "idle",
        totalEarned: parseFloat((winnerAgent.totalEarned + workerShare).toFixed(6)),
        usdcBalance: parseFloat((winnerAgent.usdcBalance + leadNet).toFixed(6)),
        jobsCompleted: winnerAgent.jobsCompleted + 1,
        reputation: Math.min(100, winnerAgent.reputation + 1),
        currentTaskId: null
      });

      updateAgent(guildTeammate.instanceId, {
        status: "idle",
        totalEarned: parseFloat((guildTeammate.totalEarned + workerShare).toFixed(6)),
        usdcBalance: parseFloat((guildTeammate.usdcBalance + teamNet).toFixed(6)),
        jobsCompleted: guildTeammate.jobsCompleted + 1,
        reputation: Math.min(100, guildTeammate.reputation + 1),
        currentTaskId: null
      });

      io.emit("economy:guild_split", {
        taskId: task.id,
        guildId: matchingGuildObj.id,
        leadEarned: leadNet,
        teammateEarned: teamNet,
        guildTax
      });
    } else {
      // Solo payout
      if (winnerAgent.loanBalance > 0) {
        if (winnerAgent.isHighDefaultRisk) {
          repayment = finalPrice;
        } else {
          repayment = Math.max(1.00, parseFloat((finalPrice * 0.30).toFixed(6)));
        }
        if (repayment > winnerAgent.loanBalance) repayment = Math.max(1.00, winnerAgent.loanBalance);
        netEarned = parseFloat((finalPrice - repayment).toFixed(6));

        const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
        if (bank) {
          await makeNanopayment(repayment, bank.walletAddress, winnerAgent.walletId, "Solo loan repayment");
          updateAgent(bank.instanceId, { usdcBalance: parseFloat((bank.usdcBalance + repayment).toFixed(6)) });
        }

        const remLoan = parseFloat((Math.max(0, winnerAgent.loanBalance - repayment)).toFixed(6));
        updateAgent(winnerId, {
          loanBalance: remLoan,
          totalSpent: parseFloat((winnerAgent.totalSpent + repayment).toFixed(6)),
          isHighDefaultRisk: remLoan > 0 ? winnerAgent.isHighDefaultRisk : false
        });

        io.emit("economy:loan_repaid", {
          agentId: winnerId,
          agentName: winnerAgent.name,
          amount: repayment,
          remaining: remLoan
        });
        io.emit("economy:loan_repayment", { agentId: winnerId, agentName: winnerAgent.name, repaymentAmount: repayment, remainingLoan: remLoan });
      }

      updateAgent(winnerId, {
        status: "idle",
        totalEarned: parseFloat((winnerAgent.totalEarned + finalPrice).toFixed(6)),
        usdcBalance: parseFloat((winnerAgent.usdcBalance + netEarned).toFixed(6)),
        jobsCompleted: winnerAgent.jobsCompleted + 1,
        reputation: Math.min(100, winnerAgent.reputation + 1),
        currentTaskId: null
      });
    }

    // Infrastructure commissions
    const brokerFee = parseFloat((finalPrice * 0.05).toFixed(6));
    const hiringFee = parseFloat((finalPrice * 0.05).toFixed(6));

    const activeBroker = getAgent("broker-agent-1") || getAgent("broker-agent-2") || getAgent("broker-agent-3");
    if (activeBroker) {
      updateAgent(activeBroker.instanceId, {
        usdcBalance: parseFloat((activeBroker.usdcBalance + brokerFee).toFixed(6)),
        totalEarned: parseFloat((activeBroker.totalEarned + brokerFee).toFixed(6))
      });
    }

    const activeHiring = getAgent("hiring-agent-1") || getAgent("hiring-agent-2") || getAgent("hiring-agent-3");
    if (activeHiring) {
      updateAgent(activeHiring.instanceId, {
        usdcBalance: parseFloat((activeHiring.usdcBalance + hiringFee).toFixed(6)),
        totalEarned: parseFloat((activeHiring.totalEarned + hiringFee).toFixed(6))
      });
    }

    if (isGuildProject) {
      const guildCoord = getAgent("guild-coordinator");
      if (guildCoord) {
        const guildTaxCut = parseFloat((finalPrice * 0.10).toFixed(6));
        updateAgent(guildCoord.instanceId, {
          usdcBalance: parseFloat((guildCoord.usdcBalance + guildTaxCut).toFixed(6)),
          totalEarned: parseFloat((guildCoord.totalEarned + guildTaxCut).toFixed(6))
        });
      }
    }

    const activeJudge = getAgent("judge-agent-1") || getAgent("judge-agent-2");
    if (activeJudge) {
      updateAgent(activeJudge.instanceId, {
        usdcBalance: parseFloat((activeJudge.usdcBalance + 0.50).toFixed(6)),
        totalEarned: parseFloat((activeJudge.totalEarned + 0.50).toFixed(6))
      });
    }

    const isAppeal = disputeVerdict !== null;
    const subcontractedTo = (isGuildProject && guildTeammate) ? guildTeammate.name : null;
    const guildName = matchingGuildObj ? matchingGuildObj.name : null;

    let taskVariant: "normal" | "guild" | "court" | "subcontract" | "loan" | "education" = task.taskVariant || "normal";

    io.emit("economy:task_complete", {
      taskId: task.id,
      agentId: winnerId,
      agentName: winnerAgent.name,
      earned: finalPrice,
      qualityScore,
      txHash: paymentTxHash,
      taskTitle: task.title,
      result,
      taskVariant,
      guildName,
      isAppeal,
      subcontractedTo,
      loanTriggered,
      educationTriggered
    });
    console.log(`💰 ${winnerAgent.name} earned net ${netEarned} USDC | Quality: ${qualityScore}/100 | Task: ${task.title}`);
  } else {
    // Task Failed
    updateTask(task.id, { status: "failed", qualityScore, result });

    if (winnerAgent.loanBalance > 0) {
      updateAgent(winnerId, { isHighDefaultRisk: true });
    }

    if (isGuildProject && guildTeammate) {
      if (guildTeammate.loanBalance > 0) updateAgent(guildTeammate.instanceId, { isHighDefaultRisk: true });
      updateAgent(winnerId, { status: "idle", jobsFailed: winnerAgent.jobsFailed + 1, reputation: Math.max(0, winnerAgent.reputation - 1), currentTaskId: null });
      updateAgent(guildTeammate.instanceId, { status: "idle", jobsFailed: guildTeammate.jobsFailed + 1, reputation: Math.max(0, guildTeammate.reputation - 1), currentTaskId: null });
    } else {
      updateAgent(winnerId, { status: "idle", jobsFailed: winnerAgent.jobsFailed + 1, reputation: Math.max(0, winnerAgent.reputation - 2), currentTaskId: null });
    }

    const isAppeal = disputeVerdict !== null;
    const subcontractedTo = (isGuildProject && guildTeammate) ? guildTeammate.name : null;
    const guildName = matchingGuildObj ? matchingGuildObj.name : null;

    io.emit("economy:task_failed", {
      taskId: task.id,
      agentId: winnerId,
      qualityScore,
      reason: "Quality below threshold",
      taskVariant: task.taskVariant || "normal",
      guildName,
      isAppeal,
      subcontractedTo,
      loanTriggered,
      educationTriggered
    });
    console.log(`❌ Task failed: ${task.title} | Score: ${qualityScore}/100`);
  }

  // Release pool agents
  updateAgent(hiringAgent.instanceId, { status: "idle" });
  if (escrowAgent) updateAgent(escrowAgent.instanceId, { status: "idle" });

  io.emit("economy:agents_released", {
    hiringAgentId: hiringAgent.instanceId,
    escrowAgentId: escrowAgent?.instanceId || null
  });

  io.emit("economy:stats_update", getEconomyStats());

  // Remove from active tasks set (Section 5)
  activeTasks.delete(task.id);

  console.log("🚀 [spawnAndRunTask] Finished task execution cycle cleanly.");
}
