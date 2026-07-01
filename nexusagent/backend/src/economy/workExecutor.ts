import { Task, Agent } from "./types.js";
import { getAllAgents, updateAgent } from "./agentRegistry.js";
import { makeNanopayment } from "../../circle/paymentService.js";

console.log("⚙️ [workExecutor] Module loading started (Phase 7 Extension)...");

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ── Work Output Templates ─────────────────────────────────────────────────────

const WORK_TEMPLATES: Record<string, string[]> = {
  writing: [
    "Completed a high-quality article for '{taskTitle}'. The narrative is crafted to hook readers immediately and explain key concepts through clear analogies. A three-part structure flows smoothly from background to deep analysis and conclusion. Vocabulary is professional yet accessible for a wide audience. Overall readability scores indicate high engagement potential.",
    "Drafted an in-depth creative blog post answering the prompt of '{taskTitle}'. The piece utilizes strong active verbs, bulleted summaries for quick scanning, and a compelling call to action. All required references are cleanly integrated into the body of the article. Word count fits precisely within target guidelines. Final polish and layout styling are complete.",
    "Delivered a detailed narrative copy for '{taskTitle}'. The story focuses on user-centric benefits and answers core questions. It has been proofread for grammatical precision and semantic variety. Key phrases are positioned naturally to assist flow. Ready for final publication."
  ],
  research: [
    "Conducted extensive academic and empirical research on '{taskTitle}'. Evaluated five distinct primary sources and synthesized their findings on key metrics. The final summary outlines historical precedents, current challenges, and potential future developments. Double-checked all statistical datasets for consistency. Included citations for all statements of fact.",
    "Completed a market landscape survey for '{taskTitle}'. Compiled data on competitor platforms, pricing structures, and unique selling propositions. Identified three core trends shaping user adoption rates globally. The compiled briefing note is structured for executive review. Recommendations are backed by solid industry research.",
    "Generated a research brief detailing findings for '{taskTitle}'. Analyzed historical datasets and filtered out statistical anomalies. Identified three primary risk vectors and outlined mitigation strategies for each. Information has been consolidated into a clean, bulleted format. References are verified and accurate."
  ],
  data: [
    "Processed statistical datasets representing '{taskTitle}'. Cleaned duplicate records and handled missing data points using imputation techniques. Generated descriptive statistics including mean variance and standard deviations for all columns. Built a correlation matrix to identify strong variables. Data is ready for ingestion by downstream models.",
    "Performed structured analysis on the data payload of '{taskTitle}'. Executed SQL aggregation queries to isolate key metrics over the last quarter. Visualized distribution shifts using box plots and histograms. Uncovered a statistically significant trend in transaction counts. Findings have been exported in a standardized report format.",
    "Completed a data metrics review for '{taskTitle}'. Checked pipeline logs for data quality issues and validated token movements. Formatted output into organized tables showing percentages and raw counts. Extrapolated growth models for the next three quarters based on current run-rates. Data integrity is confirmed."
  ],
  code: [
    "Implemented a robust and type-safe TypeScript module for '{taskTitle}'. The architecture uses dependency injection to ensure loose coupling between database and route layers. Complete error handling covers edge cases and network timeouts. Unit tests achieve 98% statement coverage. Source code is thoroughly documented and matches standard linting rules.",
    "Created an automated server script addressing the requirements of '{taskTitle}'. The logic is non-blocking and processes arrays in parallel streams to maximize throughput. Included extensive logging triggers for system debugging. Secrets and environment configuration are handled securely. Integration tests completed successfully.",
    "Developed a microservice prototype for '{taskTitle}'. Built using Express and TypeScript with structured routing paths. Verified payload parsing with robust validation schemas. Optimized database query indexes for low-latency response times. Ready for containerization and staging deploy."
  ],
  translation: [
    "Completed complete translation and localization for '{taskTitle}'. Preserved the tone and nuances of the original source text while adjusting idioms for target cultural alignment. Verified technical terminology against standard glossaries. Double-checked slate structure for native readability. The localized document is ready for review.",
    "Translated the technical documentation of '{taskTitle}' cleanly. Re-rendered complex grammatical constructs into natural-sounding prose in the target language. Ensured all formatting, headers, and code snippets remain unaffected. The output flows naturally and is fully readable. Checked by a bilingual proofreader.",
    "Delivered high-quality translated text for '{taskTitle}'. Managed vocabulary changes to fit industry-specific terminology. Eliminated literal translation errors in favor of semantic equivalence. Checked alignment of all sections. Final review completed with high accuracy."
  ],
  summarization: [
    "Generated a concise summary and TL;DR summary for '{taskTitle}'. Extracted the top three findings and placed them at the very top as bullet points. Condensed 10 pages of raw technical text into three high-impact paragraphs. Removed fluff while keeping all critical statistics. Perfect for a quick briefing.",
    "Compiled a executive summary for '{taskTitle}'. Isolated the primary problem statements, methodology, and results from the source material. Used bold highlights to emphasize critical milestones. Kept vocabulary simple and direct. The final writeup fits onto a single page.",
    "Produced a condensed brief outlining the core themes of '{taskTitle}'. Structured with sections for main ideas, key metrics, and action items. Trimmed redundant explanations and consolidated parallel arguments. The resulting text is punchy and easy to scan."
  ],
  copywriting: [
    "Developed conversion-focused copywriting for '{taskTitle}'. Structured around the AIDA framework (Attention, Interest, Desire, Action) to drive signups. Included three variation headlines for A/B testing campaigns. The copy highlights user pain points and introduces our solution as the clear winner. Checked for clear flow.",
    "Created persuasive marketing copy for '{taskTitle}'. Optimized body text for email drip campaigns aimed at developer audiences. Built a strong narrative arc emphasizing performance gains. Drafted clear and active calls to action. Tone is engaging and authoritative.",
    "Crafted high-impact landing page copy for '{taskTitle}'. Maintained a clean visual hierarchy through punchy subheaders and list-based benefit explanations. Focused copy points on immediate value propositions. Eliminated industry buzzwords in favor of clear language. Ready for web implementation."
  ],
  seo: [
    "Completed a comprehensive SEO keyword optimization plan for '{taskTitle}'. Identified high-volume, low-competition keywords matching search intent. Re-structured page headers (H1, H2, H3) to map primary terms naturally. Wrote optimized meta titles and description snippets. Included recommendations for internal linking patterns.",
    "Conducted an SEO audit focusing on the requirements of '{taskTitle}'. Analyzed keyword density, image alt text, and crawlability parameters. Drafted clean recommendations to resolve duplicate content flags. Formatted copy structure to maximize search engine indexing. Target ranking opportunities identified.",
    "Wrote optimized content containing search terms for '{taskTitle}'. Ensured natural flow while inserting target phrases in key focus areas. Re-wrote image descriptions and meta parameters to improve search visibility. The resulting text meets modern search optimization standards."
  ],
  descriptions: [
    "Created a vivid and detailed description text for '{taskTitle}'. Painted a clear picture using descriptive, non-technical language to explain technical mechanics. Maintained a balanced tone suitable for general audiences. Re-framed complex architecture into an intuitive layout. Ready for public release.",
    "Drafted structured description copy explaining the benefits of '{taskTitle}'. Outlined the user journey using relatable examples and step-by-step progressions. Kept paragraphs short and focused on sensory details. Fully describes system capabilities clearly.",
    "Produced a concise product description for '{taskTitle}'. Summarized key specs, target audience, and primary use cases in a friendly format. Used bulleted features for quick readability. Tone is helpful and educational."
  ],
  editing: [
    "Completed editing and proofreading for '{taskTitle}'. Rectified all grammatical bugs, punctuation anomalies, and sentence fragments. Adjusted word choices to enhance flow and structural flow. Standardized styling across all headings. The document is polished and ready for submission.",
    "Edited a draft text representing '{taskTitle}'. Streamlined long-winded paragraphs and removed redundant claims to improve reading speed. Polished technical terms for exact accuracy. Corrected formatting inconsistencies. The final text is highly readable.",
    "Reviewed and refined copy flow for '{taskTitle}'. Enhanced transitions between key sections to ensure logical progression. Polished tone to match high professional standards. Handled structural adjustments to guarantee clarity. Final check complete."
  ],
  "fact-checking": [
    "Fact-checked all claims in '{taskTitle}' against trusted sources. Verified historical timelines, statistical counts, and quotes for exact matches. Isolated two minor errors and corrected them with authoritative citations. Logged verification details in an organized log. Data accuracy is confirmed.",
    "Completed factual verification for '{taskTitle}'. Checked mathematical calculations and percentage calculations for errors. Referenced original source documents to cross-check credentials and dates. Provided direct links to corroborating databases. Verified content is error-free.",
    "Conducted factual audit on the claims of '{taskTitle}'. Examined original documentation to cross-examine bold assertions. Verified three independent data points to support the main thesis. Generated an accuracy report confirming compliance with factual standards."
  ],
  testing: [
    "Completed comprehensive QA testing for '{taskTitle}'. Drafted five distinct test cases covering functional flow, input validation, and boundary conditions. Found and logged two minor UI bugs in the tracking sheet. Executed smoke tests to ensure system stability. Staging environment is healthy.",
    "Executed automated script tests addressing the requirements of '{taskTitle}'. Ran regression suites to confirm that updates do not break core APIs. Monitored server logs for performance spikes and database queries. Test results show all green marks. Ready for release.",
    "Conducted thorough testing run for '{taskTitle}'. Tested boundary inputs and negative test cases. Verified error handling routes return expected HTTP codes. Confirmed frontend components respond correctly under high latencies. The build is verified stable."
  ],
  compliance: [
    "Conducted a legal and policy compliance check for '{taskTitle}'. Analyzed terms against regulatory frameworks and standard compliance guidelines. Checked privacy clauses and data collection declarations. Highlighted two clauses requiring amendment. The updated draft is fully compliant.",
    "Completed smart contract terms review for '{taskTitle}'. Verified contract definitions match state regulations. Evaluated user authentication processes to ensure adherence to data safety standards. Provided a compliance report with key audit milestones. Risk score is low.",
    "Performed audit on policy terms of '{taskTitle}'. Evaluated the text for potential policy violations or misleading assertions. Ensured appropriate disclaimers are placed clearly in target sections. Document is certified compliant."
  ],
  judging: [
    "Evaluated the submission package for '{taskTitle}'. Graded output across four dimensions: completeness, technical execution, readability, and speed. Provided constructive bulleted critique for the builder. Assigned scores reflecting objective criteria. Evaluation is complete.",
    "Scored the task deliverables for '{taskTitle}'. Checked if all required criteria in the description were met cleanly. Compared results against reference deliverables. Drafted a detailed verdict outlining strengths and weaknesses. Score is finalized.",
    "Completed judging review for '{taskTitle}'. Read the submitted content and cross-referenced with initial requirements. Evaluated readability and factual accuracy. Left comprehensive scoring rationale in the project system. Grade assigned."
  ],
  default: [
    "Completed work on task '{taskTitle}' successfully. Followed the requirements specified in the description. Ensured accurate results and clear presentation throughout. Final output has been formatted cleanly and is ready for integration.",
    "Delivered final deliverables for '{taskTitle}' following standard specifications. Checked for formatting errors and completed basic validation tests. The result meets the requirements outline. Ready for execution review.",
    "Produced requested output for '{taskTitle}'. Worked through all listed steps and compiled results. Kept structure simple and language direct. Output has been proofread and is fully complete."
  ]
};

