/**
 * geminiClient.ts  (now powered by Groq — same API surface, zero agent changes needed)
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared LLM client for all NexusAgent AI agents.
 * Backed by Groq's llama-3.1-8b-instant for ultra-fast inference.
 *
 * Exports same functions as before:
 *   askGemini(prompt, systemPrompt?, temperature?)  → string
 *   askGeminiJSON<T>(prompt, systemPrompt?, retries?) → T
 * ─────────────────────────────────────────────────────────────────────────────
 */

import Groq from 'groq-sdk';

// ── Model configuration ───────────────────────────────────────────────────────
const GROQ_MODEL = 'llama-3.1-8b-instant';

// ── Singleton Groq client ─────────────────────────────────────────────────────
let groqClient: Groq | null = null;

function getGroq(): Groq {
  if (groqClient) return groqClient;

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error(
      '❌  GROQ_API_KEY not set in environment. ' +
      'Get your free key from https://console.groq.com and add it to .env'
    );
  }

  groqClient = new Groq({ apiKey });
  console.log(`🤖 Groq client initialized (${GROQ_MODEL})`);
  return groqClient;
}

/**
 * askGemini  ← kept for API compatibility; now calls Groq
 * Sends a prompt and returns the text response.
 */
export async function askGemini(
  userPrompt: string,
  systemPrompt?: string,
  temperature: number = 0.3
): Promise<string> {
  const client = getGroq();

  const messages: Array<{ role: 'system' | 'user'; content: string }> = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: userPrompt });

  const completion = await client.chat.completions.create({
    model:       GROQ_MODEL,
    messages,
    temperature,
    max_tokens:  1024,
  });

  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  if (!text) throw new Error('Groq returned an empty response');
  return text;
}

/**
 * askGeminiJSON  ← kept for API compatibility; now calls Groq
 * Returns a parsed JSON object. Retries up to maxRetries on bad JSON.
 * Strips markdown code fences (```json ... ```) if Groq wraps the output.
 */
export async function askGeminiJSON<T>(
  userPrompt: string,
  systemPrompt?: string,
  maxRetries: number = 3
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const raw = await askGemini(userPrompt, systemPrompt, 0.1);

      // Strip markdown code fences if present
      const cleaned = raw
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```\s*$/, '')
        .trim();

      return JSON.parse(cleaned) as T;
    } catch (err) {
      if (attempt === maxRetries) {
        throw new Error(
          `Groq JSON parse failed after ${maxRetries} attempts: ${(err as Error).message}`
        );
      }
      console.warn(`   ⚠️  JSON parse failed (attempt ${attempt}/${maxRetries}), retrying...`);
    }
  }
  throw new Error('askGeminiJSON: exhausted retries');
}
