/**
 * premiumEndpoint.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Simulated premium content API — the HTTP 402 "paywall" that the
 * Research Agent must navigate using Circle Nanopayments.
 *
 * Routes (all mounted under /content in index.ts):
 *   GET  /articles          → list all available premium articles
 *   GET  /article/:id       → 402 if no payment header; full article if paid
 *   POST /verify-payment    → simulate payment verification
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

// ── ESM __dirname shim ────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

export const contentRouter = Router();

// ── Article catalogue ─────────────────────────────────────────────────────────

/** A premium article available for purchase */
export interface PremiumArticle {
  id: string;
  title: string;
  topic: string;
  price: number;   // in USDC
  isPremium: boolean;
}

/** Full article unlocked after payment */
export interface UnlockedArticle extends PremiumArticle {
  content: string;
  paidWith: string;
  unlockedAt: string;
}

/**
 * The 5 premium articles available on the paywall.
 * Prices are tiny USDC amounts suitable for nanopayments on Arc testnet.
 */
const PREMIUM_ARTICLES: PremiumArticle[] = [
  {
    id: 'art_001',
    title: 'AI Trends 2025: The Rise of Autonomous Agents',
    topic: 'artificial intelligence',
    price: 0.003,
    isPremium: true,
  },
  {
    id: 'art_002',
    title: 'Crypto Market Update: Stablecoins Lead DeFi Growth',
    topic: 'cryptocurrency',
    price: 0.002,
    isPremium: true,
  },
  {
    id: 'art_003',
    title: 'Large Language Models: Beyond ChatGPT in 2025',
    topic: 'artificial intelligence',
    price: 0.004,
    isPremium: true,
  },
  {
    id: 'art_004',
    title: 'Web3 and AI Convergence: Building the Decentralised Brain',
    topic: 'web3',
    price: 0.003,
    isPremium: true,
  },
  {
    id: 'art_005',
    title: 'Circle Arc Testnet: Developer Guide to USDC Nanopayments',
    topic: 'payments',
    price: 0.002,
    isPremium: true,
  },
  // ── Phase 5 premium analytics articles (higher price tier) ──────────────────
  {
    id: 'art_006',
    title: 'Market Data: AI Agent Economy Stats 2025',
    topic: 'agent economy stats',
    price: 0.006,   // higher-tier analytics pricing
    isPremium: true,
  },
  {
    id: 'art_007',
    title: 'Quarterly Stablecoin Volume Report',
    topic: 'stablecoin stats',
    price: 0.007,   // highest price — premium data report
    isPremium: true,
  },
];

/**
 * Full content map — only revealed after payment is confirmed.
 * Each value is 3-4 realistic sentences about the topic.
 */
const ARTICLE_CONTENT: Record<string, string> = {
  // ── Phase 5 analytics articles ───────────────────────────────────────────────
  art_006: `The AI agent economy has grown at an extraordinary pace in 2025, with over 2.4 million autonomous agent instances deployed across enterprise and consumer applications. Market data shows agent-to-agent transaction volumes exceeding $180 million in Q2 alone, driven primarily by stablecoin micropayments on Layer-1 networks like Arc. The average revenue earned per AI agent per month has reached $0.47 USDC, with top-performing agents in research and content generation categories earning 10x that amount. Data analyst projections show the agent economy will cross $1 billion in annual USDC throughput by Q1 2026, with Circle-based payment rails capturing approximately 34% market share due to their near-zero latency and sub-cent transaction costs.`,

  art_007: `Stablecoin transaction volume on Arc testnet reached 847 million USDC in Q2 2025, a 312% year-over-year increase driven by AI agent adoption and institutional DeFi activity. USDC holds a dominant 61% share of all stablecoin flows on Arc, with average transaction sizes of $0.003 for agent micropayments and $1,240 for institutional transfers — demonstrating the full-spectrum utility of the network. Monthly active wallets grew from 28,000 in Q1 to 94,000 in Q2, with developer-controlled wallets accounting for 67% of new wallet creation. Circle's nanopayment API processed 412 million individual transactions in Q2, with a 99.97% success rate and median confirmation time of 180 milliseconds, making it the most reliable micropayment rail for autonomous agent systems globally.`,

  art_001: `Autonomous AI agents are rapidly transforming how software systems operate, with multi-agent frameworks enabling complex task delegation and execution without human intervention. Companies like OpenAI, Anthropic, and Google DeepMind are racing to deploy agent systems capable of browsing the web, writing code, and managing workflows end-to-end. The economic implications are profound — agent marketplaces are emerging where AI systems bid on tasks, hire sub-agents, and settle payments in real time using stablecoin micropayments. By 2026, industry analysts predict that over 40% of enterprise automation will involve at least one AI agent operating autonomously within defined guardrails.`,

  art_002: `Stablecoins — particularly USDC — have become the de facto settlement layer for decentralised finance, with daily volumes exceeding $50 billion in Q1 2025. Circle's expansion of the Arc network provides near-instant finality for USDC transactions at sub-cent fees, making micropayments economically viable for the first time. DeFi protocols are increasingly integrating stablecoin streams for continuous payments, enabling novel business models like pay-per-second subscriptions and AI nanopayment economies. The crypto market's shift toward utility-driven stablecoins signals a maturing ecosystem focused on real-world use cases rather than speculative trading.`,

  art_003: `The post-GPT-4 landscape has seen a proliferation of specialised large language models fine-tuned for specific domains, from medical diagnosis to legal document analysis. Open-source models like Llama 3 and Mistral have democratised access to powerful language capabilities, allowing developers to build sophisticated AI pipelines at minimal cost. Inference optimisation techniques — including quantisation, speculative decoding, and mixture-of-experts architectures — have reduced latency to the point where real-time multi-agent conversations are feasible. The next frontier involves models that can autonomously improve their own reasoning through self-play and reinforcement learning from environmental feedback.`,

  art_004: `The convergence of Web3 infrastructure and AI capabilities is producing a new class of applications where agents hold wallets, sign transactions, and earn income autonomously. Decentralised AI marketplaces allow models to compete for tasks posted by humans or other agents, with smart contracts ensuring trustless escrow and automatic payout upon task completion. Circle's developer-controlled wallet APIs have become a popular choice for AI agent developers, enabling programmatic USDC transfers without requiring agents to manage private keys directly. This architecture creates a fully autonomous economic loop — agents earn, spend, hire, and settle — entirely on-chain.`,

  art_005: `Circle's Arc testnet provides developers with a dedicated environment for building stablecoin-native applications, offering USDC faucet access and gas-free transactions for testing nanopayment flows. The developer-controlled wallets API allows backend applications to create and manage wallets on behalf of users or AI agents, with entity-secret-based security preventing unauthorised access. Nanopayments — typically in the range of $0.001 to $0.01 USDC — enable content paywalls, API monetisation, and agent-to-agent compensation at scales not previously possible with traditional payment rails. Integrating the Circle SDK with an Express.js backend requires fewer than 50 lines of code, making it accessible to any full-stack developer building the next generation of Web3 applications.`,
};

// ── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /content/articles
 * Returns the catalogue of all available premium articles.
 * No payment required — this is the "storefront".
 */
contentRouter.get('/articles', (_req: Request, res: Response) => {
  console.log('📰 GET /content/articles — serving article catalogue');
  res.json(PREMIUM_ARTICLES);
});

/**
 * GET /content/article/:id
 * Returns a 402 Payment Required if no payment header is present.
 * Returns the full article if X-Payment-TxHash is present.
 *
 * This simulates the paywall that the Research Agent must navigate.
 */
contentRouter.get('/article/:id', async (req: Request, res: Response) => {
  const articleId = req.params['id'] as string;
  const txHash    = req.headers['x-payment-txhash'] as string | undefined;

  const article = PREMIUM_ARTICLES.find((a) => a.id === articleId);
  if (!article) {
    res.status(404).json({ error: `Article ${articleId} not found` });
    return;
  }

  // ── No payment header → return 402 ────────────────────────────────────────
  if (!txHash) {
    console.log(`🚫 /content/article/${articleId} — 402 Payment Required ($${article.price} USDC)`);

    // Try to load the ResearchAgent wallet address from wallets.json
    let payTo = '0xRESEARCH_AGENT_WALLET_ADDRESS';
    try {
      const walletsFile = path.join(__dirname, '..', 'wallets.json');
      const raw = await fs.readFile(walletsFile, 'utf-8');
      const wallets = JSON.parse(raw) as { wallets: Array<{ agentName: string; address: string }> };
      const researchWallet = wallets.wallets.find((w) => w.agentName === 'ResearchAgent');
      if (researchWallet?.address) payTo = researchWallet.address;
    } catch {
      // wallets.json not available yet; use placeholder
    }

    res.status(402).json({
      error:        'Payment Required',
      message:      'This premium content requires a USDC nanopayment to access.',
      articleId,
      price:        article.price,
      currency:     'USDC',
      payTo,
      instructions: 'Pay via Circle Nanopayments on Arc testnet, then retry with X-Payment-TxHash header.',
    });
    return;
  }

  // ── Payment header present → unlock article ────────────────────────────────
  const content = ARTICLE_CONTENT[articleId];
  if (!content) {
    res.status(500).json({ error: `Content for ${articleId} not available` });
    return;
  }

  console.log(`✅ /content/article/${articleId} — unlocked with txHash ${txHash}`);

  const unlocked: UnlockedArticle = {
    ...article,
    content,
    paidWith:   txHash,
    unlockedAt: new Date().toISOString(),
  };

  res.json(unlocked);
});

/**
 * POST /content/verify-payment
 * Simulates payment verification on Arc testnet.
 * In production this would query the Arc block explorer for the txHash.
 *
 * Body: { txHash, articleId, amount }
 * Returns: { verified, articleId, amount, txHash }
 */
contentRouter.post('/verify-payment', (req: Request, res: Response) => {
  const { txHash, articleId, amount } = req.body as {
    txHash?: string;
    articleId?: string;
    amount?: number;
  };

  if (!txHash || !articleId) {
    res.status(400).json({ error: 'txHash and articleId are required' });
    return;
  }

  // Simulate verification: a non-empty txHash is considered valid for testnet demo
  const verified = typeof txHash === 'string' && txHash.length > 0;

  console.log(`🔍 Payment verification for article ${articleId}: ${verified ? '✅ verified' : '❌ failed'}`);

  res.json({
    verified,
    articleId,
    amount: amount ?? 0,
    txHash,
    verifiedAt: new Date().toISOString(),
    note:       'Simulated verification — production would query Arc block explorer',
  });
});

/** Helper: get article metadata by ID (used by agents) */
export function getArticleById(id: string): PremiumArticle | undefined {
  return PREMIUM_ARTICLES.find((a) => a.id === id);
}

/** Helper: get all articles (used by agents) */
export function getAllArticles(): PremiumArticle[] {
  return PREMIUM_ARTICLES;
}
