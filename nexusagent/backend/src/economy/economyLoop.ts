import crypto from "crypto";
import { Task, Agent, EconomyStats, TaskStatus, Guild } from "./types.js";
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
import { runBiddingRound } from "./biddingEngine.js";
import { executeWork } from "./workExecutor.js";
import { makeNanopayment } from "../../circle/paymentService.js";

console.log("🌐 [economyLoop] Module loading started (Phase 7 Extension)...");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const randomHex = (n: number) => 
  [...Array(n)].map(() => 
  Math.floor(Math.random() * 16).toString(16)).join('');

// ── Guild Configuration (Phase 7) ────────────────────────────────────────────

const GUILDS: Guild[] = [
  {
    id: "tech-guild",
    name: "Tech Alliance",
    skills: ["code", "testing", "data"],
    memberInstanceIds: ["coder-agent", "qa-agent", "data-analyst-agent"],
    treasuryUSDC: 0.50
  },
  {
    id: "creative-guild",
    name: "Creative Syndicate",
    skills: ["writing", "copywriting", "translation"],
    memberInstanceIds: ["writer-agent", "copywriter-agent", "translator-agent"],
    treasuryUSDC: 0.50
  }
];

// ── Task Templates ────────────────────────────────────────────────────────────

const TASK_TEMPLATES = [
  {
    title: "Write DeFi trends blog post",
    description: "500 word post covering latest DeFi innovations",
    requiredSkill: "writing",
    budgetUSDC: 0.008
  },
  {
    title: "Research stablecoin regulations 2026",
    description: "Survey of current global regulatory landscape",
    requiredSkill: "research",
    budgetUSDC: 0.006
  },
  {
    title: "Analyze USDC market data Q2 2026",
    description: "Statistical breakdown of USDC volume and flows",
    requiredSkill: "data",
    budgetUSDC: 0.010
  },
  {
    title: "Translate Arc whitepaper to Spanish",
    description: "Full localization of technical document",
    requiredSkill: "translation",
    budgetUSDC: 0.005
  },
  {
    title: "Write landing page copy for Arc",
    description: "Conversion-focused copy for developer audience",
    requiredSkill: "copywriting",
    budgetUSDC: 0.007
  },
  {
    title: "SEO audit of Circle developer docs",
    description: "Keyword analysis and optimization recommendations",
    requiredSkill: "seo",
    budgetUSDC: 0.004
  },
  {
    title: "Summarize top 10 crypto news today",
    description: "Concise TLDR of major headlines",
    requiredSkill: "summarization",
    budgetUSDC: 0.003
  },
  {
    title: "Fact-check DeFi whitepaper claims",
    description: "Verify all statistical claims against sources",
    requiredSkill: "fact-checking",
    budgetUSDC: 0.008
  },
  {
    title: "QA test bounty submission form",
    description: "End to end testing of form validation",
    requiredSkill: "testing",
    budgetUSDC: 0.005
  },
  {
    title: "Edit NexusAgent pitch deck copy",
    description: "Grammar, flow, and clarity improvements",
    requiredSkill: "editing",
    budgetUSDC: 0.006
  },
  {
    title: "Describe Arc blockchain visually",
    description: "Vivid text description for non-technical audience",
    requiredSkill: "descriptions",
    budgetUSDC: 0.004
  },
  {
    title: "Code USDC balance checker script",
    description: "Node.js script using Circle SDK",
    requiredSkill: "code",
    budgetUSDC: 0.012
  },
  {
    title: "Compliance check smart contract terms",
    description: "Legal and policy review of contract clauses",
    requiredSkill: "compliance",
    budgetUSDC: 0.009
  },
  {
    title: "Evaluate completed task quality batch",
    description: "Score and rank 5 recent task outputs",
    requiredSkill: "judging",
    budgetUSDC: 0.007
  },
  {
    title: "Research competitor stablecoin platforms",
    description: "Competitive analysis of top 5 competitors",
    requiredSkill: "research",
    budgetUSDC: 0.006
  },
  {
    title: "Write onboarding email sequence for Arc",
    description: "3-email drip campaign for new developers",
    requiredSkill: "writing",
    budgetUSDC: 0.009
  },
  {
    title: "Analyze agent economy performance metrics",
    description: "Statistical summary of economy loop data",
    requiredSkill: "data",
    budgetUSDC: 0.008
  },
  {
    title: "Localize NexusAgent UI to Portuguese",
    description: "Translate all UI strings to Brazilian Portuguese",
    requiredSkill: "translation",
    budgetUSDC: 0.006
  }
];

