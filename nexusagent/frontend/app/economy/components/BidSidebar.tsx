import React from 'react';
import { FlowState } from '../types';
import { SidebarWrapper } from './SidebarWrapper';

interface BidSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  flow: FlowState | null;
}

export const BidSidebar: React.FC<BidSidebarProps> = ({ isOpen, onClose, flow }) => {
  if (!flow) return null;

  const { task, bids } = flow;

  // Find winner if any
  const acceptedBid = bids.find((b) => b.status === 'accepted');
  const winnerName = flow.task.assignedAgentName || (acceptedBid ? acceptedBid.agentName : null);
  const finalPrice = acceptedBid ? acceptedBid.bidAmountUSDC : task.budgetUSDC;
  const savedAmount = Math.max(0, parseFloat((task.budgetUSDC - finalPrice).toFixed(4)));

  return (
    <SidebarWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Bid Auction & Negotiation"
      subtitle={`Task: "${task.title.replace(/\[(EASY|MEDIUM|COMPLEX)\]/gi, '').trim()}"`}
      titleIcon="🔨"
    >
      {/* SECTION 1 — Auction Header */}
      <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-slate-800 text-sm">Auction Status</h3>
          <p className="text-xs text-slate-500">
            {bids.length} {bids.length === 1 ? 'bid' : 'bids'} submitted
          </p>
        </div>
        <div className="text-right">
          <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-xs block">
            Budget: {task.budgetUSDC} USDC
          </span>
        </div>
      </div>

      {/* SECTION 3 — Auction Summary (shown at top if winner exists) */}
      {winnerName && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3.5 text-emerald-900 flex items-start gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <h4 className="font-bold text-sm text-emerald-800">
              {winnerName} won this auction
            </h4>
            <p className="text-xs text-emerald-700 font-medium">
              Final price: <span className="font-bold">{finalPrice} USDC</span>
            </p>
            {savedAmount > 0 && (
              <p className="text-[11px] text-emerald-600">
                Saved {savedAmount} USDC vs task budget
              </p>
            )}
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 my-3" />

      {/* SECTION 2 — Bid Leaderboard */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Bid Submissions & Negotiation Thread
        </h4>

        {bids.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <span className="text-3xl block mb-2">⏳</span>
            <p className="text-xs">Waiting for agent bids to arrive...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {bids.map((bid, index) => {
              const rank = index + 1;
              const rep = bid.reputation ?? 75;
              const jobs = bid.jobsCompleted ?? 12;

              const statusBadgeStyle =
                bid.status === 'accepted'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : bid.status === 'rejected'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : bid.status === 'countered'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200';

              const statusBadgeText =
                bid.status === 'accepted'
                  ? '✓ Hired'
                  : bid.status === 'rejected'
                  ? '✗ Rejected'
                  : bid.status === 'countered'
                  ? '↔ Countered'
                  : 'Pending';

              const priceStyle =
                bid.status === 'accepted'
                  ? 'text-emerald-600 font-bold'
                  : bid.status === 'rejected'
                  ? 'text-red-400 line-through'
                  : bid.status === 'countered'
                  ? 'text-amber-600 font-semibold'
                  : 'text-slate-800 font-bold';

              return (
                <div
                  key={bid.id || index}
                  className="bg-white border border-slate-200 rounded-xl p-3 shadow-xs hover:border-slate-300 transition-all space-y-2"
                >
                  {/* Top row: Rank, Name, Price, Badge */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-bold text-slate-300 text-sm min-w-[20px]">
                        #{rank}
                      </span>
                      <span className="font-semibold text-slate-800 text-xs truncate">
                        {bid.agentName}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`text-xs ${priceStyle}`}>
                        {bid.bidAmountUSDC} USDC
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${statusBadgeStyle}`}
                      >
                        {statusBadgeText}
                      </span>
                    </div>
                  </div>

                  {/* Reputation bar & jobs done */}
                  <div className="flex items-center gap-3 text-[10px] text-slate-500">
                    <div className="flex-1 flex items-center gap-1.5">
                      <span>Rep: {rep}/100</span>
                      <div className="flex-1 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, Math.max(0, rep))}%` }}
                        />
                      </div>
                    </div>
                    <span>{jobs} jobs done</span>
                  </div>

                  {/* Agent message */}
                  {bid.message && (
                    <p className="text-[11px] italic text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      &quot;{bid.message}&quot;
                    </p>
                  )}

                  {/* Counter offer negotiation thread if applicable */}
                  {bid.counterOfferUSDC && (
                    <div className="ml-3 pl-3 border-l-2 border-amber-300 space-y-1 text-[11px] text-amber-900 bg-amber-50/50 p-2 rounded-r-lg">
                      <div className="flex items-center gap-1">
                        <span>➡️</span>
                        <span className="font-semibold">Hiring Agent Counter Offer:</span>
                        <span>{bid.counterOfferUSDC} USDC</span>
                      </div>
                      <div className="text-[10px] text-amber-700">
                        Agent Decision:{' '}
                        {bid.status === 'accepted' ? (
                          <span className="font-bold text-emerald-600">ACCEPTED</span>
                        ) : (
                          <span className="font-bold text-red-500">REJECTED</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarWrapper>
  );
};
