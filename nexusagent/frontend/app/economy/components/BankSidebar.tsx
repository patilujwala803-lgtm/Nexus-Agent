'use client';
import React, { useState, useEffect } from 'react';
import { SidebarWrapper } from './SidebarWrapper';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface LoanRecord {
  agentId: string;
  agentName: string;
  loanBalance: number;
  loanInterestRate: number;
  usdcBalance: number;
  totalEarned: number;
  isHighDefaultRisk?: boolean;
  role: string;
}

interface BankSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  totalLoansDisbursed?: number;
}

export function BankSidebar({ isOpen, onClose, totalLoansDisbursed = 0 }: BankSidebarProps) {
  const [bankAgents, setBankAgents] = useState<{ name: string; balance: number }[]>([]);
  const [activeLoans, setActiveLoans] = useState<LoanRecord[]>([]);
  const [repaidAgents, setRepaidAgents] = useState<{ name: string; amount: number }[]>([]);
  const [totalVault, setTotalVault] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loanEvents, setLoanEvents] = useState<{ name: string; action: 'issued' | 'repaid'; amount: number; time: number }[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const load = () => {
      setLoading(true);
      fetch(`${API_URL}/api/economy/agents`)
        .then(r => r.json())
        .then(data => {
          const list: any[] = Array.isArray(data) ? data : (data?.agents ?? []);

          // Bank agents
          const banks = list
            .filter(a => a.poolType === 'bank' || a.instanceId?.startsWith('bank-agent'))
            .map(a => ({ name: a.name, balance: a.usdcBalance }));
          setBankAgents(banks);
          setTotalVault(banks.reduce((s, b) => s + b.balance, 0));

          // Active loans
          const loans: LoanRecord[] = list
            .filter(a => a.loanBalance > 0)
            .map(a => ({
              agentId: a.instanceId,
              agentName: a.name,
              loanBalance: a.loanBalance,
              loanInterestRate: a.loanInterestRate ?? 0.15,
              usdcBalance: a.usdcBalance,
              totalEarned: a.totalEarned,
              isHighDefaultRisk: a.isHighDefaultRisk,
              role: a.role,
            }));
          setActiveLoans(loans);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    };
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Risk color
  const riskColor = (loan: LoanRecord) => {
    if (loan.isHighDefaultRisk) return '#ef4444';
    if (loan.loanInterestRate >= 0.2) return '#f59e0b';
    return '#6366f1';
  };
  const riskLabel = (loan: LoanRecord) => {
    if (loan.isHighDefaultRisk) return '⚠️ High Risk';
    if (loan.loanInterestRate >= 0.2) return '🟡 Medium';
    return '🟢 Healthy';
  };

  return (
    <SidebarWrapper isOpen={isOpen} onClose={onClose} title="🏦 Bank & Loans" accentColor="#10b981">
      {/* Bank Vault */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: 'linear-gradient(135deg,rgba(16,185,129,0.08),rgba(6,182,212,0.06))', border: '1px solid rgba(16,185,129,0.2)' }}>
        <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: 'rgba(30,27,75,0.4)' }}>Bank Vault Total</p>
        <p className="text-3xl font-extrabold" style={{ color: '#10b981' }}>${totalVault.toFixed(2)}</p>
        <p className="text-[10px] mt-1" style={{ color: 'rgba(30,27,75,0.4)' }}>USDC</p>
        <div className="mt-3 space-y-1.5">
          {bankAgents.map(b => (
            <div key={b.name} className="flex items-center justify-between">
              <span className="text-[11px] font-semibold" style={{ color: '#1e1b4b' }}>🏛️ {b.name}</span>
              <span className="text-[11px] font-extrabold" style={{ color: '#10b981' }}>${b.balance.toFixed(2)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.12)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.4)' }}>Total Disbursed</p>
          <p className="text-sm font-extrabold" style={{ color: '#6366f1' }}>${totalLoansDisbursed.toFixed(2)}</p>
        </div>
        <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.15)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.4)' }}>Active Loans</p>
          <p className="text-sm font-extrabold" style={{ color: '#f59e0b' }}>{activeLoans.length}</p>
        </div>
        <div className="rounded-xl p-2 text-center" style={{ background: 'rgba(239,68,68,0.07)', border: '1px solid rgba(239,68,68,0.12)' }}>
          <p className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.4)' }}>High Risk</p>
          <p className="text-sm font-extrabold" style={{ color: '#ef4444' }}>{activeLoans.filter(l => l.isHighDefaultRisk).length}</p>
        </div>
      </div>

      {/* Active Loans */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.35)' }}>Active Loans</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl animate-pulse" style={{ background: 'rgba(245,158,11,0.06)' }} />
          ))}
        </div>
      ) : activeLoans.length === 0 ? (
        <div className="rounded-xl p-4 text-center mb-4" style={{ background: 'rgba(16,185,129,0.06)', border: '1px dashed rgba(16,185,129,0.2)' }}>
          <p className="text-2xl mb-1">✅</p>
          <p className="text-xs font-semibold" style={{ color: '#10b981' }}>No active loans — all agents debt-free!</p>
        </div>
      ) : (
        <div className="space-y-2 mb-4 overflow-y-auto" style={{ maxHeight: '280px' }}>
          {activeLoans.map(loan => {
            const repayProgress = Math.min(100, (loan.totalEarned / (loan.loanBalance + loan.totalEarned)) * 100);
            return (
              <div key={loan.agentId} className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.18)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-[11px] font-extrabold" style={{ color: '#1e1b4b' }}>{loan.agentName}</p>
                    <p className="text-[9px] font-semibold mt-0.5" style={{ color: riskColor(loan) }}>{riskLabel(loan)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold" style={{ color: '#f59e0b' }}>${loan.loanBalance.toFixed(2)}</p>
                    <p className="text-[9px]" style={{ color: 'rgba(30,27,75,0.4)' }}>{(loan.loanInterestRate * 100).toFixed(0)}% APR</p>
                  </div>
                </div>
                {/* Repayment progress */}
                <div className="mb-1">
                  <div className="flex justify-between text-[9px] mb-1" style={{ color: 'rgba(30,27,75,0.4)' }}>
                    <span>Repayment progress</span>
                    <span>{repayProgress.toFixed(0)}%</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(245,158,11,0.15)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${repayProgress}%`, background: repayProgress > 60 ? '#10b981' : repayProgress > 30 ? '#f59e0b' : '#ef4444' }}
                    />
                  </div>
                </div>
                <div className="flex justify-between text-[9px]" style={{ color: 'rgba(30,27,75,0.45)' }}>
                  <span>💰 Balance: ${loan.usdcBalance.toFixed(2)}</span>
                  <span>📈 Earned: ${loan.totalEarned.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interest Info — Two-Bank Model */}
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />
        <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.35)' }}>Bank Terms</span>
        <div className="flex-1 h-px" style={{ background: 'rgba(99,102,241,0.1)' }} />
      </div>
      <div className="space-y-2">
        <div className="rounded-xl p-3" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold" style={{ color: '#10b981' }}>🏦 Bank Agent #1</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>Low-Rate</span>
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'rgba(30,27,75,0.5)' }}>
            <span>8% interest rate</span>
            <span>10 min repayment</span>
          </div>
          <p className="text-[9px] mt-1" style={{ color: 'rgba(30,27,75,0.4)' }}>Affordable long-term financing for stable producers</p>
        </div>
        <div className="rounded-xl p-3" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)' }}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-extrabold" style={{ color: '#f59e0b' }}>🏦 Bank Agent #2</span>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.15)', color: '#f59e0b' }}>High-Rate</span>
          </div>
          <div className="flex justify-between text-[10px]" style={{ color: 'rgba(30,27,75,0.5)' }}>
            <span>20% interest rate</span>
            <span>3 min repayment</span>
          </div>
          <p className="text-[9px] mt-1" style={{ color: 'rgba(30,27,75,0.4)' }}>Short-term emergency loans. Default = court summons ⚖️</p>
        </div>
      </div>
    </SidebarWrapper>
  );
}
