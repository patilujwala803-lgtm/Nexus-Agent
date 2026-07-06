/**
 * claudeClient.ts
 * Shared LLM helper — calls Mistral Large via Bynara API.
 * Used across workExecutor, biddingEngine, and any other LLM-dependent logic.
 */

const BYNARA_ENDPOINT = "https://router.bynara.id/v1/chat/completions";
const MODEL = "mistral-large";
const TIMEOUT_MS = 25000;
const FALLBACK = "Mistral is currently unavailable. Proceeding with default output.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Calls Claude Sonnet 4.5 via Bynara API.
 * Retries once after 1 second on failure.
 * Returns fallback string if both attempts fail.
 * Has a 10-second timeout.
 */
export async function askClaude(prompt: string): Promise<string> {
  const apiKey = process.env.BYNARA_API_KEY;
  const preview = prompt.slice(0, 60);
  console.log(`🤖 [Mistral] called: ${preview}...`);

  if (!apiKey) {
    console.warn("⚠️ [claudeClient] BYNARA_API_KEY not set. Returning fallback.");
    return FALLBACK;
  }

  const body = JSON.stringify({
    model: MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 1000,
  });

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(BYNARA_ENDPOINT, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`Bynara API returned ${response.status}: ${response.statusText}`);
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const content = json?.choices?.[0]?.message?.content;
      if (!content) throw new Error("Empty content in Mistral response");

      return content.trim();
    } catch (err) {
      const errMsg = (err as Error).message;
      if (attempt === 1) {
        console.warn(`⚠️ [claudeClient] Attempt 1 failed: ${errMsg}. Retrying in 1000ms...`);
        await sleep(1000);
      } else {
        console.error(`❌ [claudeClient] Both attempts failed: ${errMsg}. Using fallback.`);
      }
    }
  }

  return FALLBACK;
}
