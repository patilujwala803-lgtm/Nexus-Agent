import { Task, Agent } from "./types.js";
import { getAllAgents, updateAgent } from "./agentRegistry.js";
import { makeNanopayment } from "../../circle/paymentService.js";
import { askClaude } from "../llm/claudeClient.js";

console.log("⚙️ [workExecutor] Module loading started (Phase 7 Extension)...");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Work Output Templates (fallback when Claude is unavailable) ───────────────

const WORK_TEMPLATES: Record<string, string[]> = {
  writing: [
    "Completed a high-quality article for '{taskTitle}'. The narrative is crafted to hook readers immediately and explain key concepts through clear analogies. A three-part structure flows smoothly from background to deep analysis and conclusion. Vocabulary is professional yet accessible for a wide audience.",
    "Drafted an in-depth creative blog post answering the prompt of '{taskTitle}'. The piece utilizes strong active verbs, bulleted summaries for quick scanning, and a compelling call to action. All required references are cleanly integrated. Word count fits precisely within target guidelines.",
    "Delivered a detailed narrative copy for '{taskTitle}'. The story focuses on user-centric benefits and answers core questions. It has been proofread for grammatical precision and semantic variety. Ready for final publication."
  ],
  research: [
    "Conducted extensive academic and empirical research on '{taskTitle}'. Evaluated five distinct primary sources and synthesized their findings. The final summary outlines historical precedents, current challenges, and potential future developments. Included citations for all statements of fact.",
    "Completed a market landscape survey for '{taskTitle}'. Compiled data on competitor platforms, pricing structures, and unique selling propositions. Identified three core trends shaping user adoption rates globally. Recommendations are backed by solid industry research.",
    "Generated a research brief detailing findings for '{taskTitle}'. Analyzed historical datasets and filtered out statistical anomalies. Identified three primary risk vectors and outlined mitigation strategies for each."
  ],
  data: [
    "Processed statistical datasets representing '{taskTitle}'. Cleaned duplicate records and handled missing data points using imputation techniques. Generated descriptive statistics including mean variance and standard deviations for all columns. Built a correlation matrix to identify strong variables.",
    "Performed structured analysis on the data payload of '{taskTitle}'. Executed SQL aggregation queries to isolate key metrics over the last quarter. Visualized distribution shifts using box plots and histograms. Uncovered a statistically significant trend in transaction counts.",
    "Completed a data metrics review for '{taskTitle}'. Checked pipeline logs for data quality issues and validated token movements. Formatted output into organized tables showing percentages and raw counts. Data integrity is confirmed."
  ],
  code: [
    "Implemented a robust and type-safe TypeScript module for '{taskTitle}'. The architecture uses dependency injection to ensure loose coupling. Complete error handling covers edge cases and network timeouts. Unit tests achieve 98% statement coverage.",
    "Created an automated server script addressing the requirements of '{taskTitle}'. The logic is non-blocking and processes arrays in parallel streams to maximize throughput. Included extensive logging triggers for system debugging.",
    "Developed a microservice prototype for '{taskTitle}'. Built using Express and TypeScript with structured routing paths. Verified payload parsing with robust validation schemas. Optimized database query indexes for low-latency response times."
  ],
  translation: [
    "Completed complete translation and localization for '{taskTitle}'. Preserved the tone and nuances of the original source text while adjusting idioms for target cultural alignment. Verified technical terminology against standard glossaries.",
    "Translated the technical documentation of '{taskTitle}' cleanly. Re-rendered complex grammatical constructs into natural-sounding prose in the target language. Ensured all formatting, headers, and code snippets remain unaffected.",
    "Delivered high-quality translated text for '{taskTitle}'. Managed vocabulary changes to fit industry-specific terminology. Eliminated literal translation errors in favor of semantic equivalence."
  ],
  summarization: [
    "Generated a concise summary and TL;DR for '{taskTitle}'. Extracted the top three findings and placed them at the very top as bullet points. Condensed 10 pages of raw technical text into three high-impact paragraphs.",
    "Compiled an executive summary for '{taskTitle}'. Isolated the primary problem statements, methodology, and results from the source material. Used bold highlights to emphasize critical milestones.",
    "Produced a condensed brief outlining the core themes of '{taskTitle}'. Structured with sections for main ideas, key metrics, and action items. The resulting text is punchy and easy to scan."
  ],
  copywriting: [
    "Developed conversion-focused copywriting for '{taskTitle}'. Structured around the AIDA framework to drive signups. Included three variation headlines for A/B testing campaigns.",
    "Created persuasive marketing copy for '{taskTitle}'. Optimized body text for email drip campaigns aimed at developer audiences. Built a strong narrative arc emphasizing performance gains.",
    "Crafted high-impact landing page copy for '{taskTitle}'. Maintained a clean visual hierarchy through punchy subheaders and list-based benefit explanations."
  ],
  seo: [
    "Completed a comprehensive SEO keyword optimization plan for '{taskTitle}'. Identified high-volume, low-competition keywords matching search intent. Re-structured page headers to map primary terms naturally.",
    "Conducted an SEO audit focusing on the requirements of '{taskTitle}'. Analyzed keyword density, image alt text, and crawlability parameters. Drafted clean recommendations to resolve duplicate content flags.",
    "Wrote optimized content containing search terms for '{taskTitle}'. Ensured natural flow while inserting target phrases in key focus areas."
  ],
  descriptions: [
    "Created a vivid and detailed description text for '{taskTitle}'. Painted a clear picture using descriptive, non-technical language to explain technical mechanics.",
    "Drafted structured description copy explaining the benefits of '{taskTitle}'. Outlined the user journey using relatable examples and step-by-step progressions.",
    "Produced a concise product description for '{taskTitle}'. Summarized key specs, target audience, and primary use cases in a friendly format."
  ],
  editing: [
    "Completed editing and proofreading for '{taskTitle}'. Rectified all grammatical bugs, punctuation anomalies, and sentence fragments. The document is polished and ready for submission.",
    "Edited a draft text representing '{taskTitle}'. Streamlined long-winded paragraphs and removed redundant claims to improve reading speed.",
    "Reviewed and refined copy flow for '{taskTitle}'. Enhanced transitions between key sections to ensure logical progression."
  ],
  "fact-checking": [
    "Fact-checked all claims in '{taskTitle}' against trusted sources. Verified historical timelines, statistical counts, and quotes for exact matches. Isolated two minor errors and corrected them with authoritative citations.",
    "Completed factual verification for '{taskTitle}'. Checked mathematical calculations and percentage calculations for errors. Referenced original source documents to cross-check credentials.",
    "Conducted factual audit on the claims of '{taskTitle}'. Examined original documentation to cross-examine bold assertions. Verified three independent data points to support the main thesis."
  ],
  testing: [
    "Completed comprehensive QA testing for '{taskTitle}'. Drafted five distinct test cases covering functional flow, input validation, and boundary conditions. Found and logged two minor UI bugs.",
    "Executed automated script tests addressing the requirements of '{taskTitle}'. Ran regression suites to confirm that updates do not break core APIs. Test results show all green marks.",
    "Conducted thorough testing run for '{taskTitle}'. Tested boundary inputs and negative test cases. Verified error handling routes return expected HTTP codes."
  ],
  compliance: [
    "Conducted a legal and policy compliance check for '{taskTitle}'. Analyzed terms against regulatory frameworks and standard compliance guidelines. Highlighted two clauses requiring amendment. The updated draft is fully compliant.",
    "Completed smart contract terms review for '{taskTitle}'. Verified contract definitions match state regulations. Provided a compliance report with key audit milestones. Risk score is low.",
    "Performed audit on policy terms of '{taskTitle}'. Evaluated the text for potential policy violations or misleading assertions."
  ],
  judging: [
    "Evaluated the submission package for '{taskTitle}'. Graded output across four dimensions: completeness, technical execution, readability, and speed. Provided constructive bulleted critique.",
    "Scored the task deliverables for '{taskTitle}'. Checked if all required criteria in the description were met cleanly. Drafted a detailed verdict outlining strengths and weaknesses.",
    "Completed judging review for '{taskTitle}'. Read the submitted content and cross-referenced with initial requirements. Grade assigned."
  ],
  default: [
    "Completed work on task '{taskTitle}' successfully. Followed the requirements specified in the description. Ensured accurate results and clear presentation throughout. Final output has been formatted cleanly.",
    "Delivered final deliverables for '{taskTitle}' following standard specifications. Checked for formatting errors and completed basic validation tests.",
    "Produced requested output for '{taskTitle}'. Worked through all listed steps and compiled results. Output has been proofread and is fully complete."
  ]
};

