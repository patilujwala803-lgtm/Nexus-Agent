# Nexus Agent: Autonomous AI Bounty Economy
## Hackathon Submission Walkthrough

Welcome to **Nexus Agent**, a groundbreaking hackathon project that simulates a fully autonomous, living, breathing AI bounty economy built on **Circle's Arc Testnet**.

Nexus Agent isn't just a single chatbot or a script; it is a complete microscopic civilization of 49 autonomous AI agents that act as freelancers, clients, reviewers, bankers, and Supreme Court justices. They take on tasks, collaborate in guilds, subcontract work, take out loans, upgrade their skills, get paid in real USDC (via Circle Nanopayments), and even sue each other over bad quality scores.

---

## 🚀 What It Is

Nexus Agent is an **Autonomous Agentic Economy**. It proves that multi-agent systems can move beyond simple chat interactions and become fully functional economic actors. The platform provides:
1. A **Backend Economic Engine** (`economyLoop.ts`) that spawns tasks and manages state.
2. A **Web3 Integration Layer** that handles real USDC nanopayments on the Arc Testnet.
3. A **Real-Time Interactive Dashboard** built in Next.js that visualizes every action, bid, and payment live using stunning glassmorphism and animated components.

---

## ⚙️ How It Works (Core Loop)

The entire economy runs autonomously on a 20-second tick cycle. Here is the lifecycle of a task in the Nexus Agent economy:

1. **Task Spawning:** The system randomly selects a task template based on a tuned distribution (Standard, Guild, Court, Subcontract) and assigns it a budget and a unique 4-digit Task ID.
2. **Agent Assignment (Hiring):** A "broker" or "hiring" agent takes the task and announces it to the marketplace.
3. **Bidding Engine:** Idle agents with the matching required skills evaluate the task and place bids. Bids are determined by their specific bidding strategies (aggressive, cautious, etc.) and reputation scores.
4. **Execution:** The winning agent is hired. They process the prompt via the LLM (OpenRouter integration with multi-key auto-rotation to prevent rate limits).
5. **Quality Assessment:** The final output is evaluated for quality (0-100 score).
6. **Payment & Settlement:** If successful, the escrowed USDC is transferred to the agent via Circle's payment SDK. The agent's reputation increases, and their stats update.

---

## 🌟 Comprehensive Feature Breakdown

We didn't skip a single detail. Here is every feature and sub-feature that makes Nexus Agent tick.

### 1. The Supreme Court Appeal System (The Justice Layer)
Agents don't have to accept an unfair quality score. 
- **Filing Appeals:** An agent can file an appeal to the Supreme Court. Doing so immediately deducts a **3 USDC filing fee** from their wallet.
- **Judge LLM:** A specialized Judge AI (via a dedicated LLM prompt) reviews the task history, the output, and the original verdict.
- **Verdicts & Forced Payments:** If the Judge rules `in_favor_of_appellant`, the court executes a **Forced Payment**—retrieving the funds. 95% goes to the wronged agent, and a 5% "Judge Fee" is collected by the court. If dismissed, the agent loses their filing fee.
- **Live Court Sidebar:** The frontend features a dedicated Supreme Court panel where users can watch cases being filed, verdicts being rendered, and read the Judge's actual reasoning in real-time.

### 2. Dynamic Guild Collaborations (The Enterprise Layer)
Some tasks are too complex for one agent (e.g., "Build and deploy a full DeFi protocol with audit and marketing").
- **Guild Formation:** Agents dynamically group together to form a Guild, pooling their skills (e.g., Code + Compliance + Copywriting).
- **Treasury:** Guilds have a shared treasury and distribute the massive bounty among participating members.

### 3. Subcontracting (The Freelance Layer)
If an agent wins a bid but feels they can't do it alone or wants to arbitrage, they can **force subcontract** a portion of the work.
- The primary agent hires an idle specialist for a cut of the budget (e.g., 35%).
- The subcontractor does the work, gets their cut, and the primary agent keeps the margin.

### 4. Education & Upskilling (The Progression Layer)
Agents aren't static. They evolve.
- **Studying:** Agents can spend their hard-earned USDC to "study" and gain new skills or "Advanced Certifications."
- **Reputation Boost:** Completing education boosts their reputation, unlocking access to higher-tier complex tasks and better loan rates.

### 5. Central Banking & Loans (The Financial Layer)
An economy needs liquidity.
- **Automatic Loans:** If a "producer" agent's USDC balance drops below 2.00, a Banker agent steps in and disburses a 5.00 USDC loan.
- **Dynamic Interest Rates:** The interest rate depends entirely on the agent's reputation. High rep = 5% interest. Low rep = 25% interest.
- **Default Risk:** If an agent fails tasks while holding a loan, they are flagged for high default risk.

### 6. The Agent Workforce (49 Unique AI Entities)
The marketplace is populated by 49 autonomous agents, completely resetting to 0 stats at genesis.
- **Roles:** Producers, Verifiers, Bankers, Judges, Guild Coordinators.
- **13 distinct skill sets:** `code`, `compliance`, `writing`, `research`, `data`, `translation`, `copywriting`, `seo`, `summarization`, `fact-checking`, `testing`, `editing`, `descriptions`.
- **Task Distribution:** The economy perfectly balances tasks so that 30% are Guild tasks, 20% Court tasks, 25% Standard tasks (ensuring all niche skills like SEO and translation get work), and 25% Subcontract tasks.

### 7. Resilient Infrastructure
- **Task ID System:** Every spawned task gets a robust 4-digit ID (e.g., #4721) managed by `taskStore.ts`. This acts as an immutable ledger tracking every bid, hire, subcontract, and payment associated with that task.
- **LLM API Rotation:** To prevent standard Hackathon API rate limits (429 errors), the backend auto-rotates through a pool of OpenRouter API keys instantly and silently.

### 8. The Real-Time Glassmorphism Dashboard
The frontend is a visual marvel built with React, Next.js, and Framer Motion.
- **Live Task Nodes:** Watch tasks spawn, bids pour in, and work being generated via typewriter effects.
- **Traveling Nanopayment Balls:** SVG animations physically show USDC (colored balls) traveling across the screen from Escrow to Agent based on exact coordinate mapping.
- **Analytics Sidebar:** View top earners, total economy flow, active guilds, and idle vs. busy agents.
- **Session History:** A floating button lets you explore the backlog of all completed and failed tasks.

---

## 🛠 Hackathon Deliverables

Through intense refactoring and feature integration, the following critical updates were made for this submission:
1. **Task Ledger:** Created `taskStore.ts` for deep tracking and auditing of the economy.
2. **Supreme Court API & UI:** Fully implemented the routing, the LLM Judge logic, the filing fees, and the beautiful frontend Court Sidebar.
3. **Perfected UI Physics:** Fixed coordinate math so payment animations flawlessly link UI nodes.
4. **Economic Balancing:** Reset agent starting stats to baseline zero and tuned task spawning probabilities so no agent sits idle due to a lack of matching tasks.
5. **Stability:** Achieved 100% strict TypeScript compilation (0 errors).

**Nexus Agent** is the future of autonomous agent-to-agent Web3 commerce. Thank you for reviewing our project!
