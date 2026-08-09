/**
 * claudeClient.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared LLM helper — calls Nemotron-3-Ultra via OpenRouter.
 *
 * API Key Rotation:
 *   Tries OPENROUTER_API_KEY → OPENROUTER_API_KEY_2 → OPENROUTER_API_KEY_3 → OPENROUTER_API_KEY_4
 *   on 429 (quota exceeded) or other failures. This lets you run 4 keys
 *   and automatically switch when one exhausts its daily quota.
 *
 * Judge API:
 *   askJudge() uses JUDGE_API_URL / JUDGE_API_KEY / JUDGE_MODEL when set,
 *   otherwise falls back to the same OpenRouter key rotation.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { EventEmitter } from 'events';

export const llmEventEmitter = new EventEmitter();

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "nvidia/nemotron-3-ultra-550b-a55b:free";
const TIMEOUT_MS = 30000;
const FALLBACK = "LLM is currently unavailable. Proceeding with default output.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Key Rotation Pool ─────────────────────────────────────────────────────────

function getRotationKeys(): string[] {
  const keys: string[] = [];
  const k1 = process.env.OPENROUTER_API_KEY;
  const k2 = process.env.OPENROUTER_API_KEY_2;
  const k3 = process.env.OPENROUTER_API_KEY_3;
  const k4 = process.env.OPENROUTER_API_KEY_4;
  if (k1) keys.push(k1);
  if (k2) keys.push(k2);
  if (k3) keys.push(k3);
  if (k4) keys.push(k4);
  return keys;
}

// Track which key index is currently active (persists across calls within process)
let currentKeyIndex = 0;

async function callLLM(
  messages: Array<{ role: string; content: string }>,
  apiUrl: string,
  apiKey: string,
  model: string,
  maxTokens = 1200
): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${apiUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (response.status === 429) {
      throw new Error(`QUOTA_EXCEEDED:${response.status}`);
    }

    if (!response.ok) {
      throw new Error(`API error ${response.status}: ${response.statusText}`);
    }

    const json = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = json?.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty content in LLM response");

    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * askClaude
 * Calls Nemotron-3-Ultra via OpenRouter with automatic key rotation.
 * Tries up to 3 keys before returning the fallback string.
 */
export async function askClaude(prompt: string): Promise<string> {
  const keys = getRotationKeys();
  const preview = prompt.slice(0, 60);
  console.log(`🤖 [LLM] called: ${preview}...`);

  if (keys.length === 0) {
    console.warn("⚠️ [claudeClient] No OPENROUTER_API_KEY set. Returning fallback.");
    return FALLBACK;
  }

  const startIndex = currentKeyIndex;
  let attempts = 0;

  while (attempts < keys.length) {
    const idx = (startIndex + attempts) % keys.length;
    const apiKey = keys[idx];

    try {
      const result = await callLLM(
        [{ role: "user", content: prompt }],
        "https://openrouter.ai/api/v1",
        apiKey,
        DEFAULT_MODEL
      );
      currentKeyIndex = idx; // remember working key
      return result;
    } catch (err) {
      const errMsg = (err as Error).message;
      if (errMsg.startsWith("QUOTA_EXCEEDED")) {
        console.warn(`⚠️ [claudeClient] Key #${idx + 1} quota exceeded — rotating to next key`);
        currentKeyIndex = (idx + 1) % keys.length;
      } else {
        console.warn(`⚠️ [claudeClient] Key #${idx + 1} failed: ${errMsg}`);
      }
      attempts++;
      if (attempts < keys.length) await sleep(500);
    }
  }

  console.error(`❌ [claudeClient] All ${keys.length} API keys failed. Using fallback.`);
  llmEventEmitter.emit('quota_exhausted');
  return FALLBACK;
}

/**
 * askJudge
 * Calls the Supreme Court Judge LLM.
 * Uses JUDGE_API_KEY/JUDGE_API_URL/JUDGE_MODEL if configured,
 * otherwise falls back to the OpenRouter key rotation pool.
 *
 * @param systemPrompt  System-role prompt for the judge
 * @param userPrompt    The case details + task record to evaluate
 */
export async function askJudge(systemPrompt: string, userPrompt: string): Promise<string> {
  const judgeApiKey = process.env.JUDGE_API_KEY;
  const judgeApiUrl = process.env.JUDGE_API_URL;
  const judgeModel   = process.env.JUDGE_MODEL;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user",   content: userPrompt },
  ];

  // Use dedicated judge endpoint if configured
  if (judgeApiKey && judgeApiUrl && judgeModel) {
    console.log(`⚖️ [Judge] Using dedicated Judge API: ${judgeApiUrl} (model: ${judgeModel})`);
    try {
      return await callLLM(messages, judgeApiUrl, judgeApiKey, judgeModel, 2000);
    } catch (err) {
      console.warn(`⚠️ [Judge] Dedicated Judge API failed: ${(err as Error).message}. Falling back to OpenRouter.`);
    }
  }

  // Fall back to OpenRouter key rotation
  console.log(`⚖️ [Judge] Using OpenRouter key rotation for Supreme Court evaluation`);
  const keys = getRotationKeys();
  if (keys.length === 0) {
    console.warn("⚠️ [Judge] No API keys available. Returning fallback.");
    return FALLBACK;
  }

  const startIndex = currentKeyIndex;
  let attempts = 0;

  while (attempts < keys.length) {
    const idx = (startIndex + attempts) % keys.length;
    const apiKey = keys[idx];

    try {
      const result = await callLLM(messages, "https://openrouter.ai/api/v1", apiKey, DEFAULT_MODEL, 2000);
      currentKeyIndex = idx;
      return result;
    } catch (err) {
      const errMsg = (err as Error).message;
      if (errMsg.startsWith("QUOTA_EXCEEDED")) {
        console.warn(`⚠️ [Judge] Key #${idx + 1} quota exceeded — rotating`);
        currentKeyIndex = (idx + 1) % keys.length;
      } else {
        console.warn(`⚠️ [Judge] Key #${idx + 1} failed: ${errMsg}`);
      }
      attempts++;
      if (attempts < keys.length) await sleep(500);
    }
  }

  console.error(`❌ [Judge] All API keys failed. Using fallback verdict.`);
  llmEventEmitter.emit('quota_exhausted');
  return FALLBACK;
}