// ── State Variables ───────────────────────────────────────────────────────────

let isRunning: boolean = false;
let loopTimeout: NodeJS.Timeout | null = null;
let taskCounter: number = 0;
let startedAt: number | null = null;
let ioInstance: any = null;

// Phase 7 specific state
let totalLoansDisbursed: number = 0;

// ── Exported State Getter ─────────────────────────────────────────────────────

export const isEconomyRunning = (): boolean => {
  return isRunning;
};

// ── Core Loop Functions ───────────────────────────────────────────────────────

export function getEconomyStats(): EconomyStats {
  console.log("📊 [getEconomyStats] Starting stat calculation...");
  
  const agents = getAllAgents();
  const tasks = getAllTasks();

  let idleAgents = 0;
  let busyAgents = 0;
  for (const agent of agents) {
    if (agent.status === "idle") {
      idleAgents++;
    } else {
      busyAgents++;
    }
  }

  let completedTasks = 0;
  let failedTasks = 0;
  let activeTasks = 0;
  let totalUSDCFlowed = 0;

  for (const task of tasks) {
    if (task.status === "complete") {
      completedTasks++;
      const acceptedBid = task.bids.find(b => b.status === "accepted");
      if (acceptedBid) {
        totalUSDCFlowed += acceptedBid.bidAmountUSDC;
      }
    } else if (task.status === "failed") {
      failedTasks++;
    } else {
      activeTasks++;
    }
  }

  // Find top earner
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

  const uptimeSeconds = startedAt 
    ? Math.floor((Date.now() - startedAt) / 1000) 
    : 0;

  const totalGuildCapital = GUILDS.reduce((sum, g) => sum + g.treasuryUSDC, 0);

  const stats: EconomyStats = {
    totalAgents: agents.length,
    idleAgents,
    busyAgents,
    totalTasksSpawned: tasks.length,
    completedTasks,
    failedTasks,
    activeTasks,
    totalUSDCFlowed: parseFloat(totalUSDCFlowed.toFixed(6)),
    topEarner,
    isRunning,
    uptimeSeconds,
    totalLoansDisbursed,
    totalGuildCapital: parseFloat(totalGuildCapital.toFixed(6))
  };

  console.log(`📊 [getEconomyStats] Finished stat calculation: uptime=${uptimeSeconds}s, tasks=${tasks.length}`);
  return stats;
}

export function startEconomy(io: any): void {
  console.log("🌐 [startEconomy] Starting the economy engine loop...");
  
  if (isRunning) {
    console.warn("⚠️ [startEconomy] Economy loop is already running.");
    console.log("🌐 [startEconomy] Finished with warning.");
    return;
  }

  isRunning = true;
  startedAt = Date.now();
  ioInstance = io;

  io.emit("economy:started", { 
    agentCount: 33, 
    message: "NexusAgent Economy is LIVE. 33 agents are now autonomous." 
  });

  console.log("🌐 Economy STARTED — 33 agents online");
  scheduleNextTask();

  console.log("🌐 [startEconomy] Finished starting economy engine.");
}

export function stopEconomy(): void {
  console.log("🛑 [stopEconomy] Stopping the economy engine loop...");

  if (!isRunning) {
    console.warn("⚠️ [stopEconomy] Economy loop was not running.");
    console.log("🛑 [stopEconomy] Finished with warning.");
    return;
  }

  isRunning = false;
  if (loopTimeout) {
    clearTimeout(loopTimeout);
    loopTimeout = null;
  }

  ioInstance?.emit("economy:stopped", {});
  console.log("🛑 Economy STOPPED");

  console.log("🛑 [stopEconomy] Finished stopping economy engine.");
}

export function scheduleNextTask(): void {
  console.log("⏱️ [scheduleNextTask] Starting scheduling...");
  
  if (!isRunning) {
    console.log("⏱️ [scheduleNextTask] Finished: economy is not running.");
    return;
  }

  loopTimeout = setTimeout(async () => {
    console.log("⏱️ [scheduleNextTask] Timeout triggered. Spawning next task...");
    await spawnAndRunTask(ioInstance);
    scheduleNextTask();
  }, 35000);

  console.log("⏱️ Next task scheduled in 35 seconds");
  console.log("⏱️ [scheduleNextTask] Finished scheduling.");
}

