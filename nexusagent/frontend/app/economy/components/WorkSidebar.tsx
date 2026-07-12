import React from 'react';
import { FlowState } from '../types';
import { SidebarWrapper } from './SidebarWrapper';

interface WorkSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  flow: FlowState | null;
  isTyping: boolean;
  typedText: string;
}

export const WorkSidebar: React.FC<WorkSidebarProps> = ({
  isOpen,
  onClose,
  flow,
  isTyping,
  typedText,
}) => {
  if (!flow) return null;

  const { task, workerAgent, qualityScore, paymentTxHash, taskVariant, guildName, courtOpinion, courtVerdict, justiceVotes, juryVotes } = flow;
  const isCourtFlow = taskVariant === 'court';
  const isGuildFlow = taskVariant === 'guild';
  const workerName = task.assignedAgentName || workerAgent?.name || 'Assigned Agent';
  const rep = workerAgent?.reputation ?? 85;
  const jobs = workerAgent?.jobsCompleted ?? 14;

  const acceptedBid = flow.bids.find((b) => b.status === 'accepted');
  const paidAmount = acceptedBid ? acceptedBid.bidAmountUSDC : task.budgetUSDC;

  return (
    <SidebarWrapper
      isOpen={isOpen}
      onClose={onClose}
      title={isCourtFlow && courtVerdict ? '⚖️ Supreme Court Appeal' : isCourtFlow ? '⚖️ Court Task' : isGuildFlow ? '🏛️ Guild Work' : 'Agent Work Output'}
      subtitle={`Task: "${task.title.replace(/\[(EASY|MEDIUM|COMPLEX)\]/gi, '').trim()}"`}
      titleIcon={isCourtFlow ? '⚖️' : isGuildFlow ? '🏛️' : '⚙️'}
      accentColor={isCourtFlow && courtVerdict ? '#f59e0b' : isCourtFlow ? '#fbbf24' : isGuildFlow ? '#8b5cf6' : '#6366f1'}
    >
      {/* SECTION 1 — Worker Header */}
        <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div
            className="w-12 h-12 rounded-full text-white font-bold text-lg flex items-center justify-center shrink-0 shadow-md"
            style={{ background: isCourtFlow ? 'linear-gradient(135deg,#f59e0b,#ea580c)' : isGuildFlow ? 'linear-gradient(135deg,#8b5cf6,#6366f1)' : '#4f46e5' }}
          >
            {workerName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm truncate">{workerName}</h3>
              <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                Producer
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
              <span>Rep: {rep}/100</span>
              <span>•</span>
              <span>{jobs} jobs completed</span>
            </div>
            {isGuildFlow && guildName && (
              <div className="mt-1 text-[10px] font-bold" style={{ color: '#7c3aed' }}>🏛️ {guildName}</div>
            )}
          </div>
        </div>

      <div className="border-t border-slate-100 my-3" />

      {/* SECTION 2 — Work Status Banner */}
      <div>
        {isTyping ? (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-3 text-xs font-semibold flex items-center gap-2 animate-pulse">
            <span className="text-base">⚙️</span>
            <span>Agent is executing work... (Streaming output)</span>
          </div>
        ) : qualityScore !== null && qualityScore !== undefined && qualityScore >= 74 ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-3 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">✅</span>
              <span>Work Approved by Jury</span>
            </div>
            <span className="font-bold text-sm bg-emerald-100 px-2 py-0.5 rounded-md">
              Score: {qualityScore}/100
            </span>
          </div>
        ) : qualityScore !== null && qualityScore !== undefined && qualityScore < 74 ? (
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-xl p-3 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">❌</span>
              <span>Work Rejected</span>
            </div>
            <span className="font-bold text-sm bg-red-100 px-2 py-0.5 rounded-md">
              Score: {qualityScore}/100
            </span>
          </div>
        ) : (
          <div className="bg-slate-50 border border-slate-200 text-slate-600 rounded-xl p-3 text-xs font-medium flex items-center gap-2">
            <span className="text-base">⏳</span>
            <span>Waiting for task execution...</span>
          </div>
        )}
      </div>

      {/* SECTION 3 — Task Context */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1 text-slate-600">
        <div className="flex justify-between">
          <span className="text-slate-400">Task Title:</span>
          <span className="font-semibold text-slate-700 truncate max-w-[200px]">
            {task.title.replace(/\[(EASY|MEDIUM|COMPLEX)\]/gi, '').trim()}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Skill Required:</span>
          <span className="font-medium">{task.requiredSkill}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-400">Task Contract Value:</span>
          <span className="font-bold text-emerald-600">{paidAmount} USDC</span>
        </div>
      </div>

      <div className="border-t border-slate-100 my-3" />

      {/* SECTION 4 — Work Output (Prose with Typewriter effect & Blinking Cursor |) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Output Stream
          </h4>
          {isTyping && (
            <span className="text-[10px] text-indigo-600 font-semibold animate-pulse">
              ● Live Typeout Active
            </span>
          )}
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-800 leading-relaxed min-h-[140px] font-sans relative">
          {typedText ? (
            <div>
              {typedText}
              {isTyping && (
                <span className="inline-block w-2 bg-indigo-600 text-indigo-600 font-bold ml-0.5 animate-pulse">
                  |
                </span>
              )}
            </div>
          ) : flow.result ? (
            <div>{flow.result}</div>
          ) : (
            <div className="text-slate-400 italic text-xs py-4 text-center">
              Work output will appear here once the agent begins output generation...
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5 — Supreme Court Judgment (Only if verdict exists) */}
      {isCourtFlow && courtVerdict && (
        <>
          <div className="border-t border-amber-100 my-3" />
          <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(245,158,11,0.3)', background: 'linear-gradient(135deg,rgba(245,158,11,0.04),rgba(234,88,12,0.03))' }}>
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(245,158,11,0.15)', background: 'rgba(245,158,11,0.06)' }}>
              <span className="text-xl">⚖️</span>
              <div>
                <h4 className="font-extrabold text-sm" style={{ color: '#92400e', fontFamily: "'Syne', sans-serif" }}>Supreme Court Ruling</h4>
                <p className="text-[10px] font-semibold" style={{ color: '#b45309' }}>AI Panel of 3 Justices</p>
              </div>
              {courtVerdict && (
                <div className="ml-auto">
                  <span
                    className="text-xs font-extrabold px-3 py-1 rounded-full uppercase tracking-wider"
                    style={{
                      background: courtVerdict === 'overturned' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.1)',
                      color: courtVerdict === 'overturned' ? '#059669' : '#dc2626',
                      border: `1px solid ${courtVerdict === 'overturned' ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.2)'}`,
                    }}
                  >
                    {courtVerdict === 'overturned' ? '✅ OVERTURNED' : '🔴 UPHELD'}
                  </span>
                </div>
              )}
            </div>

            {/* Justice Votes */}
            {justiceVotes && justiceVotes.length > 0 && (
              <div className="px-4 py-3 space-y-2" style={{ borderBottom: '1px solid rgba(245,158,11,0.1)' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(146,64,14,0.5)' }}>Justice Panel Votes</p>
                {justiceVotes.map((j, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-base shrink-0">
                      {j.vote === 'overturn' ? '✅' : '🔴'}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold" style={{ color: '#1e1b4b' }}>{j.name}</p>
                      <p className="text-[10px] leading-relaxed" style={{ color: 'rgba(30,27,75,0.55)' }}>{j.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Court Opinion */}
            {courtOpinion && (
              <div className="px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: 'rgba(146,64,14,0.5)' }}>Written Opinion</p>
                <p className="text-xs leading-relaxed" style={{ color: '#92400e', fontStyle: 'italic' }}>
                  "{courtOpinion}"
                </p>
              </div>
            )}

            {!courtVerdict && (
              <div className="px-4 py-4 text-center text-xs animate-pulse" style={{ color: '#b45309' }}>
                ⏳ Awaiting Supreme Court deliberation...
              </div>
            )}
          </div>
        </>
      )}

      {/* SECTION 6 — Jury Votes (non-court) */}
      {!isCourtFlow && juryVotes && juryVotes.length > 0 && (
        <>
          <div className="border-t border-slate-100 my-3" />
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2 text-slate-400">Jury Votes</p>
            {juryVotes.map((v, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span>{v.approve ? '✅' : '❌'}</span>
                <span className="font-semibold text-slate-700">{v.jurorName}</span>
                <span className="text-slate-400">{v.approve ? 'Approved' : 'Rejected'}</span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* SECTION 7 — Payment Info */}
      {flow.status === 'complete' && (
        <>
          <div className="border-t border-slate-100 my-3" />
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-xs text-emerald-900 space-y-1">
            <h4 className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1 text-sm">
              <span>💳</span> Payment Settlement Disbursed
            </h4>
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-700">Contract Payout:</span>
              <span className="font-bold text-emerald-800">{paidAmount} USDC</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-emerald-700">Transaction Hash:</span>
              <span className="font-mono text-emerald-800 truncate max-w-[180px]">
                {paymentTxHash || 'nano_0x3a82f1b0'}
              </span>
            </div>
          </div>
        </>
      )}
    </SidebarWrapper>
  );
};

