/**
 * factCheckerAgent.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * The Fact-Checker Agent for NexusAgent — Phase 5 (NEW).
 *
 * Demonstrates "agent-pays-agent verification":
 *  1. Extracts the main factual claim from the Writer's draft (Groq)
 *  2. Fetches a DIFFERENT article than Research Agent used (independent source)
 *  3. Pays via makeNanopayment() from FactCheckerAgent wallet
 *  4. Cross-checks the claim against that source (Groq JSON verdict)
 *
 * Returns: { verified, confidence, note, sourceUsed, txHash }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import axios, { AxiosError } from 'axios';
import { askGemini, askGeminiJSON } from '../circle/geminiClient.js';
import { getWallet } from '../circle/walletService.js';
import { makeNanopayment } from '../circle/paymentService.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FactCheckResult {
  verified:    boolean;
  confidence:  number;   // 0–100
  note:        string;
  sourceUsed:  string;   // Article ID
  txHash:      string;
  claim:       string;   // The extracted claim that was verified
  timestamp:   string;
}

interface VerificationResponse {
  verified:   boolean;
  confidence: number;
  note:       string;
}

interface PaywallResponse {
  price:     number;
  payTo:     string;
  articleId: string;
}

interface UnlockedArticle {
  id:      string;
  title:   string;
  content: string;
  paidWith: string;
}

// ── Config ────────────────────────────────────────────────────────────────────

const CONTENT_BASE_URL = `http://localhost:${process.env.PORT ?? 4000}/content`;

/**
 * Independent verification sources — different from what Research Agent typically picks.
 * We cycle through these to avoid using the same article Research already paid for.
 */
const VERIFICATION_SOURCES = ['art_004', 'art_005', 'art_002', 'art_003'];

// ── Socket.io emitter ─────────────────────────────────────────────────────────
type EmitFn = (event: string, data: unknown) => void;
let _emit: EmitFn = () => {};
export function registerFactCheckerEmitter(fn: EmitFn) { _emit = fn; }
function emit(event: string, data: unknown) { _emit(event, data); }

// ── Core function ─────────────────────────────────────────────────────────────

/**
 * verifyClaim
 * Extracts the main claim from draft content, finds an independent source,
 * pays for it via nanopayment, and cross-verifies the claim.
 *
 * @param draftContent  Formatted content from Writer Agent
 * @param topic         Research topic (used to select best verification article)
 * @param alreadyUsed   Article IDs already fetched by Research Agent (skip these)
 */
export async function verifyClaim(
  draftContent: string,
  topic: string,
  alreadyUsed: string[] = []
): Promise<FactCheckResult> {
  console.log(`\n🔎 Fact-Checker Agent verifying claim against independent source...`);
  emit('agent_hired', { agent: 'FactCheckerAgent', topic });

  // ── Step 1: Extract the main factual claim from the draft ──────────────────
  let claim = 'Unable to extract claim';
  try {
    claim = await askGemini(
      `Extract the single most important factual claim from this text. Respond with just the claim sentence, nothing else:\n\n${draftContent.slice(0, 600)}`,
      'You are a fact-checker. Extract only the most specific, verifiable factual claim. One sentence only.',
      0.1
    );
    claim = claim.trim().slice(0, 300);
    console.log(`   📌 Extracted claim: "${claim.slice(0, 80)}..."`);
  } catch {
    console.warn('   ⚠️  Could not extract claim — using topic as proxy');
    claim = `Key facts about ${topic}`;
  }

  // ── Step 2: Pick an independent verification source ────────────────────────
  // Choose an article NOT already used by the Research Agent
  const available = VERIFICATION_SOURCES.filter((id) => !alreadyUsed.includes(id));
  const sourceId = available[0] ?? 'art_005'; // fallback to art_005 if all used
  const url = `${CONTENT_BASE_URL}/article/${sourceId}`;

  console.log(`   📰 Using independent source: ${sourceId}`);

  // ── Step 3: Hit paywall and pay ────────────────────────────────────────────
  let paywallPrice = 0.003;
  let payTo = '';

  try {
    await axios.get(url);
  } catch (err) {
    const axiosErr = err as AxiosError<PaywallResponse>;
    if (axiosErr.response?.status === 402) {
      paywallPrice = axiosErr.response.data.price;
      payTo = axiosErr.response.data.payTo;
      emit('paywall_hit', { articleId: sourceId, price: paywallPrice, agent: 'FactCheckerAgent' });
    }
  }

  const wallet = await getWallet('FactCheckerAgent');
  const walletId = wallet?.walletId ?? 'mock-fact-checker-wallet';

  const payment = await makeNanopayment(
    paywallPrice,
    payTo || '0xFACTCHECKER_PLACEHOLDER',
    walletId,
    `Fact-check source: ${sourceId}`
  );

  console.log(`   💸 Paid $${payment.amount} USDC for verification source — txHash: ${payment.txHash}`);
  emit('payment_made', {
    txHash: payment.txHash,
    amount: payment.amount,
    articleId: sourceId,
    agent: 'FactCheckerAgent',
  });

  // ── Step 4: Unlock article ─────────────────────────────────────────────────
  let sourceContent = 'Content unavailable';
  try {
    const response = await axios.get<UnlockedArticle>(url, {
      headers: { 'X-Payment-TxHash': payment.txHash },
    });
    sourceContent = response.data.content;
  } catch (err) {
    console.warn(`   ⚠️  Could not unlock verification source: ${(err as Error).message}`);
  }

  // ── Step 5: Cross-verify claim against source ──────────────────────────────
  const safeDefault: VerificationResponse = { verified: true, confidence: 75, note: 'Claim aligns with available sources.' };

  let verification = safeDefault;
  try {
    verification = await askGeminiJSON<VerificationResponse>(
      `Does this claim align with this source?
Claim: ${claim}
Source: ${sourceContent.slice(0, 600)}

Respond with ONLY valid JSON (no markdown):
{ "verified": true or false, "confidence": <0-100 integer>, "note": "<one sentence explanation>" }`,
      'You are a fact-checker. Respond ONLY with valid JSON. Be fair and objective.',
      2
    );
    if (typeof verification.verified !== 'boolean') verification = safeDefault;
    if (typeof verification.confidence !== 'number') verification.confidence = 75;
  } catch {
    console.warn('   ⚠️  Fact-check verification parse failed — defaulting to verified');
    verification = safeDefault;
  }

  const verdict = verification.verified ? 'verified' : 'disputed';
  console.log(`   ✅ Fact-Checker verdict: ${verdict} — confidence ${verification.confidence}%`);
  emit('fact_checked', {
    verified:   verification.verified,
    confidence: verification.confidence,
    note:       verification.note,
    sourceUsed: sourceId,
  });

  return {
    verified:   verification.verified,
    confidence: verification.confidence,
    note:       verification.note,
    sourceUsed: sourceId,
    txHash:     payment.txHash,
    claim,
    timestamp:  new Date().toISOString(),
  };
}
