/**
 * dataAnalystAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Data Analyst Agent for NexusAgent — Phase 5 (NEW).
 *
 * Fetches higher-priced premium analytics articles (art_006 / art_007),
 * demonstrating variable nanopayment amounts compared to the standard
 * Research Agent's lower-cost articles (art_001–art_005).
 *
 * Pays via makeNanopayment() from the DataAnalystAgent wallet.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios, { AxiosError } from 'axios';
import { askGemini } from '../circle/geminiClient.js';
import { getWallet } from '../circle/walletService.js';
import { makeNanopayment } from '../circle/paymentService.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface StatsResult {
  stats:         string;    // Groq-extracted key statistics (bullet points)
  sourceArticle: string;    // Article ID used
  price:         number;    // USDC paid
  txHash:        string;    // Payment transaction hash
  topic:         string;
  timestamp:     string;
}

interface PaywallResponse {
  price:     number;
  payTo:     string;
  articleId: string;
}

interface UnlockedArticle {
  id:         string;
  title:      string;
  content:    string;
  paidWith:   string;
  unlockedAt: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const CONTENT_BASE_URL = `http://localhost:${process.env.PORT ?? 4000}/content`;

/** Analytics article catalogue — higher price than standard research */
const ANALYTICS_ARTICLES: Record<string, { id: string; price: number; topics: string[] }> = {
  art_006: { id: 'art_006', price: 0.006, topics: ['agent economy', 'stats', 'market data', 'analytics'] },
  art_007: { id: 'art_007', price: 0.007, topics: ['stablecoin', 'volume', 'quarterly', 'usdc'] },
};

// ── Socket.io emitter ─────────────────────────────────────────────────────────
type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerDataAnalystEmitter(fn: EmitFn) { _emit = fn; }
function emit(event: string, data: unknown) { _emit(event, data); }

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * fetchStatsArticle
 * Fetches a premium analytics article (higher-price tier) and extracts
 * 2-3 key statistics using Groq. Demonstrates variable nanopayment amounts.
 *
 * @param topic  Topic hint to pick the most relevant analytics article
 */
export async function fetchStatsArticle(topic: string): Promise<StatsResult> {
  // Choose the most relevant analytics article based on topic keyword matching
  const topicLower = topic.toLowerCase();
  let chosenId = 'art_006'; // default: AI Agent Economy Stats

  for (const [id, meta] of Object.entries(ANALYTICS_ARTICLES)) {
    if (meta.topics.some((t) => topicLower.includes(t))) {
      chosenId = id;
      break;
    }
  }

  const articleMeta = ANALYTICS_ARTICLES[chosenId]!;
  const price = articleMeta.price;

  console.log(`\n📊 Data Analyst Agent pulling market stats — cost: $${price} USDC...`);
  console.log(`   📰 Selected article: ${chosenId} (topic: ${topic})`);
  emit('agent_hired', { agent: 'DataAnalystAgent', articleId: chosenId, price, topic });

  // ── Step 1: Hit paywall ────────────────────────────────────────────────────
  const url = `${CONTENT_BASE_URL}/article/${chosenId}`;
  let paywallData: PaywallResponse;

  try {
    await axios.get(url);
    // If no 402, article is somehow free — continue anyway
    paywallData = { price, payTo: '', articleId: chosenId };
  } catch (err) {
    const axiosErr = err as AxiosError<PaywallResponse>;
    if (axiosErr.response?.status === 402) {
      paywallData = axiosErr.response.data;
      console.log(`   🚫 Analytics paywall hit — $${paywallData.price} USDC required`);
      emit('paywall_hit', { articleId: chosenId, price: paywallData.price, agent: 'DataAnalystAgent' });
    } else {
      throw err;
    }
  }

  // ── Step 2: Load DataAnalystAgent wallet ───────────────────────────────────
  const wallet = await getWallet('DataAnalystAgent');
  const walletId = wallet?.walletId ?? '';

  if (!walletId) {
    console.warn('   ⚠️  DataAnalystAgent wallet not found — using MasterAgent wallet fallback');
  }

  // ── Step 3: Pay via nanopayment ────────────────────────────────────────────
  const payment = await makeNanopayment(
    paywallData.price ?? price,
    paywallData.payTo || '0xDATAANALYST_PLACEHOLDER',
    walletId || 'mock-data-analyst-wallet',
    `Analytics stats: ${chosenId}`
  );

  console.log(`   💸 Paid $${payment.amount} USDC — txHash: ${payment.txHash}`);
  emit('payment_made', {
    txHash: payment.txHash,
    amount: payment.amount,
    articleId: chosenId,
    agent: 'DataAnalystAgent',
  });

  // ── Step 4: Fetch unlocked content ─────────────────────────────────────────
  const response = await axios.get<UnlockedArticle>(url, {
    headers: { 'X-Payment-TxHash': payment.txHash },
  });
  const article = response.data;
  article.paidWith = payment.txHash;

  console.log(`   ✅ Analytics article unlocked: "${article.title}"`);
  emit('content_unlocked', { articleId: chosenId, title: article.title, agent: 'DataAnalystAgent' });

  // ── Step 5: Extract key statistics with Groq ───────────────────────────────
  const stats = await askGemini(
    `Extract exactly 2-3 key statistics and data points from this market research article:\n\n${article.content}\n\nFormat as bullet points starting with "• ". Be specific with numbers and percentages.`,
    'You are a data analyst. Extract the most compelling numerical statistics. Respond with exactly 2-3 bullet points.',
    0.2
  );

  const statCount = stats.split('•').filter(Boolean).length;
  console.log(`   ✅ Data Analyst Agent extracted ${statCount} key statistics`);
  emit('stats_pulled', { articleId: chosenId, statCount, topic });

  return {
    stats,
    sourceArticle: chosenId,
    price:         payment.amount,
    txHash:        payment.txHash,
    topic,
    timestamp:     new Date().toISOString(),
  };
}
