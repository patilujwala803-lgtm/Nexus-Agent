'use client';

/**
 * PaymentLog.tsx — Phase 5 update (light theme)
 * ──────────────────────────────────────────────────────────────────────────────
 * Real-time USDC payment ledger. Captures payment_sent, payment_made,
 * and bounty_completed events via Socket.io.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from 'react';
import type { AgentActivityPayload } from '@/lib/socket';
import { socket } from '@/lib/socket';

// ── Types ─────────────────────────────────────────────────────────────────────

interface PaymentRow {
  id:        string;
  from:      string;
  to:        string;
  amount:    number;
  txHash:    string;
  status:    'confirmed' | 'mock' | 'pending';
  timestamp: string;
}

const ARC_EXPLORER = 'https://explorer.arc.io/tx/';

// ── Helpers ────────────────────────────────────────────────────────────────────

function truncateTx(tx: string): string {
  if (!tx || tx.length < 16) return tx ?? '—';
  return `${tx.slice(0, 8)}…${tx.slice(-6)}`;
}

function detectStatus(txHash: string): 'confirmed' | 'mock' | 'pending' {
  if (!txHash) return 'pending';
  if (txHash.startsWith('0xmock') || txHash.startsWith('0xfail') || txHash.startsWith('0xnotok')) return 'mock';
  return 'confirmed';
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function PaymentLog() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const addPayment = useCallback((row: Omit<PaymentRow, 'id'>) => {
    setPayments((prev) => [...prev, { ...row, id: `${Date.now()}-${Math.random()}` }]);
  }, []);

  const handleActivity = useCallback(
    (payload: AgentActivityPayload) => {
      const { event, data, timestamp } = payload;

      if (event === 'payment_sent') {
        addPayment({
          from:      data.agentId ? `Agent ${String(data.agentId).toUpperCase()}` : (data.from ?? 'MasterAgent'),
          to:        data.to ?? 'Sub-Agent',
          amount:    typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount ?? '0')),
          txHash:    data.txHash ?? '',
          status:    detectStatus(data.txHash ?? ''),
          timestamp,
        });
      } else if (event === 'payment_made') {
        addPayment({
          from:      data.agent ?? 'ResearchAgent',
          to:        'Premium Content',
          amount:    typeof data.amount === 'number' ? data.amount : parseFloat(String(data.amount ?? '0')),
          txHash:    data.txHash ?? '',
          status:    detectStatus(data.txHash ?? ''),
          timestamp,
        });
      } else if (event === 'bounty_completed' && data.winner) {
        addPayment({
          from:      'MasterAgent',
          to:        `Agent ${String(data.winner).toUpperCase()} (REWARD)`,
          amount:    typeof data.reward === 'number' ? data.reward : parseFloat(String(data.reward ?? '0')),
          txHash:    data.rewardTxHash ?? data.txHash ?? '',
          status:    detectStatus(data.rewardTxHash ?? data.txHash ?? ''),
          timestamp,
        });
      }
    },
    [addPayment]
  );

  useEffect(() => {
    if (!socket) return;
    socket.on('agentActivity', handleActivity);
    return () => { socket.off('agentActivity', handleActivity); };
  }, [handleActivity]);

  const totalUSDC = payments.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0">
        <h2 className="text-slate-700 font-semibold text-sm uppercase tracking-widest">
          Payment Log
        </h2>
        <span className="text-slate-400 text-xs">{payments.length} txns</span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto rounded-xl border border-slate-200 bg-white">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-slate-400">
            <span className="text-2xl mb-2">💳</span>
            <p className="text-xs">No payments yet</p>
          </div>
        ) : (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left text-slate-500 font-semibold px-3 py-2 uppercase tracking-wide text-[10px]">From</th>
                <th className="text-left text-slate-500 font-semibold px-3 py-2 uppercase tracking-wide text-[10px]">To</th>
                <th className="text-right text-slate-500 font-semibold px-3 py-2 uppercase tracking-wide text-[10px]">USDC</th>
                <th className="text-left text-slate-500 font-semibold px-3 py-2 uppercase tracking-wide text-[10px]">TxHash</th>
                <th className="text-center text-slate-500 font-semibold px-3 py-2 uppercase tracking-wide text-[10px]">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p, i) => (
                <tr
                  key={p.id}
                  className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}
                >
                  <td className="px-3 py-2 text-slate-600 font-mono text-[11px]">{p.from}</td>
                  <td className="px-3 py-2 text-slate-600 max-w-[110px] truncate text-[11px]">{p.to}</td>
                  <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600 text-[11px]">
                    ${p.amount.toFixed(4)}
                  </td>
                  <td className="px-3 py-2">
                    {p.txHash ? (
                      <a
                        href={`${ARC_EXPLORER}${p.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono text-blue-500 hover:text-blue-700 underline underline-offset-2 text-[11px]"
                        title={p.txHash}
                      >
                        {truncateTx(p.txHash)}
                      </a>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    {p.status === 'confirmed' && (
                      <span className="inline-flex items-center gap-0.5 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                        ✓ Live
                      </span>
                    )}
                    {p.status === 'mock' && (
                      <span className="inline-flex items-center gap-0.5 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                        ~ Mock
                      </span>
                    )}
                    {p.status === 'pending' && (
                      <span className="inline-flex items-center gap-0.5 bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full text-[9px] font-bold">
                        ⏳
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Total footer */}
      {payments.length > 0 && (
        <div className="shrink-0 mt-2 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
          <span className="text-slate-500 text-xs">Total USDC Moved</span>
          <span className="text-emerald-700 font-mono font-bold text-sm">${totalUSDC.toFixed(4)}</span>
        </div>
      )}
    </div>
  );
}
