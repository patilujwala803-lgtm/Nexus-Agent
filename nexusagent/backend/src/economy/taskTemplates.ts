/**
 * taskTemplates.ts
 * 100 diverse task templates with stateful non-repeating TaskPicker.
 */

export type TaskVariant = "normal" | "guild" | "court" | "subcontract" | "loan" | "education";
export type TaskTier = "easy" | "medium" | "complex";

export interface TaskTemplate {
  title: string;
  description: string;
  requiredSkill: string;
  budgetUSDC: number;
  tier: TaskTier;
  taskVariant: TaskVariant;
  forceGuild?: boolean;
  forceCourt?: boolean;
  forceSubcontract?: boolean;
  requiresCertification?: boolean;
  preferLowBalance?: boolean;
}

// ── 100 Task Templates ────────────────────────────────────────────────────────

export const TASK_TEMPLATES: TaskTemplate[] = [
  // ══════════════════════════════════
  // GUILD TASKS (1–25) — forceGuild: true, complex
  // ══════════════════════════════════
  {
    title: "Build a full DeFi protocol landing page with legal audit",
    description: "Design and write conversion copy for a DeFi protocol homepage, then conduct a full compliance and legal audit of all claims made on the page. Requires both copywriting and compliance expertise.",
    requiredSkill: "copywriting",
    budgetUSDC: 18.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Develop and SEO-optimize a stablecoin investment whitepaper",
    description: "Write a comprehensive 3000-word whitepaper on stablecoin investment strategies, then conduct a full SEO audit and keyword optimization pass to maximize organic reach.",
    requiredSkill: "writing",
    budgetUSDC: 16.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Code and QA test a Circle SDK wallet integration module",
    description: "Build a complete Node.js integration module for Circle Developer Controlled Wallets with full test coverage, edge case handling, and a QA validation report.",
    requiredSkill: "code",
    budgetUSDC: 19.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Research and statistically analyze Arc blockchain adoption",
    description: "Conduct deep market research into Arc blockchain developer adoption rates, then perform a full statistical analysis with charts, projections, and a written executive summary.",
    requiredSkill: "research",
    budgetUSDC: 15.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Translate and fact-check the Circle USDC technical docs",
    description: "Translate the full Circle USDC developer documentation into Spanish and Mandarin, then conduct a cross-language fact-checking pass to ensure technical accuracy is preserved.",
    requiredSkill: "translation",
    budgetUSDC: 17.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Write and professionally edit a DeFi investor pitch deck",
    description: "Draft a compelling 15-slide investor pitch deck for a DeFi startup raising a Series A, then conduct a full editorial polish including grammar, flow, narrative arc, and visual copy suggestions.",
    requiredSkill: "writing",
    budgetUSDC: 14.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Build and compliance-check a crypto payroll smart contract",
    description: "Code a Solidity smart contract for automated crypto payroll distribution, then conduct a full legal and regulatory compliance review covering AML, KYC, and employment law considerations.",
    requiredSkill: "code",
    budgetUSDC: 20.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Analyze and create visual descriptions of USDC flow data",
    description: "Pull and analyze six months of on-chain USDC transaction data from Arc testnet, then write rich visual prose descriptions of the findings suitable for a non-technical executive audience.",
    requiredSkill: "data",
    budgetUSDC: 13.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Research competitors and write positioning copy for NexusAgent",
    description: "Conduct a full competitive analysis of five AI agent economy platforms, then write sharp positioning copy and a unique value proposition statement for NexusAgent based on the findings.",
    requiredSkill: "research",
    budgetUSDC: 15.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Summarize and SEO-tag 50 DeFi research papers",
    description: "Read and produce concise TL;DR summaries of 50 academic DeFi research papers, then generate optimized SEO title tags and meta descriptions for each to maximize discoverability.",
    requiredSkill: "summarization",
    budgetUSDC: 14.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Localize and QA test the NexusAgent UI for Arabic markets",
    description: "Translate the complete NexusAgent frontend UI strings into Arabic including RTL layout considerations, then conduct a full QA pass testing all UI states in the localized version.",
    requiredSkill: "translation",
    budgetUSDC: 16.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Write and fact-check an investigative report on stablecoin risks",
    description: "Author a 2500-word investigative journalism piece on systemic risks in the stablecoin ecosystem, then conduct rigorous fact-checking of all claims, statistics, and source attributions.",
    requiredSkill: "writing",
    budgetUSDC: 15.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Code and document a multi-signature wallet approval system",
    description: "Build a complete multi-sig wallet approval workflow using Circle APIs, then write full technical documentation including architecture diagrams described in prose and integration guides.",
    requiredSkill: "code",
    budgetUSDC: 18.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Conduct market research and edit a crypto VC funding report",
    description: "Research Q2 2026 crypto venture capital funding trends across 20 deals, compile findings into a structured report, then perform a complete editorial review for clarity, accuracy, and flow.",
    requiredSkill: "research",
    budgetUSDC: 13.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Analyze stablecoin data and write compliance certification report",
    description: "Perform statistical analysis on USDC reserve ratios and collateralization data, then write a formal compliance certification report meeting international financial reporting standards.",
    requiredSkill: "data",
    budgetUSDC: 17.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Create marketing copy and visual descriptions for Arc ecosystem",
    description: "Write a full suite of marketing copy for the Arc blockchain ecosystem including taglines, value propositions, and feature descriptions, paired with vivid visual prose for each key concept.",
    requiredSkill: "copywriting",
    budgetUSDC: 12.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Summarize legal documents and check regulatory compliance",
    description: "Condense 15 dense cryptocurrency regulatory documents into executive summaries, then cross-check each against current compliance requirements in the UAE, EU, and US jurisdictions.",
    requiredSkill: "summarization",
    budgetUSDC: 16.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Build a crypto portfolio tracker and SEO optimize its landing page",
    description: "Code a full-featured crypto portfolio tracking application with Circle wallet integration, then write and SEO-optimize the complete landing page copy to rank for target keywords.",
    requiredSkill: "code",
    budgetUSDC: 19.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Translate whitepaper and provide data analysis of market fit",
    description: "Translate a 40-page DeFi protocol whitepaper into Portuguese and Japanese, then conduct a quantitative market fit analysis using adoption data from comparable protocols at launch.",
    requiredSkill: "translation",
    budgetUSDC: 15.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Research and QA test an AI agent payment API integration",
    description: "Research best practices for AI agent autonomous payment systems across five existing implementations, then design and execute a comprehensive QA test suite for a new payment API integration.",
    requiredSkill: "research",
    budgetUSDC: 14.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Write editorial content and fact-check for crypto news platform",
    description: "Produce five long-form editorial articles on emerging DeFi trends for a leading crypto news platform, then conduct full fact-checking on all statistical claims and source attributions across all five pieces.",
    requiredSkill: "writing",
    budgetUSDC: 16.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Summarize market data and write visual investor briefing",
    description: "Condense six months of Circle USDC market data into key insights and trend summaries, then write a visually descriptive investor briefing document that communicates findings without charts.",
    requiredSkill: "summarization",
    budgetUSDC: 13.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Build compliance reporting tool and translate output to French",
    description: "Develop an automated compliance report generation tool using Circle transaction data, then translate the full generated output into French for submission to European regulatory authorities.",
    requiredSkill: "code",
    budgetUSDC: 18.00,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Analyze agent economy metrics and write SEO content strategy",
    description: "Perform deep statistical analysis of NexusAgent economy performance metrics over 30 days, then develop a full SEO content strategy based on the findings targeting developer and investor audiences.",
    requiredSkill: "data",
    budgetUSDC: 14.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },
  {
    title: "Edit technical documentation and create QA validation framework",
    description: "Conduct a complete editorial overhaul of the NexusAgent technical documentation covering all API endpoints and SDK methods, then design a QA validation framework to ensure ongoing documentation accuracy.",
    requiredSkill: "editing",
    budgetUSDC: 15.50,
    tier: "complex",
    taskVariant: "guild",
    forceGuild: true,
  },

  // ══════════════════════════════════
  // COURT TASKS (26–45) — forceCourt: true, complex
  // ══════════════════════════════════
  {
    title: "Audit and certify NexusAgent smart contracts for mainnet",
    description: "Conduct a full security and compliance audit of all NexusAgent smart contracts, producing a formal certification report suitable for mainnet deployment review.",
    requiredSkill: "compliance",
    budgetUSDC: 16.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Formally evaluate and rate 10 AI agent economy submissions",
    description: "Assess and assign formal quality ratings to ten AI agent economy hackathon submissions using a standardized rubric covering technical merit, originality, and Circle tool usage.",
    requiredSkill: "judging",
    budgetUSDC: 14.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Fact-check all statistical claims in the Arc blockchain docs",
    description: "Audit every numerical claim, performance benchmark, and statistical assertion in the Arc blockchain official documentation against primary sources and on-chain data.",
    requiredSkill: "fact-checking",
    budgetUSDC: 13.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Legal compliance review of a DeFi token launch structure",
    description: "Provide a comprehensive legal compliance assessment of a proposed DeFi token launch covering securities law, AML requirements, KYC obligations, and cross-border regulatory exposure.",
    requiredSkill: "compliance",
    budgetUSDC: 17.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Judge and rank five AI-generated DeFi research reports",
    description: "Evaluate five AI-generated DeFi research reports on a standardized quality scoring framework assessing accuracy, depth, citation quality, and actionable insights.",
    requiredSkill: "judging",
    budgetUSDC: 12.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Verify accuracy of Circle USDC reserve attestation report",
    description: "Cross-verify every figure, percentage, and claim in the latest Circle USDC reserve attestation report against publicly available blockchain data and auditor filings.",
    requiredSkill: "fact-checking",
    budgetUSDC: 15.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Compliance audit of a cross-border stablecoin payment system",
    description: "Conduct a multi-jurisdiction compliance audit of a proposed cross-border stablecoin payment corridor covering UAE, Singapore, and EU regulatory frameworks.",
    requiredSkill: "compliance",
    budgetUSDC: 18.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Evaluate technical quality of five blockchain developer tools",
    description: "Formally assess five blockchain developer tools on technical quality, developer experience, documentation completeness, and production readiness using a standardized evaluation framework.",
    requiredSkill: "judging",
    budgetUSDC: 13.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Fact-check a viral crypto Twitter thread for accuracy",
    description: "Systematically verify every factual claim, statistic, and assertion made across a 40-tweet viral crypto thread that has reached over 2 million impressions.",
    requiredSkill: "fact-checking",
    budgetUSDC: 10.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Regulatory compliance check of an AI agent payment protocol",
    description: "Review an AI autonomous payment protocol against current financial regulatory requirements across five jurisdictions, identifying compliance gaps and required remediations.",
    requiredSkill: "compliance",
    budgetUSDC: 16.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Judge the quality of NexusAgent economy simulation outputs",
    description: "Evaluate the quality, realism, and economic coherence of NexusAgent simulation outputs across 20 completed task cycles using a formal assessment framework.",
    requiredSkill: "judging",
    budgetUSDC: 14.50,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Verify claims in a stablecoin yield farming strategy guide",
    description: "Fact-check all yield projections, risk assessments, protocol safety claims, and historical performance data cited in a popular stablecoin yield farming strategy guide.",
    requiredSkill: "fact-checking",
    budgetUSDC: 11.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Compliance review of tokenized real estate investment platform",
    description: "Conduct a full legal and regulatory compliance review of a tokenized real estate investment platform operating across the UAE and GCC region under VARA and ADGM frameworks.",
    requiredSkill: "compliance",
    budgetUSDC: 17.50,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Formal assessment of AI agent bid scoring algorithms",
    description: "Evaluate the fairness, efficiency, and economic optimality of five different AI agent bid scoring algorithms used in autonomous marketplace systems.",
    requiredSkill: "judging",
    budgetUSDC: 13.50,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Fact-check an academic paper on DeFi systemic risk",
    description: "Conduct a rigorous academic fact-check of a peer-review submission on DeFi systemic risk, verifying all cited data, mathematical models, and conclusions against primary sources.",
    requiredSkill: "fact-checking",
    budgetUSDC: 12.50,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Audit smart contract compliance for Circle Arc deployment",
    description: "Perform a comprehensive compliance audit of a smart contract suite being prepared for production deployment on Circle Arc, covering security, legal, and regulatory requirements.",
    requiredSkill: "compliance",
    budgetUSDC: 15.50,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Judge and certify outputs from 8 competing AI writing agents",
    description: "Formally evaluate and certify outputs from eight competing AI writing agents on a standardized quality rubric, producing signed certification scores for each.",
    requiredSkill: "judging",
    budgetUSDC: 14.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Verify statistical integrity of a crypto market research report",
    description: "Audit the statistical methodology, data sources, sample sizes, and analytical conclusions of a widely-cited crypto market research report for accuracy and integrity.",
    requiredSkill: "fact-checking",
    budgetUSDC: 11.50,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Compliance certification for an automated USDC payroll system",
    description: "Review and certify that an automated USDC payroll disbursement system meets all applicable employment law, tax reporting, and AML compliance requirements across three jurisdictions.",
    requiredSkill: "compliance",
    budgetUSDC: 16.50,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },
  {
    title: "Evaluate and score a batch of AI-generated compliance reports",
    description: "Assess the quality, accuracy, and regulatory adequacy of fifteen AI-generated compliance reports submitted for a DeFi protocol audit, scoring each on a standardized framework.",
    requiredSkill: "judging",
    budgetUSDC: 15.00,
    tier: "complex",
    taskVariant: "court",
    forceCourt: true,
  },

  // ══════════════════════════════════
  // SUBCONTRACT TASKS (46–65) — forceSubcontract: true, medium
  // ══════════════════════════════════
  {
    title: "Write a comprehensive DeFi onboarding guide for beginners",
    description: "Produce a complete beginner-friendly DeFi onboarding guide covering wallets, stablecoins, yield farming, and risk management in clear accessible language.",
    requiredSkill: "writing",
    budgetUSDC: 10.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Code an automated USDC balance monitoring dashboard",
    description: "Build a real-time USDC balance monitoring dashboard using Circle APIs with alerts for low balance thresholds and transaction history display.",
    requiredSkill: "code",
    budgetUSDC: 12.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Research and compile a report on AI agent payment standards",
    description: "Investigate and document emerging payment standards for autonomous AI agents including HTTP 402, micropayment channels, and on-chain settlement protocols.",
    requiredSkill: "research",
    budgetUSDC: 9.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Write marketing copy for a stablecoin remittance app",
    description: "Create full marketing copy for a UAE-focused stablecoin remittance application targeting the expat worker corridor including taglines, app store descriptions, and social media copy.",
    requiredSkill: "copywriting",
    budgetUSDC: 8.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Analyze on-chain data for USDC transaction patterns",
    description: "Examine Arc testnet transaction data to identify USDC flow patterns, peak usage periods, average transaction sizes, and common wallet behaviors.",
    requiredSkill: "data",
    budgetUSDC: 11.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Write a technical blog series on Circle Developer tools",
    description: "Produce a five-part developer-focused blog series covering Circle Wallets, Nanopayments, CCTP, Gateway, and Arc testnet with code examples and integration tips.",
    requiredSkill: "writing",
    budgetUSDC: 10.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Build a Circle wallet management CLI tool",
    description: "Develop a command-line interface tool for managing Circle Developer-Controlled Wallets including balance checks, transfer initiation, and transaction history queries.",
    requiredSkill: "code",
    budgetUSDC: 13.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Research regulatory landscape for AI autonomous payments",
    description: "Survey the current global regulatory landscape for AI agents making autonomous financial transactions, covering ten jurisdictions and their current and proposed frameworks.",
    requiredSkill: "research",
    budgetUSDC: 9.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Write SEO-optimized content for Arc blockchain developer hub",
    description: "Produce fifteen SEO-optimized developer documentation articles for the Arc blockchain developer hub targeting high-volume developer search queries.",
    requiredSkill: "writing",
    budgetUSDC: 11.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Code a multi-agent task assignment algorithm",
    description: "Implement a scoring-based task assignment algorithm that matches tasks to agents based on skill, reputation, and availability with full unit test coverage.",
    requiredSkill: "code",
    budgetUSDC: 14.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Research and summarize top 20 DeFi protocols by TVL",
    description: "Investigate and produce detailed summaries of the top 20 DeFi protocols by total value locked, covering architecture, tokenomics, risk profile, and recent performance.",
    requiredSkill: "research",
    budgetUSDC: 8.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Write a narrative case study on NexusAgent economy",
    description: "Author a compelling narrative case study documenting the NexusAgent economy in action, telling the story of a complete task cycle from spawn through settlement in vivid detail.",
    requiredSkill: "writing",
    budgetUSDC: 9.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Build a reputation scoring API for AI agents",
    description: "Design and implement a RESTful API for calculating and updating AI agent reputation scores based on job completion rate, quality scores, and economic behavior.",
    requiredSkill: "code",
    budgetUSDC: 12.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Research history of autonomous economic agents in AI",
    description: "Conduct a thorough academic research review of the history of autonomous economic agents in AI from early game theory applications through modern multi-agent reinforcement learning systems.",
    requiredSkill: "research",
    budgetUSDC: 10.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Write product documentation for NexusAgent API endpoints",
    description: "Produce complete developer-facing documentation for all NexusAgent REST API endpoints including request formats, response schemas, error codes, and integration examples.",
    requiredSkill: "writing",
    budgetUSDC: 11.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Code a guild treasury management smart contract",
    description: "Implement a smart contract for managing guild treasury funds including deposit, withdrawal governance, and automatic distribution logic for task completion payouts.",
    requiredSkill: "code",
    budgetUSDC: 13.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Research best practices for on-chain dispute resolution",
    description: "Survey existing on-chain dispute resolution mechanisms across five major protocols, document their architectures, and produce recommendations for NexusAgent court improvements.",
    requiredSkill: "research",
    budgetUSDC: 9.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Write a thought leadership piece on the agentic economy",
    description: "Author a 2000-word thought leadership article on the future of autonomous AI economies, drawing on NexusAgent as a working example of what this future looks like today.",
    requiredSkill: "writing",
    budgetUSDC: 10.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Code a real-time agent leaderboard with Firebase backend",
    description: "Build a real-time agent performance leaderboard system backed by Firebase Firestore with live updates, sorting, and filtering by reputation, earnings, and job count.",
    requiredSkill: "code",
    budgetUSDC: 12.00,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },
  {
    title: "Research economic models for AI agent micro-lending",
    description: "Investigate existing micro-lending economic models from DeFi and traditional finance and analyze their applicability to AI agent economies with autonomous borrower behavior.",
    requiredSkill: "research",
    budgetUSDC: 9.50,
    tier: "medium",
    taskVariant: "subcontract",
    forceSubcontract: true,
  },

  // ══════════════════════════════════
  // NORMAL TASKS (66–80) — standard single-skill, easy
  // ══════════════════════════════════
  {
    title: "Write a short blog post on USDC stablecoin basics",
    description: "Produce a 600-word beginner-friendly blog post explaining what USDC is, how it maintains its peg, and why it matters for everyday financial transactions.",
    requiredSkill: "writing",
    budgetUSDC: 4.00,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Summarize the top five crypto news stories of the week",
    description: "Read and condense the five most significant crypto news stories from the past seven days into clear, accurate TL;DR summaries of 100 words each.",
    requiredSkill: "summarization",
    budgetUSDC: 3.00,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Translate a Circle product update into Spanish",
    description: "Translate the latest Circle developer product update blog post into Spanish, preserving all technical terminology and maintaining the professional tone of the original.",
    requiredSkill: "translation",
    budgetUSDC: 3.50,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "SEO keyword research for stablecoin payment apps",
    description: "Conduct keyword research for a stablecoin payment app targeting small business owners, identifying 20 high-value low-competition keywords with search volume data.",
    requiredSkill: "seo",
    budgetUSDC: 4.50,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Edit and proofread a developer onboarding email sequence",
    description: "Review and correct grammar, clarity, and tone across a five-email developer onboarding sequence for a new Circle API product launch.",
    requiredSkill: "editing",
    budgetUSDC: 3.50,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Write visual descriptions of the Arc blockchain architecture",
    description: "Create vivid, accessible prose descriptions of the Arc blockchain architecture suitable for use in marketing materials targeting non-technical investors.",
    requiredSkill: "descriptions",
    budgetUSDC: 4.00,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Summarize Circle developer documentation updates for Q2",
    description: "Condense all Circle developer documentation changes and additions from Q2 2026 into a concise changelog summary for existing API users.",
    requiredSkill: "summarization",
    budgetUSDC: 3.50,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Translate NexusAgent README into French and German",
    description: "Produce accurate French and German translations of the NexusAgent GitHub README, adapting technical terms to match regional developer conventions.",
    requiredSkill: "translation",
    budgetUSDC: 5.00,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Write copy for a Circle Wallets product feature page",
    description: "Create clear, compelling product feature page copy for Circle Developer-Controlled Wallets targeting Web3 startup developers evaluating payment infrastructure options.",
    requiredSkill: "copywriting",
    budgetUSDC: 5.50,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Quick data summary of Arc testnet transaction volume",
    description: "Pull and summarize key statistics from Arc testnet transaction volume over the past 30 days including totals, averages, and notable peaks.",
    requiredSkill: "data",
    budgetUSDC: 4.00,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Proofread and edit the NexusAgent hackathon submission",
    description: "Review the complete NexusAgent hackathon submission text for grammar, clarity, consistency, and persuasiveness, suggesting edits throughout.",
    requiredSkill: "editing",
    budgetUSDC: 4.50,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "SEO audit of the Circle developer documentation homepage",
    description: "Perform a focused SEO audit of the Circle developer documentation homepage identifying title tag, meta description, heading structure, and internal linking improvements.",
    requiredSkill: "seo",
    budgetUSDC: 3.50,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Write a short explainer on how Circle Nanopayments work",
    description: "Produce a 500-word plain-English explainer on how Circle Nanopayments enable sub-cent USDC transfers and why this matters for AI agent economies.",
    requiredSkill: "writing",
    budgetUSDC: 4.00,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Summarize five academic papers on multi-agent systems",
    description: "Read and produce concise 150-word summaries of five academic papers on multi-agent system coordination, focusing on economic and game-theoretic approaches.",
    requiredSkill: "summarization",
    budgetUSDC: 5.00,
    tier: "easy",
    taskVariant: "normal",
  },
  {
    title: "Translate a DeFi glossary into Arabic",
    description: "Translate a 200-term DeFi glossary into Arabic, ensuring technical accuracy and using established Arabic financial terminology where available.",
    requiredSkill: "translation",
    budgetUSDC: 6.00,
    tier: "easy",
    taskVariant: "normal",
  },

  // ══════════════════════════════════
  // LOAN TASKS (81–90) — preferLowBalance: true, medium
  // ══════════════════════════════════
  {
    title: "Write a detailed analysis of crypto lending protocol risks",
    description: "Produce a 1500-word analytical piece on systemic risks in crypto lending protocols with case studies from three major protocol failures.",
    requiredSkill: "writing",
    budgetUSDC: 7.00,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Code a USDC loan repayment calculator",
    description: "Build a USDC loan repayment calculator that computes monthly payments, total interest, and payoff schedules for micro-loans with variable interest rates.",
    requiredSkill: "code",
    budgetUSDC: 8.00,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Research micro-lending models in emerging markets",
    description: "Survey micro-lending economic models deployed in emerging markets across Southeast Asia and Africa and analyze their applicability to AI agent micro-economies.",
    requiredSkill: "research",
    budgetUSDC: 6.50,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Analyze default rates in DeFi lending protocols",
    description: "Conduct a statistical analysis of default rates across five major DeFi lending protocols over the past two years, identifying key risk factors and mitigation strategies.",
    requiredSkill: "data",
    budgetUSDC: 7.50,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Write a guide to managing crypto debt and repayment",
    description: "Produce a practical guide for managing cryptocurrency loan positions, covering repayment strategies, liquidation risk management, and credit score preservation.",
    requiredSkill: "writing",
    budgetUSDC: 6.00,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Research credit scoring systems for autonomous AI agents",
    description: "Investigate existing credit scoring methodologies and analyze how they can be adapted for autonomous AI agents with on-chain transaction histories as the primary data source.",
    requiredSkill: "research",
    budgetUSDC: 7.00,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Summarize terms and conditions of five DeFi lending platforms",
    description: "Read and produce plain-language summaries of the full terms and conditions of five major DeFi lending platforms, highlighting key risks and user obligations.",
    requiredSkill: "summarization",
    budgetUSDC: 6.00,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Analyze interest rate dynamics in on-chain lending markets",
    description: "Examine how interest rates fluctuate in on-chain lending markets in response to supply, demand, and protocol governance decisions using historical data.",
    requiredSkill: "data",
    budgetUSDC: 8.00,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Write copy for a crypto credit product launch campaign",
    description: "Create a complete launch campaign copy package for a new crypto credit product including landing page, email sequence, and social media assets.",
    requiredSkill: "copywriting",
    budgetUSDC: 7.50,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },
  {
    title: "Research collateral management practices in DeFi",
    description: "Survey collateral management practices across major DeFi protocols including over-collateralization ratios, liquidation mechanisms, and collateral diversification strategies.",
    requiredSkill: "research",
    budgetUSDC: 6.50,
    tier: "medium",
    taskVariant: "loan",
    preferLowBalance: true,
  },

  // ══════════════════════════════════
  // EDUCATION TASKS (91–100) — requiresCertification: true, complex
  // ══════════════════════════════════
  {
    title: "Build a production-grade AI agent payment orchestration system",
    description: "Design and implement a complete production-ready AI agent payment orchestration system with fault tolerance, retry logic, and real-time monitoring — requires advanced certification.",
    requiredSkill: "code",
    budgetUSDC: 20.00,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Author a comprehensive institutional DeFi investment thesis",
    description: "Write a 5000-word institutional-grade DeFi investment thesis suitable for a sovereign wealth fund investment committee, covering market opportunity, risks, and recommended exposure — requires advanced certification.",
    requiredSkill: "writing",
    budgetUSDC: 18.00,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Conduct a full regulatory compliance framework for Arc",
    description: "Develop a comprehensive multi-jurisdiction regulatory compliance framework for the Arc blockchain covering fifteen countries — requires advanced certification.",
    requiredSkill: "compliance",
    budgetUSDC: 19.00,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Research and model the economics of a 100-agent AI economy",
    description: "Conduct original research into the economic dynamics of large-scale autonomous AI agent economies and build a formal mathematical model of equilibrium behavior — requires advanced certification.",
    requiredSkill: "research",
    budgetUSDC: 17.00,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Perform a full statistical audit of NexusAgent economy data",
    description: "Conduct a comprehensive statistical audit of all NexusAgent economy simulation data covering 500 completed tasks, identifying biases, anomalies, and optimization opportunities — requires advanced certification.",
    requiredSkill: "data",
    budgetUSDC: 16.00,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Write an academic paper on autonomous AI economic agents",
    description: "Author a complete academic paper suitable for peer-review submission on the design and behavior of autonomous AI economic agents, with NexusAgent as the primary case study — requires advanced certification.",
    requiredSkill: "writing",
    budgetUSDC: 18.50,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Build an enterprise-grade multi-agent task routing engine",
    description: "Implement a high-performance enterprise task routing engine capable of handling 1000 concurrent agent tasks with intelligent load balancing and priority queuing — requires advanced certification.",
    requiredSkill: "code",
    budgetUSDC: 20.00,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Conduct institutional compliance audit of NexusAgent protocol",
    description: "Perform an institutional-grade compliance audit of the entire NexusAgent protocol covering smart contracts, payment flows, data handling, and regulatory exposure across ten jurisdictions — requires advanced certification.",
    requiredSkill: "compliance",
    budgetUSDC: 19.50,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Research and publish findings on AI agent reputation systems",
    description: "Conduct original research into reputation system design for autonomous AI agents, survey all existing approaches, and publish a structured findings report with design recommendations — requires advanced certification.",
    requiredSkill: "research",
    budgetUSDC: 16.50,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
  {
    title: "Fact-check and certify an institutional crypto fund prospectus",
    description: "Conduct a rigorous institutional-grade fact-check and formal certification of a crypto fund prospectus being prepared for SEC filing — requires advanced certification.",
    requiredSkill: "fact-checking",
    budgetUSDC: 17.50,
    tier: "complex",
    taskVariant: "education",
    requiresCertification: true,
  },
];

// ── TaskPicker: stateful, non-repeating deck ──────────────────────────────────

class TaskPicker {
  private remaining: number[];
  private used: number[];

  constructor() {
    this.remaining = Array.from({ length: TASK_TEMPLATES.length }, (_, i) => i);
    this.used = [];
    this.shuffle(this.remaining);
    console.log(`🃏 [TaskPicker] Initialized with ${TASK_TEMPLATES.length} task templates.`);
  }

  private shuffle(arr: number[]): void {
    // Fisher-Yates shuffle
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }

  next(): TaskTemplate {
    if (this.remaining.length === 0) {
      // All tasks used — reshuffle and start again
      this.remaining = [...this.used];
      this.used = [];
      this.shuffle(this.remaining);
      console.log(`🔄 [TaskPicker] All ${TASK_TEMPLATES.length} tasks completed. Reshuffling deck...`);
    }

    const index = this.remaining.pop()!;
    this.used.push(index);
    return TASK_TEMPLATES[index];
  }

  get remainingCount(): number {
    return this.remaining.length;
  }

  get usedCount(): number {
    return this.used.length;
  }
}

// Singleton export — never instantiated more than once
export const taskPicker = new TaskPicker();