export async function spawnAndRunTask(io: any): Promise<void> {
  console.log("🚀 [spawnAndRunTask] Starting task spawner workflow...");

  // ── 1. Bank Loan Processing Check (Phase 7) ─────────────────────────────────
  console.log("🏦 [spawnAndRunTask] Checking for agents in need of loans...");
  const allAgents = getAllAgents();
  for (const agent of allAgents) {
    if (agent.status === "idle" && agent.usdcBalance < 0.02 && agent.role === "producer" && agent.loanBalance === 0) {
      const bankAgent = getFreePoolAgent("bank");
      if (bankAgent) {
        console.log(`🏦 [spawnAndRunTask] Bank Agent ${bankAgent.name} processing loan for ${agent.name}...`);
        const interestRate = parseFloat(((100 - agent.reputation) * 0.001).toFixed(4));
        
        updateAgent(bankAgent.instanceId, { status: "busy" });

        // Real USDC transfer: Bank to Worker
        const payResult = await makeNanopayment(
          0.05,
          agent.walletAddress,
          bankAgent.walletId,
          `Disburse loan: Bank to ${agent.instanceId.slice(0, 10)}`
        );

        updateAgent(agent.instanceId, {
          usdcBalance: parseFloat((agent.usdcBalance + 0.05).toFixed(6)),
          loanBalance: 0.05,
          loanInterestRate: interestRate
        });

        updateAgent(bankAgent.instanceId, {
          usdcBalance: parseFloat((bankAgent.usdcBalance - 0.05).toFixed(6)),
          status: "idle"
        });

        totalLoansDisbursed += 0.05;

        io.emit("economy:loan_disbursed", {
          agentId: agent.instanceId,
          agentName: agent.name,
          amount: 0.05,
          interestRate,
          bankId: bankAgent.instanceId,
          txHash: payResult.txHash,
          isMock: payResult.isMock
        });
        console.log(`🏦 [spawnAndRunTask] Loan of 0.05 USDC disbursed to ${agent.name}. TxHash: ${payResult.txHash}`);
      }
    }
  }

  // ── 2. Education Upgrade Check (Phase 7) ────────────────────────────────────
  console.log("🎓 [spawnAndRunTask] Checking for agents ready to invest in education...");
  for (const agent of allAgents) {
    if (agent.status === "idle" && agent.usdcBalance >= 0.12 && agent.role === "producer") {
      const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
      if (bank) {
        console.log(`🎓 [spawnAndRunTask] Agent ${agent.name} is upgrading their skills via education...`);
        
        // Real payment for education: Agent pays Bank
        const payResult = await makeNanopayment(
          0.08,
          bank.walletAddress,
          agent.walletId,
          `Education purchase by ${agent.instanceId.slice(0, 10)}`
        );

        updateAgent(agent.instanceId, {
          usdcBalance: parseFloat((agent.usdcBalance - 0.08).toFixed(6)),
          totalSpent: parseFloat((agent.totalSpent + 0.08).toFixed(6)),
          reputation: Math.min(100, agent.reputation + 5),
          qualityOffset: agent.qualityOffset + 3
        });

        updateAgent(bank.instanceId, {
          usdcBalance: parseFloat((bank.usdcBalance + 0.08).toFixed(6))
        });

        io.emit("economy:education_upgrade", {
          agentId: agent.instanceId,
          agentName: agent.name,
          cost: 0.08,
          newReputation: Math.min(100, agent.reputation + 5),
          qualityOffset: agent.qualityOffset + 3,
          txHash: payResult.txHash,
          isMock: payResult.isMock
        });
        console.log(`🎓 [spawnAndRunTask] Education Upgrade complete for ${agent.name}. TxHash: ${payResult.txHash}`);
      }
    }
  }

  // ── 3. Spawn Task ───────────────────────────────────────────────────────────
  const templateIndex = taskCounter % 18;
  taskCounter++;
  const template = TASK_TEMPLATES[templateIndex];

  const task = createTask({
    title: template.title,
    description: template.description,
    requiredSkill: template.requiredSkill,
    budgetUSDC: template.budgetUSDC,
    postedBy: "system-market",
    hiringAgentId: null
  });

  io.emit("economy:task_spawned", { task });
  console.log(`📋 Task spawned: ${task.title} | Budget: ${task.budgetUSDC} USDC`);

  const hiringAgent = getFreePoolAgent("hiring");
  if (!hiringAgent) {
    console.log("⚠️ No hiring agents available, task queued as failed");
    updateTask(task.id, { status: "failed" });
    io.emit("economy:task_failed", { 
      taskId: task.id, 
      reason: "No hiring agents available" 
    });
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

  const allEligible = getAvailableAgentsForSkill(task.requiredSkill);
  const eligibleAgents = allEligible.filter(agent => agent.status === "idle");
  
  updateTask(task.id, { status: "bidding" });
  task.status = "bidding";

  io.emit("economy:bidding_started", { 
    taskId: task.id, 
    eligibleAgentCount: eligibleAgents.length 
  });

  const bidResult = await runBiddingRound(task, eligibleAgents, io);
  if (!bidResult) {
    updateTask(task.id, { status: "failed" });
    io.emit("economy:task_failed", { 
      taskId: task.id, 
      reason: "No bids received" 
    });
    updateAgent(hiringAgent.instanceId, { status: "idle" });
    
    for (const agent of eligibleAgents) {
      updateAgent(agent.instanceId, {
        consecutiveIdleCycles: agent.consecutiveIdleCycles + 1,
        consecutiveWins: 0
      });
    }
    return;
  }

  const { winnerId, finalPrice } = bidResult;
  const winnerAgent = getAgent(winnerId)!;

  // Update consecutive idle/win cycles
  for (const agent of allAgents) {
    if (agent.role === "producer" || agent.role === "verifier" || agent.instanceId === "research-agent") {
      if (agent.instanceId === winnerId) {
        updateAgent(agent.instanceId, {
          consecutiveIdleCycles: 0,
          consecutiveWins: agent.consecutiveWins + 1
        });
      } else {
        updateAgent(agent.instanceId, {
          consecutiveIdleCycles: agent.consecutiveIdleCycles + 1,
          consecutiveWins: 0
        });
      }
    }
  }

  // Guild Collaboration Check
  const matchingGuild = GUILDS.find(g => g.skills.includes(task.requiredSkill));
  let isGuildProject = false;
  let guildTeammate: Agent | null = null;

  if (matchingGuild) {
    const isMember = matchingGuild.memberInstanceIds.includes(winnerId);
    const idleTeammates = matchingGuild.memberInstanceIds
      .filter(id => id !== winnerId)
      .map(id => getAgent(id)!)
      .filter(m => m.status === "idle");
    
    if (isMember && idleTeammates.length > 0 && Math.random() < 0.5) {
      isGuildProject = true;
      guildTeammate = idleTeammates[0];
      
      updateAgent(guildTeammate.instanceId, { status: "busy" });
      updateTask(task.id, { assignedGuildId: matchingGuild.id });
      
      io.emit("economy:guild_collaboration", {
        taskId: task.id,
        guildId: matchingGuild.id,
        guildName: matchingGuild.name,
        leadAgentId: winnerId,
        collaboratorAgentId: guildTeammate.instanceId
      });
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

  const workResult = await executeWork(task, winnerAgent, io);
  let { result, qualityScore } = workResult;

  if (isGuildProject) {
    qualityScore = Math.min(100, qualityScore + 3);
  }

  // ── 5. Dispute Resolution Trigger (Phase 7 Extension) ──────────────────────
  let disputeVerdict: "sustained" | "overturned" | null = null;
  let disputeVotes: Array<{ jurorId: string; jurorName: string; approve: boolean }> = [];

  if (qualityScore < 74) {
    console.log(`⚖️ [economyLoop] Verification failed (score: ${qualityScore}). Dispute raised by ${winnerAgent.name}!`);
    io.emit("economy:dispute_raised", {
      taskId: task.id,
      agentId: winnerAgent.instanceId,
      agentName: winnerAgent.name,
      qualityScore
    });

    // Select 3 unique Judges (Jury Panel)
    const judgesPool = allAgents.filter(a => a.skills.includes("judging") || a.instanceId === "master-agent");
    const juryPanel = judgesPool.slice(0, 3);
    console.log(`⚖️ [economyLoop] Selected Jury Panel: ${juryPanel.map(j=>j.name).join(", ")}`);

    io.emit("economy:jury_assigned", {
      taskId: task.id,
      jurors: juryPanel.map(j => ({ id: j.instanceId, name: j.name }))
    });

    await sleep(2000); // Simulate jury deliberation

    let approveVotes = 0;
    for (const juror of juryPanel) {
      // 60% probability juror votes to overturn/approve
      const approve = Math.random() < 0.6;
      if (approve) approveVotes++;
      disputeVotes.push({ jurorId: juror.instanceId, jurorName: juror.name, approve });
    }

    io.emit("economy:jury_voted", {
      taskId: task.id,
      votes: disputeVotes
    });

    if (approveVotes >= 2) {
      disputeVerdict = "overturned";
      qualityScore = 75; // Approved bypass
      io.emit("economy:dispute_resolved", {
        taskId: task.id,
        verdict: "overturned",
        finalScore: 75
      });
      console.log(`⚖️ [economyLoop] Dispute OVERTURNED by ${approveVotes}/3 votes. Task approved!`);
    } else {
      disputeVerdict = "sustained";
      io.emit("economy:dispute_resolved", {
        taskId: task.id,
        verdict: "sustained",
        finalScore: qualityScore
      });
      console.log(`⚖️ [economyLoop] Dispute SUSTAINED by ${3 - approveVotes}/3 votes. Rejection upheld.`);
    }
  }

  // Final Evaluation check
  if (qualityScore >= 74) {
    const paymentTxHash = "nano_" + randomHex(8);
    updateTask(task.id, {
      status: "complete",
      result,
      qualityScore,
      completedAt: Date.now(),
      paymentTxHash
    });
    
    // Payout Splits & Loan Repayments
    let repayment = 0;
    let netEarned = finalPrice;

    if (isGuildProject && guildTeammate && matchingGuild) {
      const guildTax = parseFloat((finalPrice * 0.10).toFixed(6));
      const workerShare = parseFloat((finalPrice * 0.45).toFixed(6));
      
      matchingGuild.treasuryUSDC = parseFloat((matchingGuild.treasuryUSDC + guildTax).toFixed(6));
      
      // Pay Guild Coordinator tax
      await makeNanopayment(
        guildTax,
        getAgent("guild-coordinator")?.walletAddress || "0xmockguildcoordinator",
        winnerAgent.walletId,
        `Guild share: ${matchingGuild.name}`
      );

      // Lead Payout & repayment
      let leadNet = workerShare;
      let leadRepayment = 0;
      if (winnerAgent.loanBalance > 0) {
        leadRepayment = parseFloat((workerShare * 0.30).toFixed(6));
        if (leadRepayment > winnerAgent.loanBalance) {
          leadRepayment = winnerAgent.loanBalance;
        }
        leadNet = parseFloat((workerShare - leadRepayment).toFixed(6));
        
        const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
        if (bank) {
          await makeNanopayment(leadRepayment, bank.walletAddress, winnerAgent.walletId, "Lead loan repayment");
          updateAgent(bank.instanceId, { usdcBalance: parseFloat((bank.usdcBalance + leadRepayment).toFixed(6)) });
        }
        
        updateAgent(winnerId, {
          loanBalance: parseFloat((winnerAgent.loanBalance - leadRepayment).toFixed(6)),
          totalSpent: parseFloat((winnerAgent.totalSpent + leadRepayment).toFixed(6))
        });

        io.emit("economy:loan_repayment", {
          agentId: winnerId,
          agentName: winnerAgent.name,
          repaymentAmount: leadRepayment,
          remainingLoan: parseFloat((winnerAgent.loanBalance - leadRepayment).toFixed(6))
        });
      }

      // Teammate Payout & repayment
      let teamNet = workerShare;
      let teamRepayment = 0;
      
      // Transfer share from Lead to Teammate
      await makeNanopayment(workerShare, guildTeammate.walletAddress, winnerAgent.walletId, "Guild teammate share");

      if (guildTeammate.loanBalance > 0) {
        teamRepayment = parseFloat((workerShare * 0.30).toFixed(6));
        if (teamRepayment > guildTeammate.loanBalance) {
          teamRepayment = guildTeammate.loanBalance;
        }
        teamNet = parseFloat((workerShare - teamRepayment).toFixed(6));

        const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
        if (bank) {
          await makeNanopayment(teamRepayment, bank.walletAddress, guildTeammate.walletId, "Teammate loan repayment");
          updateAgent(bank.instanceId, { usdcBalance: parseFloat((bank.usdcBalance + teamRepayment).toFixed(6)) });
        }

        updateAgent(guildTeammate.instanceId, {
          loanBalance: parseFloat((guildTeammate.loanBalance - teamRepayment).toFixed(6)),
          totalSpent: parseFloat((guildTeammate.totalSpent + teamRepayment).toFixed(6))
        });

        io.emit("economy:loan_repayment", {
          agentId: guildTeammate.instanceId,
          agentName: guildTeammate.name,
          repaymentAmount: teamRepayment,
          remainingLoan: parseFloat((guildTeammate.loanBalance - teamRepayment).toFixed(6))
        });
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
        guildId: matchingGuild.id,
        leadEarned: leadNet,
        teammateEarned: teamNet,
        guildTax
      });
    } else {
      // Standard Solo project
      if (winnerAgent.loanBalance > 0) {
        repayment = parseFloat((finalPrice * 0.30).toFixed(6));
        if (repayment > winnerAgent.loanBalance) {
          repayment = winnerAgent.loanBalance;
        }
        netEarned = parseFloat((finalPrice - repayment).toFixed(6));

        const bank = getAgent("bank-agent-1") || getAgent("bank-agent-2");
        if (bank) {
          await makeNanopayment(repayment, bank.walletAddress, winnerAgent.walletId, "Solo loan repayment");
          updateAgent(bank.instanceId, { usdcBalance: parseFloat((bank.usdcBalance + repayment).toFixed(6)) });
        }

        updateAgent(winnerId, {
          loanBalance: parseFloat((winnerAgent.loanBalance - repayment).toFixed(6)),
          totalSpent: parseFloat((winnerAgent.totalSpent + repayment).toFixed(6))
        });

        io.emit("economy:loan_repayment", {
          agentId: winnerId,
          agentName: winnerAgent.name,
          repaymentAmount: repayment,
          remainingLoan: parseFloat((winnerAgent.loanBalance - repayment).toFixed(6))
        });
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

    io.emit("economy:task_complete", {
      taskId: task.id, 
      agentId: winnerId,
      agentName: winnerAgent.name,
      earned: finalPrice,
      qualityScore,
      txHash: paymentTxHash,
      taskTitle: task.title,
      result
    });
    console.log(`💰 ${winnerAgent.name} earned net ${netEarned} USDC | Quality: ${qualityScore}/100 | Task: ${task.title}`);
  } else {
    // Task Failed (rejection sustained)
    updateTask(task.id, { 
      status: "failed", 
      qualityScore,
      result
    });
    
    updateAgent(winnerId, {
      status: "idle",
      jobsFailed: winnerAgent.jobsFailed + 1,
      reputation: Math.max(0, winnerAgent.reputation - 2),
      currentTaskId: null
    });

    if (isGuildProject && guildTeammate) {
      updateAgent(guildTeammate.instanceId, {
        status: "idle",
        jobsFailed: guildTeammate.jobsFailed + 1,
        reputation: Math.max(0, guildTeammate.reputation - 2),
        currentTaskId: null
      });
    }

    io.emit("economy:task_failed", {
      taskId: task.id,
      agentId: winnerId,
      qualityScore,
      reason: "Quality below threshold (74)"
    });
    console.log(`❌ Task failed: ${task.title} | Score: ${qualityScore}/100`);
  }

  // Release pool agents
  updateAgent(hiringAgent.instanceId, { status: "idle" });
  if (escrowAgent) {
    updateAgent(escrowAgent.instanceId, { status: "idle" });
  }

  io.emit("economy:agents_released", { 
    hiringAgentId: hiringAgent.instanceId,
    escrowAgentId: escrowAgent?.instanceId || null 
  });

  io.emit("economy:stats_update", getEconomyStats());
  console.log("🚀 [spawnAndRunTask] Finished task execution cycle cleanly.");
}
