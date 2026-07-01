/**
 * researchAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Research Agent for NexusAgent.
 *
 * Responsibilities:
 *  1. Find relevant premium articles for a research topic
 *  2. Detect HTTP 402 paywalls and automatically pay via Circle Nanopayments
 *  3. Summarise unlocked content using Groq LLM (llama-3.1-8b-instant)
 *  4. Return a structured research result to the Master Agent
 *
 * Payment flow (the core of Phase 2):
 *   Fetch article → 402 response → makeNanopayment() → retry with txHash → ✅
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios, { AxiosError } from 'axios';
import { askGemini } from '../circle/geminiClient.js';
import { getWallet } from '../circle/walletService.js';
import { makeNanopayment } from '../circle/paymentService.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ResearchResult {
  topic:        string;
  summary:      string;          // Gemini-generated bullet-point summary
  sources:      ArticleSource[]; // Articles consulted
  totalSpent:   number;          // Total USDC spent on nanopayments
  txHashes:     string[];        // All Circle payment transaction IDs
  completedAt:  string;
}

export interface ArticleSource {
  articleId:  string;
  title:      string;
  txHash:     string;            // Payment reference
  amountPaid: number;
}

interface ArticleListing {
  id:        string;
  title:     string;
  topic:     string;
  price:     number;
  isPremium: boolean;
}

interface PaywallResponse {
  error:        string;
  message:      string;
  articleId:    string;
  price:        number;
  currency:     string;
  payTo:        string;
  instructions: string;
}

interface UnlockedArticle {
  id:         string;
  title:      string;
  topic:      string;
  content:    string;
  paidWith:   string;
  unlockedAt: string;
}

// ── Configuration ─────────────────────────────────────────────────────────────

/** Base URL for the premium content endpoints (local) */
const CONTENT_BASE_URL = `http://localhost:${process.env.PORT ?? 4000}/content`;

// (Gemini client is accessed via geminiClient.ts — no singleton needed here)

// ── Socket.io event emitter (injected at runtime) ─────────────────────────────
// We use a lazy import pattern to avoid circular dependency with index.ts
type EmitFn = (event: string, data: unknown) => void;
let _emitActivity: EmitFn = () => {}; // no-op default (works without server running)

/** Register the Socket.io emit function from index.ts */
export function registerEmitter(fn: EmitFn): void {
  _emitActivity = fn;
}

function emit(event: string, data: unknown): void {
  _emitActivity(event, data);
}

// ── Main Research Functions ───────────────────────────────────────────────────

/**
 * researchTopic
 * The primary entry point called by the Master Agent.
 * Orchestrates the full research pipeline end-to-end.
 *
 * @param topic   Topic to research (e.g. "artificial intelligence")
 * @param budget  Maximum USDC to spend on content access
 */
export async function researchTopic(
  topic: string,
  budget: number
): Promise<ResearchResult> {
  console.log(`\n🔍 Research Agent starting research on: "${topic}"`);
  console.log(`   💰 Budget: $${budget} USDC`);

  emit('research_started', { topic, budget });

  const sources: ArticleSource[] = [];
  let totalSpent = 0;
  const txHashes: string[] = [];

  // ── Step 1: Find relevant articles ────────────────────────────────────────
  const articles = await findRelevantArticles(topic);

  if (articles.length === 0) {
    console.log('   ℹ️  No relevant articles found. Returning empty result.');
    return {
      topic,
      summary:     'No relevant articles found for this topic.',
      sources:     [],
      totalSpent:  0,
      txHashes:    [],
      completedAt: new Date().toISOString(),
    };
  }

  // ── Step 2: Fetch top article(s) within budget ─────────────────────────────
  const allContent: string[] = [];

  for (const article of articles) {
    if (totalSpent + article.price > budget) {
      console.log(`   ⚠️  Skipping "${article.title}" — would exceed budget ($${budget})`);
      continue;
    }

    try {
      const unlocked = await fetchArticleWithPayment(article);
      allContent.push(unlocked.content);
      totalSpent += article.price;
      txHashes.push(unlocked.paidWith);

      sources.push({
        articleId:  article.id,
        title:      article.title,
        txHash:     unlocked.paidWith,
        amountPaid: article.price,
      });
    } catch (err) {
      console.error(`   ❌ Failed to fetch article ${article.id}: ${(err as Error).message}`);
    }
  }

  // ── Step 3: Summarise with Groq ────────────────────────────────────────────
  const combinedContent = allContent.join('\n\n---\n\n');
  const summary = await summarizeContent(combinedContent, topic);

  emit('research_complete', { topic, summary, totalSpent, txHashes });

  console.log(`\n✅ Research complete for: "${topic}"`);
  console.log(`   💵 Total USDC spent: $${totalSpent}`);
  console.log(`   📰 Sources consulted: ${sources.length}`);

  return {
    topic,
    summary,
    sources,
    totalSpent,
    txHashes,
    completedAt: new Date().toISOString(),
  };
}

/**
 * findRelevantArticles
 * Queries the premium content catalogue and filters by topic relevance.
 * Returns the top 2 most relevant articles.
 *
 * @param topic  Research topic to match against article topics/titles
 */
