/**
 * courtRoutes.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * NexusAgent Supreme Court Appeal System
 *
 * Routes:
 *   POST /court/appeal         — file an appeal (charges 3 USDC filing fee)
 *   GET  /court/appeals        — all appeals across all tasks
 *   GET  /court/appeal/:taskId — appeal history for a specific task ID
 *
 * The appeal system:
 *   1. Charges 3 USDC filing fee from appellant → JudgeAgent wallet
 *   2. Fetches complete task history from taskStore
 *   3. Sends to Judge LLM for evaluation
 *   4. If verdict = in_favor: forces payment, deducts 5% judge fee
 *   5. All actions logged back to taskStore
 *
 * NOTE: This route is fully independent of the main bounty flow.
 *       It will never crash or block the economy loop.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  getTaskRecord,
  getTaskRecordByInternalId,
  updateTaskRecord,
  appendAppeal,
  appendPayment,
  getAllTaskRecords,
  AppealRecord,
} from "../../db/taskStore.js";
import { makeNanopayment } from "../../circle/paymentService.js";
import { getAgent, getAllAgents } from "../economy/agentRegistry.js";
import { askJudge } from "../llm/claudeClient.js";

console.log("⚖️  [courtRoutes] Supreme Court module loading...");

// ── Judge Agent wallet (receives filing fees + 5% judge fee) ──────────────────
// Uses the first available judge-agent from the registry
function getJudgeAgentWallet(): { walletId: string; walletAddress: string; instanceId: string } | null {
  const judge = getAgent("judge-agent-1") || getAgent("judge-agent-2");
  if (!judge) return null;
  return {
    walletId: judge.walletId,
    walletAddress: judge.walletAddress,
    instanceId: judge.instanceId,
  };
}

// ── System prompt for the Supreme Court Judge ─────────────────────────────────
const JUDGE_SYSTEM_PROMPT = `You are the Supreme Court Judge of NexusAgent, an autonomous AI agent economy. You analyze disputes between agents based on their complete task history. You are impartial, strict, and base your verdicts only on evidence in the task record. Your verdicts are final and result in automatic on-chain enforcement.`;

// ── Router factory ────────────────────────────────────────────────────────────
export function createCourtRouter(io: any): Router {
  const router = Router();

  // ── POST /court/appeal ───────────────────────────────────────────────────────
  router.post("/appeal", async (req: Request, res: Response) => {
    const { taskId, filedBy, issue } = req.body as {
      taskId?: string;
      filedBy?: string;
      issue?: string;
    };

    console.log(`\n⚖️  POST /court/appeal called for task ${taskId}`);

    // ── Input validation ────────────────────────────────────────────────────
    if (!taskId || !filedBy || !issue) {
      res.status(400).json({ error: "Missing required fields: taskId, filedBy, issue" });
      return;
    }

    // ── Verify task exists ──────────────────────────────────────────────────
    // Try 4-digit ID first, then internal UUID
    let taskRecord = getTaskRecord(taskId);
    if (!taskRecord) {
      taskRecord = getTaskRecordByInternalId(taskId);
    }
    if (!taskRecord) {
      res.status(404).json({ error: `Task ID "${taskId}" not found in task store` });
      return;
    }

    const resolvedTaskId = taskRecord.taskId;

    // ── Find appellant's wallet ─────────────────────────────────────────────
    const appellant = getAgent(filedBy);
    if (!appellant) {
      res.status(400).json({ error: `Agent "${filedBy}" not found in registry` });
      return;
    }

    if (!appellant.walletId) {
      res.status(400).json({ error: `Agent "${filedBy}" has no wallet configured` });
      return;
    }

    // ── Find judge wallet ───────────────────────────────────────────────────
    const judgeWallet = getJudgeAgentWallet();
    if (!judgeWallet) {
      res.status(500).json({ error: "No Judge Agent available to receive filing fee" });
      return;
    }

    // ── Charge 3 USDC filing fee ────────────────────────────────────────────
    const FILING_FEE = 3.00;
    console.log(`💳 Filing fee: ${FILING_FEE} USDC from ${filedBy} → ${judgeWallet.instanceId}`);

    let filingFeeTxHash: string;
    try {
      const feeResult = await makeNanopayment(
        FILING_FEE,
        judgeWallet.walletAddress,
        appellant.walletId,
        `Supreme Court filing fee for task ${resolvedTaskId} — appeal by ${filedBy}`
      );

      if (!feeResult || feeResult.isMock === false && !feeResult.txHash) {
        res.status(402).json({
          error: `Appeal rejected — filing fee payment of ${FILING_FEE} USDC failed`,
        });
        return;
      }

      filingFeeTxHash = feeResult.txHash;
      console.log(`✅ Filing fee: ${FILING_FEE} USDC charged — txHash: ${filingFeeTxHash}`);
    } catch (err) {
      const errMsg = (err as Error).message;
      console.error(`❌ Filing fee payment failed: ${errMsg}`);
      res.status(402).json({
        error: `Appeal rejected — filing fee payment of ${FILING_FEE} USDC failed: ${errMsg}`,
      });
      return;
    }

    // ── Create appeal record ────────────────────────────────────────────────
    const appealId = `appeal-${uuidv4().slice(0, 8)}`;
    const appealRecord: AppealRecord = {
      appealId,
      filedBy,
      filingFeeTxHash,
      issue,
      filedAt: new Date().toISOString(),
      verdict: null,
      verdictAt: null,
      forcedPaymentTxHash: null,
      judgeFeeCollected: null,
    };

    appendAppeal(resolvedTaskId, appealRecord);

    // Emit socket event immediately
    io.emit("appeal_filed", {
      taskId: resolvedTaskId,
      appealId,
      filedBy,
      issue,
      filingFeeTxHash,
    });

    // Respond immediately — judge evaluation happens async
    res.status(202).json({
      message: "Appeal filed. Filing fee paid. Judge is evaluating...",
      appealId,
      taskId: resolvedTaskId,
      filingFeeTxHash,
      status: "pending",
    });

    // ── Judge LLM Evaluation (async, non-blocking) ──────────────────────────
    evaluateAppeal(io, resolvedTaskId, appealId, filedBy, issue, taskRecord).catch((err) => {
      console.error(`❌ [courtRoutes] Appeal evaluation error for ${resolvedTaskId}:`, err);
    });
  });

  // ── GET /court/appeals ──────────────────────────────────────────────────────
  router.get("/appeals", (_req: Request, res: Response) => {
    const allRecords = getAllTaskRecords();
    const appeals = allRecords
      .filter((r) => r.appeals.length > 0)
      .flatMap((r) =>
        r.appeals.map((appeal) => ({
          taskId: r.taskId,
          taskTitle: r.title,
          taskStatus: r.status,
          ...appeal,
        }))
      )
      .sort((a, b) => new Date(b.filedAt).getTime() - new Date(a.filedAt).getTime());

    res.json({ count: appeals.length, appeals });
  });

  // ── GET /court/appeal/:taskId ────────────────────────────────────────────────
  router.get("/appeal/:taskId", (req: Request, res: Response) => {
    const taskId = String(req.params.taskId);

    let record = getTaskRecord(taskId);
    if (!record) record = getTaskRecordByInternalId(taskId);

    if (!record) {
      res.status(404).json({ error: `Task ID "${taskId}" not found` });
      return;
    }

    res.json({
      taskId: record.taskId,
      taskTitle: record.title,
      taskStatus: record.status,
      appeals: record.appeals,
      payments: record.payments,
    });
  });

  return router;
}

// ── Async Judge Evaluation ────────────────────────────────────────────────────

async function evaluateAppeal(
  io: any,
  taskId: string,
  appealId: string,
  filedBy: string,
  issue: string,
  taskRecord: ReturnType<typeof getTaskRecord>
): Promise<void> {
  if (!taskRecord) return;

  console.log(`⚖️  Judge LLM evaluating full history of task ${taskId}`);

  // Build full task context
  const taskContext = JSON.stringify(taskRecord, null, 2);

  const userPrompt = `A Supreme Court appeal has been filed.

Filed by: ${filedBy}
Issue raised: ${issue}
Filing fee paid: 3 USDC (confirmed)

Complete Task History for Task ID ${taskId}:
${taskContext}

Analyze this task history and determine:
1. Did the appealing agent complete their assigned work? (yes/no, evidence)
2. Was payment made to them as required? (yes/no, evidence from payments array)
3. Were any loans taken and not repaid despite sufficient balance? (yes/no)
4. Were any subcontracts hired but not paid after work completion? (yes/no)

Based ONLY on the task record evidence, respond in JSON only:
{
  "verdict": "in_favor_of_appellant" or "against_appellant",
  "evidence": "specific evidence from task record supporting verdict",
  "workCompleted": true or false,
  "paymentOwed": true or false,
  "amountOwed": 0,
  "forcedPaymentFrom": null or "agentInstanceId",
  "forcedPaymentTo": null or "agentInstanceId",
  "reasoning": "one paragraph explanation"
}`;

  let judgeResponseRaw = "";
  let verdict: {
    verdict: string;
    evidence: string;
    workCompleted: boolean;
    paymentOwed: boolean;
    amountOwed: number;
    forcedPaymentFrom: string | null;
    forcedPaymentTo: string | null;
    reasoning: string;
  } | null = null;

  try {
    judgeResponseRaw = await askJudge(JUDGE_SYSTEM_PROMPT, userPrompt);
    const jsonMatch = judgeResponseRaw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      verdict = JSON.parse(jsonMatch[0]);
    }
  } catch (err) {
    console.warn(`⚠️ [courtRoutes] Failed to parse judge response: ${(err as Error).message}`);
  }

  // Fallback verdict if LLM fails
  if (!verdict) {
    verdict = {
      verdict: "against_appellant",
      evidence: "Unable to evaluate task record — insufficient evidence",
      workCompleted: false,
      paymentOwed: false,
      amountOwed: 0,
      forcedPaymentFrom: null,
      forcedPaymentTo: null,
      reasoning:
        "The Supreme Court was unable to parse sufficient evidence from the task record. Appeal dismissed without prejudice.",
    };
  }

  console.log(`⚖️  Verdict: ${verdict.verdict} | Task ${taskId}`);

  const verdictAt = new Date().toISOString();
  let forcedPaymentTxHash: string | null = null;
  let judgeFeeCollected: number | null = null;

  // ── Forced Payment Execution ────────────────────────────────────────────────
  if (verdict.verdict === "in_favor_of_appellant" && verdict.paymentOwed && verdict.amountOwed > 0) {
    const fromAgentId = verdict.forcedPaymentFrom;
    const toAgentId = verdict.forcedPaymentTo || filedBy;

    const fromAgent = fromAgentId ? getAgent(fromAgentId) : null;
    const toAgent = getAgent(toAgentId);

    if (fromAgent && toAgent && fromAgent.walletId && toAgent.walletAddress) {
      const totalOwed = verdict.amountOwed;
      const judgeFee = parseFloat((totalOwed * 0.05).toFixed(6));
      const appellantReceives = parseFloat((totalOwed - judgeFee).toFixed(6));

      try {
        // Forced main payment (95% to appellant)
        const forcedResult = await makeNanopayment(
          appellantReceives,
          toAgent.walletAddress,
          fromAgent.walletId,
          `Supreme Court forced payment: Task ${taskId} verdict`
        );
        forcedPaymentTxHash = forcedResult.txHash;

        console.log(
          `⚖️  Supreme Court forced payment: ${appellantReceives} USDC from ${fromAgentId} to ${toAgentId}`
        );

        // Log forced payment to task record
        appendPayment(taskId, {
          from: fromAgentId || "unknown",
          to: toAgentId,
          amount: appellantReceives,
          txHash: forcedPaymentTxHash,
          reason: `Supreme Court forced payment — appeal ${appealId}`,
          timestamp: verdictAt,
        });

        // Judge fee (5%)
        const judgeWallet = getJudgeAgentWallet();
        if (judgeWallet) {
          const judgeFeeResult = await makeNanopayment(
            judgeFee,
            judgeWallet.walletAddress,
            fromAgent.walletId,
            `Judge fee (5%) for appeal ${appealId}`
          );
          judgeFeeCollected = judgeFee;

          console.log(`👨‍⚖️  Judge fee collected: ${judgeFee} USDC`);

          appendPayment(taskId, {
            from: fromAgentId || "unknown",
            to: judgeWallet.instanceId,
            amount: judgeFee,
            txHash: judgeFeeResult.txHash,
            reason: `Judge fee (5%) — appeal ${appealId}`,
            timestamp: verdictAt,
          });
        }
      } catch (err) {
        console.error(`❌ [courtRoutes] Forced payment failed: ${(err as Error).message}`);
      }
    }
  } else if (verdict.verdict === "against_appellant") {
    console.log(`⚖️  Appeal dismissed — no forced payment`);
  }

  // ── Update appeal record ────────────────────────────────────────────────────
  const record = getTaskRecord(taskId);
  if (record) {
    const appealIdx = record.appeals.findIndex((a) => a.appealId === appealId);
    if (appealIdx !== -1) {
      record.appeals[appealIdx] = {
        ...record.appeals[appealIdx],
        verdict: verdict.verdict,
        verdictAt,
        forcedPaymentTxHash,
        judgeFeeCollected,
        evidence: verdict.evidence,
        reasoning: verdict.reasoning,
        amountOwed: verdict.amountOwed,
      };
    }

    updateTaskRecord(taskId, {
      status: verdict.verdict === "in_favor_of_appellant" ? "resolved" : record.status,
    });

    console.log(`⚖️  Task ${taskId} status: ${verdict.verdict === "in_favor_of_appellant" ? "resolved" : record.status}`);
  }

  // ── Emit verdict event ──────────────────────────────────────────────────────
  io.emit("appeal_verdict", {
    taskId,
    appealId,
    filedBy,
    verdict: verdict.verdict,
    evidence: verdict.evidence,
    reasoning: verdict.reasoning,
    workCompleted: verdict.workCompleted,
    paymentOwed: verdict.paymentOwed,
    amountOwed: verdict.amountOwed,
    forcedPayment: forcedPaymentTxHash
      ? {
          txHash: forcedPaymentTxHash,
          from: verdict.forcedPaymentFrom,
          to: verdict.forcedPaymentTo || filedBy,
          amount: parseFloat((verdict.amountOwed * 0.95).toFixed(6)),
        }
      : null,
    judgeFee: judgeFeeCollected,
    verdictAt,
  });
}
