# Nexus Agent Rules

### Rule: AI Infallibility & Human Imperfections (Greed/Betrayal)
- **No Quality Evaluation Needed**: Do not implement systems that evaluate if an AI agent "failed" a task due to poor quality. AI agents do not make mistakes in this simulation.
- **Simulate Human Qualities (Greed & Betrayal)**: Agents should exhibit human imperfections. Specifically, out of 70 interactions, approximately 30 (43% probability) should result in "betrayal" (e.g., hoarding funds, refusing to pay subcontractors, or defaulting on loans).
- **Supreme Court as Punitive Body**: The Supreme Court resolves economic disputes caused by betrayal, not work quality disputes. 
- **Agent "Death"**: If an agent is found guilty by the Court and cannot pay their debts (e.g., wallet balance < loan amount), the agent is "killed". In the UI, their name should be updated (e.g., appending "v2" or "Reincarnated"), while the backend continues using the same instance ID for stability. If they have sufficient funds, the Court forcibly drains their wallet.