export async function findRelevantArticles(topic: string): Promise<ArticleListing[]> {
  console.log(`\n📰 Searching for articles on: "${topic}"`);

  const response = await axios.get<ArticleListing[]>(`${CONTENT_BASE_URL}/articles`);
  const articles = response.data;

  // Simple keyword matching — Phase 3 can use embeddings for better relevance
  const topicWords = topic.toLowerCase().split(/\s+/);
  const scored = articles.map((article) => {
    const searchText = `${article.title} ${article.topic}`.toLowerCase();
    const score = topicWords.reduce(
      (acc, word) => acc + (searchText.includes(word) ? 2 : 0),
      0
    );
    // Also check partial matches (e.g. "AI" in "artificial intelligence")
    const partialScore = topicWords.reduce(
      (acc, word) => acc + (searchText.split(' ').some((w) => w.startsWith(word.slice(0, 3))) ? 1 : 0),
      0
    );
    return { article, score: score + partialScore };
  });

  const relevant = scored
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map(({ article }) => article);

  console.log(`   📰 Found ${relevant.length} relevant article(s) for: "${topic}"`);
  relevant.forEach((a) => console.log(`      → [${a.id}] ${a.title} ($${a.price} USDC)`));

  return relevant;
}

/**
 * fetchArticleWithPayment
 * Implements the HTTP 402 → pay → retry flow.
 *
 * Steps:
 *  1. Request article WITHOUT payment header → expect 402
 *  2. Extract price and payTo address from 402 response
 *  3. Load ResearchAgent wallet, call makeNanopayment()
 *  4. Retry request WITH X-Payment-TxHash header
 *  5. Return unlocked article content
 *
 * @param article  Article listing (id, title, price)
 */
export async function fetchArticleWithPayment(
  article: ArticleListing
): Promise<UnlockedArticle> {
  const url = `${CONTENT_BASE_URL}/article/${article.id}`;
  console.log(`\n🌐 Fetching article: [${article.id}] ${article.title}`);

  // ── Step 1: Initial request (expect 402) ────────────────────────────────────
  let paywallData: PaywallResponse;
  try {
    await axios.get(url);
    throw new Error('Expected 402 but got 200 — paywall not triggered');
  } catch (err) {
    const axiosErr = err as AxiosError<PaywallResponse>;
    if (axiosErr.response?.status === 402) {
      paywallData = axiosErr.response.data;
      console.log(`🚫 Hit paywall for article [${article.id}] — cost: $${paywallData.price} USDC`);
      console.log(`   💳 Payment required → initiating Circle Nanopayment...`);
      emit('paywall_hit', { articleId: article.id, price: paywallData.price });
    } else {
      throw err; // Re-throw unexpected errors
    }
  }

  // ── Step 2: Load ResearchAgent wallet ────────────────────────────────────────
  const researchWallet = await getWallet('ResearchAgent');
  if (!researchWallet) {
    throw new Error('ResearchAgent wallet not found — run walletService.ts first');
  }

  const price  = paywallData.price ?? article.price;
  const payTo  = paywallData.payTo;

  // ── Step 3: Make the Circle Nanopayment ──────────────────────────────────────
  const payment = await makeNanopayment(
    price,
    payTo,
    researchWallet.walletId,
    `Article access: ${article.id}`
  );

  console.log(`💸 Paid $${payment.amount} USDC — txHash: ${payment.txHash}`);
  if (payment.isMock) {
    console.log(`   ℹ️  (Mock payment — wallet needs USDC from Arc testnet faucet for real payments)`);
  }
  emit('payment_made', { txHash: payment.txHash, amount: payment.amount, articleId: article.id });

  // ── Step 4: Retry with payment header ────────────────────────────────────────
  console.log(`🔄 Retrying article fetch with payment proof...`);
  const unlockedResponse = await axios.get<UnlockedArticle>(url, {
    headers: { 'X-Payment-TxHash': payment.txHash },
  });

  const unlocked = unlockedResponse.data;
  // Ensure the txHash from our payment is embedded in the unlocked article
  unlocked.paidWith = payment.txHash;

  console.log(`✅ Article unlocked: "${unlocked.title}"`);
  emit('content_unlocked', { articleId: article.id, title: unlocked.title });

  return unlocked;
}

/**
 * summarizeContent
 * Calls Groq's llama-3.1-8b-instant to generate a 3-bullet-point summary
 * of the research content, focused on the given topic.
 *
 * @param content  Raw article content to summarize
 * @param topic    Topic to focus the summary on
 */
export async function summarizeContent(
  content: string,
  topic: string
): Promise<string> {
  console.log('\n🧠 Summarizing content with Gemini AI...');
  emit('summarizing', { topic });

  if (!content.trim()) {
    return '• No content available to summarize.';
  }

  try {
    const summary = await askGemini(
      `Summarize this article in exactly 3 bullet points relevant to the topic "${topic}":\n\n${content}`,
      'You are a concise research assistant. Always respond with exactly 3 bullet points, each starting with "• ". Be factual and specific.'
    );
    console.log(`   ✅ AI summary generated (${summary.split('•').length - 1} bullet points)`);
    return summary;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`   ⚠️  Gemini summarization failed: ${msg}`);
    // Graceful fallback — extract first sentences from content
    const fallback = content
      .split(/[.!?]/)
      .slice(0, 3)
      .map((s) => `• ${s.trim()}`)
      .filter((s) => s.length > 3)
      .join('\n');
    return fallback || '• Content summary unavailable (Gemini API error).';
  }
}