// ── Exported Work Functions ───────────────────────────────────────────────────

export function getWorkOutput(skill: string, taskTitle: string): string {
  console.log(`📝 [getWorkOutput] Generating fallback output for skill: ${skill}, task: "${taskTitle}"...`);
  const templates = WORK_TEMPLATES[skill] || WORK_TEMPLATES.default;
  const randomIndex = Math.floor(Math.random() * templates.length);
  const template = templates[randomIndex];
  const result = template.replace(/{taskTitle}/g, taskTitle);
  console.log(`📝 [getWorkOutput] Finished output generation for skill: ${skill}. Result length: ${result.length} characters.`);
  return result;
}

export async function executeWork(
  task: Task,
  workerAgent: Agent,
  io: any
): Promise<{ result: string; qualityScore: number }> {
  console.log(`⚙️ [executeWork] Starting work execution by agent: ${workerAgent.name} on task: "${task.title}"...`);

  // Step 1: Emit "economy:work_started"
  io.emit("economy:work_started", {
    taskId: task.id,
    agentId: workerAgent.instanceId,
    agentName: workerAgent.name,
    taskTitle: task.title
  });
  console.log(`⚙️ [executeWork] ${workerAgent.name} started work on: ${task.title}`);

  // Step 2: Work duration = random 8000-15000ms
  const workDuration = Math.floor(Math.random() * 7000 + 8000);
  console.log(`⚙️ [executeWork] Work will take ${workDuration}ms for task: ${task.id}`);
  await sleep(workDuration);

  // Step 3: Get output via Claude (with template fallback)
  const claudePrompt = `You are ${workerAgent.name}, an expert AI agent specializing in: ${workerAgent.skills.join(", ")}.

You have been assigned this task and must COMPLETE it — do not describe what you will do, actually DO IT:
Task: "${task.title}"
Brief: "${task.description}"

Deliver the ACTUAL completed work product in 4-6 sentences. Be specific, professional, and show real expertise. Write the output itself, not a summary of your actions.`;

  let result = await askClaude(claudePrompt);
  if (!result || result.includes("Nemotron is currently unavailable") || result.length < 20) {
    result = getWorkOutput(task.requiredSkill, task.title);
  }

  // Step 4: qualityScore = random 72-99 + qualityOffset
  let qualityScore = Math.floor(Math.random() * 28 + 72) + workerAgent.qualityOffset;

  // ── Sub-Contracting / Delegation Logic ────────────────────────────────────
  let subcontracted = false;
  let subverifier: Agent | null = null;
  const acceptedBid = task.bids.find(b => b.status === "accepted");
  const bidPrice = acceptedBid ? acceptedBid.bidAmountUSDC : task.budgetUSDC;
  const verifierFee = Math.max(1.00, parseFloat((bidPrice * 0.20).toFixed(6)));

  if (task.budgetUSDC >= 8.00 && workerAgent.role === "producer") {
    console.log(`🤝 [executeWork] Task budget is high (${task.budgetUSDC} USDC). Attempting delegation...`);
    const allAgents = getAllAgents();
    const idleVerifiers = allAgents.filter(a => a.role === "verifier" && a.status === "idle");

    if (idleVerifiers.length > 0 && workerAgent.usdcBalance >= verifierFee) {
      subverifier = idleVerifiers[0];
      subcontracted = true;

      updateAgent(subverifier.instanceId, { status: "busy" });

      // Emit economy:subcontract_hired (new Section 6 event)
      io.emit("economy:subcontract_hired", {
        primaryAgentId: workerAgent.instanceId,
        primaryAgentName: workerAgent.name,
        subAgentId: subverifier.instanceId,
        subAgentName: subverifier.name,
        fee: verifierFee,
        taskId: task.id
      });

      // Also keep backward compat event
      io.emit("economy:subcontract_started", {
        taskId: task.id,
        workerId: workerAgent.instanceId,
        workerName: workerAgent.name,
        subcontractorId: subverifier.instanceId,
        subcontractorName: subverifier.name,
        fee: verifierFee
      });
      console.log(`🤝 [executeWork] Worker ${workerAgent.name} subcontracting work to ${subverifier.name} for ${verifierFee} USDC...`);

      const payResult = await makeNanopayment(
        verifierFee,
        subverifier.walletAddress,
        workerAgent.walletId,
        `Subcontract: ${workerAgent.instanceId.slice(0, 10)} hired ${subverifier.instanceId.slice(0, 10)}`
      );

      updateAgent(workerAgent.instanceId, {
        usdcBalance: parseFloat((workerAgent.usdcBalance - verifierFee).toFixed(6)),
        totalSpent: parseFloat((workerAgent.totalSpent + verifierFee).toFixed(6))
      });

      updateAgent(subverifier.instanceId, {
        usdcBalance: parseFloat((subverifier.usdcBalance + verifierFee).toFixed(6)),
        totalEarned: parseFloat((subverifier.totalEarned + verifierFee).toFixed(6)),
        jobsCompleted: subverifier.jobsCompleted + 1
      });

      await sleep(1000);

      qualityScore = qualityScore + 5;

      updateAgent(subverifier.instanceId, { status: "idle" });

      io.emit("economy:subcontract_completed", {
        taskId: task.id,
        subcontractorId: subverifier.instanceId,
        subcontractorName: subverifier.name,
        txHash: payResult.txHash,
        isMock: payResult.isMock
      });
      console.log(`🤝 [executeWork] Subcontract complete. TxHash: ${payResult.txHash} (isMock: ${payResult.isMock})`);
    }
  }

  // Clamp qualityScore to maximum 100
  qualityScore = Math.min(100, qualityScore);

  // Step 5: Emit "economy:work_completed"
  io.emit("economy:work_completed", {
    taskId: task.id,
    agentId: workerAgent.instanceId,
    result,
    taskTitle: task.title,
    subcontracted,
    subcontractorName: subverifier?.name || null
  });
  console.log(`📝 [executeWork] ${workerAgent.name} completed work on: ${task.title}. Quality: ${qualityScore}`);

  console.log(`⚙️ [executeWork] Finished work execution. Quality Score: ${qualityScore}/100`);
  return { result, qualityScore };
}
