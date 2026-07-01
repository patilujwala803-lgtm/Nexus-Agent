import crypto from "crypto";
import { Agent, Bid, Task, BidStatus } from "./types.js";
import { updateAgent, getAgent } from "./agentRegistry.js";
import { updateTask } from "./taskQueue.js";

console.log("🪙 [biddingEngine] Module loading started (Phase 7)...");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Bid Generation ────────────────────────────────────────────────────────────

export function generateBid(agent: Agent, task: Task): Bid {
  console.log(`🎲 [generateBid] Starting bid generation for agent: ${agent.name} on task: "${task.title}"...`);
  
  // Base multiplier based on strategy
  let multiplier = 0.88;
  switch (agent.bidStrategy) {
    case "aggressive":
      multiplier = 0.75;
      break;
    case "standard":
      multiplier = 0.88;
      break;
    case "premium":
      multiplier = 0.98;
      break;
  }

  // ── Dynamic Pricing Logic (Phase 7) ─────────────────────────────────────────
  if (agent.consecutiveIdleCycles > 2) {
    // Reduce price by 5% per cycle after being idle for 2 consecutive cycles
    const discount = (agent.consecutiveIdleCycles - 2) * 0.05;
    multiplier = Math.max(0.70, multiplier - discount);
    console.log(`📉 [generateBid] Dynamic Pricing discount: agent ${agent.name} is unemployed for ${agent.consecutiveIdleCycles} cycles. New multiplier: ${multiplier}`);
  } else if (agent.consecutiveWins > 1) {
    // Increase price by 2% per consecutive win
    const premiumBoost = agent.consecutiveWins * 0.02;
    multiplier = Math.min(0.98, multiplier + premiumBoost);
    console.log(`📈 [generateBid] Dynamic Pricing premium boost: agent ${agent.name} has ${agent.consecutiveWins} consecutive wins. New multiplier: ${multiplier}`);
  }

  let bidAmountUSDC = task.budgetUSDC * multiplier;

  // Clamp to minimum 0.001 USDC
  if (bidAmountUSDC < 0.001) {
    bidAmountUSDC = 0.001;
  }
  bidAmountUSDC = parseFloat(bidAmountUSDC.toFixed(6));

  const estimatedTimeMs = Math.floor(Math.random() * 5000 + 3000); // 3-8 seconds
  const message = `Hi, I'm ${agent.name}. I'll complete '${task.title}' for ${bidAmountUSDC} USDC. Reputation: ${agent.reputation}/100. Jobs done: ${agent.jobsCompleted}. I can deliver in ~${estimatedTimeMs}ms.`;

  const bid: Bid = {
    id: crypto.randomUUID(),
    agentId: agent.id,
    agentName: agent.name,
    agentInstanceId: agent.instanceId,
    bidAmountUSDC,
    estimatedTimeMs,
    message,
    status: "pending",
    counterOfferUSDC: null,
    placedAt: Date.now()
  };

  console.log(`🎲 [generateBid] Finished bid generation for agent: ${agent.name}. Bid Amount: ${bidAmountUSDC} USDC`);
  return bid;
}

// ── Bid Scoring ───────────────────────────────────────────────────────────────

export function scoreBid(bid: Bid, task: Task, agent: Agent): number {
  console.log(`📈 [scoreBid] Starting score for bid from: ${agent.name} on task: "${task.title}"...`);
  
  const score = (agent.reputation * 0.4) + 
                ((1 - bid.bidAmountUSDC / task.budgetUSDC) * 50) + 
                (agent.jobsCompleted * 0.5);

  console.log(`📈 [scoreBid] Finished score for bid from: ${agent.name}. Score: ${score}`);
  return score;
}

// ── Bidding Round Execution ───────────────────────────────────────────────────

