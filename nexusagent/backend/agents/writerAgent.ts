/**
 * writerAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Writer Agent for NexusAgent — Phase 5 update.
 *
 * Now handles BOTH drafting AND formatting/polishing (Formatter Agent merged in).
 * Two Groq calls per run:
 *   Step A: Write the initial draft
 *   Step B: Polish and format that draft into the final submission
 *
 * Returns: { draft, formattedContent, title, wordCount, timestamp }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { askGemini } from '../circle/geminiClient.js';
import type { ResearchResult } from './researchAgent.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DraftResult {
  draft:            string;  // raw draft (Step A output)
  formattedContent: string;  // polished final content (Step B output)
  title:            string;  // extracted from formatted content
  wordCount:        number;
  model:            string;
  agentId:          string;  // 'alpha' | 'beta'
  timestamp:        string;
}

// ── Socket.io emitter ─────────────────────────────────────────────────────────
type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerWriterEmitter(fn: EmitFn) { _emit = fn; }
function emit(event: string, data: unknown) { _emit(event, data); }

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * writeDraft
 * Step A: Generate a raw draft from research using Groq.
 * Step B: Polish and format the draft for professional submission.
 *
 * @param research          Research result from researchAgent.ts
 * @param bountyTitle       Title of the bounty task
 * @param bountyDescription Full description of what's required
 * @param agentId           'alpha' or 'beta' — identifies the pipeline
 */
export async function writeDraft(
  research: ResearchResult,
  bountyTitle: string,
  bountyDescription: string,
  agentId: string = 'alpha'
): Promise<DraftResult> {
  console.log(`\n✍️  Writer Agent [${agentId.toUpperCase()}] drafting response for: "${bountyTitle}"`);
  emit('agent_hired', { agent: 'WriterAgent', agentId, bountyTitle });

  // ── Step A: Write initial draft ────────────────────────────────────────────
  const draftPrompt = `You are a professional writer producing content for an AI bounty economy.

Based on this research:
${research.summary}

Write a high-quality response for this task:
Title: ${bountyTitle}
Description: ${bountyDescription}

Requirements:
- Write 2-3 clear, informative paragraphs
- Be specific and factual — use insights from the research
- Use professional, engaging language
- Focus on practical value for developers and builders
- Do NOT add a title or headers — just the paragraphs`;

  const draftSystemPrompt = 'You are a professional technical writer. Write in clear, engaging paragraphs. Be specific and factual. No fluff.';

  const draft = await askGemini(draftPrompt, draftSystemPrompt, 0.5);
  console.log(`   ✍️  Initial draft ready [${agentId.toUpperCase()}]: ${draft.split(/\s+/).filter(Boolean).length} words`);

  // ── Step B: Polish and format the draft ────────────────────────────────────
  console.log(`   🎨 Writer Agent [${agentId.toUpperCase()}] polishing final formatting...`);
  emit('agent_hired', { agent: 'WriterAgent-Polish', agentId, stage: 'formatting' });

  const formatPrompt = `Polish and format this draft for professional presentation:

${draft}

Instructions:
1. Add a compelling, specific TITLE on the first line (no markdown hashes, just the text)
2. Leave a blank line after the title
3. Refine language for clarity and impact, keep all key facts
4. Structure with clean paragraphs (150-250 words total)
5. End with a strong concluding sentence

Output format:
[TITLE HERE]

[Formatted content paragraphs]`;

  const formatSystemPrompt = 'You are an expert editor. Format content for professional presentation. Be concise and impactful. Respond with TITLE on first line then content.';

  const formatted = await askGemini(formatPrompt, formatSystemPrompt, 0.4);

  // Extract title from first non-empty line
  const lines = formatted.split('\n').filter(Boolean);
  const title = lines[0]?.replace(/^#+\s*/, '').trim() ?? bountyTitle;
  const wordCount = formatted.split(/\s+/).filter(Boolean).length;

  console.log(`   ✅ Writer Agent [${agentId.toUpperCase()}] complete: "${title}" (${wordCount} words)`);
  emit('draft_ready', { agentId, title, wordCount, bountyTitle });

  return {
    draft,
    formattedContent: formatted,
    title,
    wordCount,
    model:     'groq/llama-3.1-8b-instant',
    agentId,
    timestamp: new Date().toISOString(),
  };
}