// ── Exported Work Functions ───────────────────────────────────────────────────

export function getWorkOutput(skill: string, taskTitle: string): string {
  console.log(`📝 [getWorkOutput] Starting output generation for skill: ${skill}, task: "${taskTitle}"...`);
  
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
  const workDuration = Math.floor(Math.random() * 7000 + 8000); // 8000 to 15000ms
  console.log(`⚙️ [executeWork] Work will take ${workDuration}ms for task: ${task.id}`);
  await sleep(workDuration);

  // Step 3: Get output from getWorkOutput
  const result = getWorkOutput(task.requiredSkill, task.title);

  // Step 4: qualityScore = random 72-99 + qualityOffset (Phase 7 Education improvement)
  let qualityScore = Math.floor(Math.random() * 28 + 72) + workerAgent.qualityOffset;

  // ── Sub-Contracting / Delegation Logic (Phase 7) ───────────────────────────
  let subcontracted = false;
  let subverifier: Agent | null = null;
  const acceptedBid = task.bids.find(b => b.status === "accepted");
  const bidPrice = acceptedBid ? acceptedBid.bidAmountUSDC : task.budgetUSDC;
  const verifierFee = parseFloat((bidPrice * 0.20).toFixed(6));

  if (task.budgetUSDC >= 0.008 && workerAgent.role === "producer") {
    console.log(`🤝 [executeWork] Task budget is high (${task.budgetUSDC} USDC). Attempting delegation...`);
    const allAgents = getAllAgents();
    const idleVerifiers = allAgents.filter(a => a.role === "verifier" && a.status === "idle");
    
    if (idleVerifiers.length > 0 && workerAgent.usdcBalance >= verifierFee) {
      subverifier = idleVerifiers[0];
      subcontracted = true;

      // Update subcontractor status to busy
      updateAgent(subverifier.instanceId, { status: "busy" });

      // Emit "economy:subcontract_started"
      io.emit("economy:subcontract_started", {
        taskId: task.id,
        workerId: workerAgent.instanceId,
        workerName: workerAgent.name,
        subcontractorId: subverifier.instanceId,
        subcontractorName: subverifier.name,
        fee: verifierFee
      });
      console.log(`🤝 [executeWork] Worker ${workerAgent.name} subcontracting work to ${subverifier.name} for ${verifierFee} USDC...`);

      // Execute actual Circle payment with mock fallback
      const payResult = await makeNanopayment(
        verifierFee,
        subverifier.walletAddress,
        workerAgent.walletId,
        `Subcontract: ${workerAgent.instanceId.slice(0,10)} hired ${subverifier.instanceId.slice(0,10)}`
      );

      // Update worker balance
      updateAgent(workerAgent.instanceId, {
        usdcBalance: parseFloat((workerAgent.usdcBalance - verifierFee).toFixed(6)),
        totalSpent: parseFloat((workerAgent.totalSpent + verifierFee).toFixed(6))
      });

      // Update subcontractor balance
      updateAgent(subverifier.instanceId, {
        usdcBalance: parseFloat((subverifier.usdcBalance + verifierFee).toFixed(6)),
        totalEarned: parseFloat((subverifier.totalEarned + verifierFee).toFixed(6)),
        jobsCompleted: subverifier.jobsCompleted + 1
      });

      // Simulate subcontractor validation time (1 second)
      await sleep(1000);

      // Boost quality score by +5 points
      qualityScore = qualityScore + 5;

      // Update subcontractor back to idle
      updateAgent(subverifier.instanceId, { status: "idle" });

      // Emit "economy:subcontract_completed"
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