export async function runBiddingRound(
  task: Task, 
  eligibleAgents: Agent[], 
  io: any
): Promise<{ winnerId: string; finalPrice: number } | null> {
  console.log(`🏁 [runBiddingRound] Starting round for task: "${task.title}" with ${eligibleAgents.length} agents...`);

  // Step 1: If no eligible agents, return null.
  if (eligibleAgents.length === 0) {
    console.log("🏁 [runBiddingRound] Finished round: No eligible agents.");
    return null;
  }

  // Step 2: For each eligible agent, generate a bid.
  const bids: Bid[] = [];
  for (const agent of eligibleAgents) {
    const bid = generateBid(agent, task);
    bids.push(bid);
    
    // Add bid to task.bids
    const currentBids = [...task.bids, bid];
    updateTask(task.id, { bids: currentBids });
    task.bids = currentBids; // local sync for logic below

    // Emit socket event "economy:bid_placed"
    io.emit("economy:bid_placed", {
      taskId: task.id,
      bid,
      agentName: agent.name,
      agentInstanceId: agent.instanceId
    });

    console.log(`📨 [runBiddingRound] ${agent.name} placed bid of ${bid.bidAmountUSDC} USDC for task: ${task.title}`);
    await sleep(300);
  }

  // Step 3: Score all bids. Find highest scoring bid.
  let scoredBids = bids.map(bid => {
    const agent = eligibleAgents.find(a => a.id === bid.agentId || a.instanceId === bid.agentInstanceId)!;
    return {
      bid,
      agent,
      score: scoreBid(bid, task, agent)
    };
  });

  // Sort descending by score
  scoredBids.sort((a, b) => b.score - a.score);

  if (scoredBids.length === 0) {
    console.log("🏁 [runBiddingRound] Finished round: No bids scored.");
    return null;
  }

  let winningIndex = 0;
  let winnerRecord = scoredBids[winningIndex];
  let winnerId = winnerRecord.agent.instanceId; // use instanceId
  let finalPrice = winnerRecord.bid.bidAmountUSDC;

  // Step 4: Counter-offer logic
  if (finalPrice > task.budgetUSDC * 0.93) {
    const originalBidAmount = finalPrice;
    const counterOffer = parseFloat((task.budgetUSDC * 0.90).toFixed(6));
    
    console.log(`🔄 [runBiddingRound] Counter-offer path starting for: ${winnerRecord.agent.name}`);

    // Update that bid in task.bids
    winnerRecord.bid.status = "countered";
    winnerRecord.bid.counterOfferUSDC = counterOffer;
    updateTask(task.id, { bids: task.bids });

    // Emit "economy:counter_offer"
    io.emit("economy:counter_offer", {
      taskId: task.id,
      agentId: winnerRecord.agent.instanceId,
      agentName: winnerRecord.agent.name,
      originalBid: originalBidAmount,
      counterOffer
    });

    console.log(`🔄 Counter-offer sent to ${winnerRecord.agent.name}: ${counterOffer} USDC (was ${originalBidAmount})`);
    await sleep(1500);

    // Agent accepts if counterOffer >= originalBid * 0.82
    if (counterOffer >= originalBidAmount * 0.82) {
      finalPrice = counterOffer;
      winnerRecord.bid.status = "accepted";
      console.log(`✅ ${winnerRecord.agent.name} accepted counter-offer`);
    } else {
      // Mark bid "rejected"
      winnerRecord.bid.status = "rejected";
      console.log(`❌ ${winnerRecord.agent.name} rejected counter-offer`);

      // Pick next highest scoring bid as winner instead
      winningIndex++;
      if (winningIndex < scoredBids.length) {
        winnerRecord = scoredBids[winningIndex];
        winnerId = winnerRecord.agent.instanceId;
        finalPrice = winnerRecord.bid.bidAmountUSDC;
        winnerRecord.bid.status = "accepted";
        console.log(`➡️ [runBiddingRound] Next highest bid selected: ${winnerRecord.agent.name} at ${finalPrice} USDC`);
      } else {
        // No other bids available
        console.log("🏁 [runBiddingRound] Finished round: Winner rejected counter and no other bids available.");
        return null;
      }
    }
  } else {
    // Standard acceptance without counter-offer
    winnerRecord.bid.status = "accepted";
  }

  // Step 5: If no winner found after all that, return null.
  if (!winnerRecord || winnerRecord.bid.status !== "accepted") {
    console.log("🏁 [runBiddingRound] Finished round: No winner accepted.");
    return null;
  }

  // Step 6: Mark all other bids as "rejected".
  const rejectedAgentIds: string[] = [];
  const updatedBids = task.bids.map(b => {
    if (b.id !== winnerRecord.bid.id && b.status !== "rejected") {
      b.status = "rejected";
      rejectedAgentIds.push(b.agentInstanceId);
    }
    return b;
  });

  updateTask(task.id, { bids: updatedBids });

  // Emit "economy:bids_rejected"
  io.emit("economy:bids_rejected", {
    taskId: task.id,
    rejectedAgentIds
  });

  console.log(`🏁 [runBiddingRound] Finished round: Winner is ${winnerRecord.agent.name} (${winnerId}) at price: ${finalPrice} USDC.`);
  return { winnerId, finalPrice };
}
