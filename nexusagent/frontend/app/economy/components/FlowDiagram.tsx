import React from 'react';
import { FlowState } from '../types';
import { TaskCard } from './TaskCard';
import { BidNode } from './BidNode';
import { BidSpokeCard, WorkerCard } from './AgentCard';
import { PaymentNode } from './PaymentNode';

interface FlowDiagramProps {
  flow: FlowState;
  y: number;
  onTaskCardClick: (taskId: string) => void;
  onBidNodeClick: (taskId: string) => void;
  onWorkerCardClick: (taskId: string) => void;
  onAgentClick?: (agentInstanceId: string) => void;
}

export const FlowDiagram: React.FC<FlowDiagramProps> = ({
  flow,
  y,
  onTaskCardClick,
  onBidNodeClick,
  onWorkerCardClick,
  onAgentClick,
}) => {
  const { phase, bids, taskVariant, qualityScore, paymentTxHash, workerAgent, task } = flow;
  const workerName = task.assignedAgentName || workerAgent?.name || 'Assigned Agent';

  const isBiddingActive = phase === 'bidding';
  const isWorking = phase === 'working';
  const isComplete = phase === 'complete';
  const isFailed = phase === 'failed';
  const isCourtVariant = taskVariant === 'court';
  const isGuildVariant = taskVariant === 'guild';
  const isSubcontractVariant = taskVariant === 'subcontract';

  // Coordinate system
  const CANVAS_START_X = 80;
  const taskCardX = CANVAS_START_X;       // 80
  const bidNodeX = CANVAS_START_X + 240;  // 320
  const workerCardX = CANVAS_START_X + 420; // 500
  const paymentNodeX = CANVAS_START_X + 640; // 720
  const courtNodeX = CANVAS_START_X + 760;   // 840

  // Spoke card positions — up to 3 bids, spaced vertically
  const displayBids = bids.slice(0, 3);
  // Dynamic row height grows if 3 bids to avoid overflow
  const ROW_HEIGHT = displayBids.length >= 3 ? 260 : 210;
  const localCenter = ROW_HEIGHT / 2;
  const centerY = y + localCenter;

  const getSpokeCardPosition = (index: number, total: number) => {
    const spokeX = bidNodeX - 120;
    const cardHalfHeight = 30; // Approx half height of bid card
    let spokeY = centerY - cardHalfHeight;
    if (total === 1) {
      spokeY = centerY - cardHalfHeight;
    } else if (total === 2) {
      spokeY = index === 0 ? centerY - 80 : centerY + 10;
    } else if (total >= 3) {
      if (index === 0) spokeY = centerY - 105;
      else if (index === 1) spokeY = centerY - 30;
      else spokeY = centerY + 45;
    }
    return { x: spokeX, y: spokeY };
  };

  // Line status colors
  const getLineStyle = (linePhaseThreshold: number) => {
    const phaseOrder = ['spawned', 'bidding', 'hired', 'working', 'verifying', 'complete', 'failed'];
    const currentIdx = phaseOrder.indexOf(phase);
    if (isFailed) return { stroke: '#ef4444', strokeWidth: 2, dash: undefined };
    if (isComplete || currentIdx > linePhaseThreshold)
      return { stroke: '#22c55e', strokeWidth: 2.5, dash: undefined };
    if (currentIdx === linePhaseThreshold)
      return { stroke: '#6366f1', strokeWidth: 2.5, dash: '4 4' };
    return { stroke: '#e2e8f0', strokeWidth: 1.5, dash: '4 4' };
  };

  const line1 = getLineStyle(1);
  const line2 = getLineStyle(2);
  const line3 = getLineStyle(4);

  // Container glow styles per variant
  const containerStyle: React.CSSProperties = isGuildVariant
    ? {
        position: 'absolute', left: 0, width: '1060px', height: `${ROW_HEIGHT}px`, top: `${y}px`,
        borderRadius: '16px',
        background: 'linear-gradient(90deg, rgba(139,92,246,0.04), rgba(99,102,241,0.06), rgba(139,92,246,0.04))',
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 0 32px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
        animation: (isComplete || isFailed) ? 'none' : 'guildPulse 3s ease-in-out infinite',
      }
    : isCourtVariant
    ? {
        position: 'absolute', left: 0, width: '1060px', height: `${ROW_HEIGHT}px`, top: `${y}px`,
        borderRadius: '16px',
        background: 'linear-gradient(90deg, rgba(245,158,11,0.04), rgba(234,88,12,0.07), rgba(245,158,11,0.04))',
        border: '1px solid rgba(245,158,11,0.28)',
        boxShadow: '0 0 36px rgba(245,158,11,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
        animation: (isComplete || isFailed) ? 'none' : 'courtPulse 2.5s ease-in-out infinite',
      }
    : isSubcontractVariant
    ? {
        position: 'absolute', left: 0, width: '1060px', height: `${ROW_HEIGHT}px`, top: `${y}px`,
        borderRadius: '16px',
        background: 'rgba(16,185,129,0.02)',
        border: '1px solid rgba(16,185,129,0.1)',
      }
    : { position: 'absolute', left: 0, width: '1060px', height: `${ROW_HEIGHT}px`, top: `${y}px` };

  return (
    <>
      <style>{`
        @keyframes guildPulse {
          0%, 100% { box-shadow: 0 0 24px rgba(139,92,246,0.10), inset 0 1px 0 rgba(255,255,255,0.5); }
          50% { box-shadow: 0 0 52px rgba(139,92,246,0.28), 0 0 12px rgba(99,102,241,0.15), inset 0 1px 0 rgba(255,255,255,0.5); }
        }
        @keyframes courtPulse {
          0%, 100% { box-shadow: 0 0 28px rgba(245,158,11,0.12), inset 0 1px 0 rgba(255,255,255,0.5); }
          50% { box-shadow: 0 0 60px rgba(245,158,11,0.30), 0 0 16px rgba(234,88,12,0.20), inset 0 1px 0 rgba(255,255,255,0.5); }
        }
      `}</style>

      {/* Variant glow container */}
      {(isGuildVariant || isCourtVariant || isSubcontractVariant) && (
        <div style={containerStyle} className="pointer-events-none" />
      )}

    <div className="absolute left-0 w-[1000px]" style={{ top: `${y}px`, height: `${ROW_HEIGHT}px` }}>

      {/* Variant label badge — anchored inside the row, top-right corner */}
      {isGuildVariant && (
        <div
          className="absolute pointer-events-none font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest z-10"
          style={{ right: 8, top: 6, background: 'rgba(139,92,246,0.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.25)', maxWidth: 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          🏛️ GUILD COLLAB
        </div>
      )}
      {isCourtVariant && (
        <div
          className={`absolute pointer-events-none font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest z-10 ${(!isComplete && !isFailed) ? 'animate-pulse' : ''}`}
          style={{ right: 8, top: 6, background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', maxWidth: 130, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          ⚖️ SUPREME COURT
        </div>
      )}

      {/* ── SVG CONNECTING LINES ───────────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
        {/* Task Card -> Bid Node */}
        {phase !== 'spawned' && (
          <line
            x1={taskCardX + 160} y1={localCenter} x2={bidNodeX} y2={localCenter}
            stroke={line1.stroke} strokeWidth={line1.strokeWidth} strokeDasharray={line1.dash}
          />
        )}

        {/* Task Card 60px stub when spawned */}
        {phase === 'spawned' && (
          <line
            x1={taskCardX + 160} y1={localCenter} x2={taskCardX + 220} y2={localCenter}
            stroke="#cbd5e1" strokeWidth={1.5} strokeDasharray="4 4"
          />
        )}

        {/* Bid Node -> Worker Card */}
        {(phase === 'hired' || phase === 'working' || phase === 'verifying' || isComplete || isFailed) && (
          <line
            x1={bidNodeX + 56} y1={localCenter} x2={workerCardX} y2={localCenter}
            stroke={line2.stroke} strokeWidth={line2.strokeWidth} strokeDasharray={line2.dash}
          />
        )}

        {/* Worker Card -> Payment Node */}
        {(isComplete || isFailed) && (
          <line
            x1={workerCardX + 160} y1={localCenter} x2={paymentNodeX} y2={localCenter}
            stroke={line3.stroke} strokeWidth={line3.strokeWidth} strokeDasharray={line3.dash}
          />
        )}

        {/* Court Node Extension Line */}
        {isCourtVariant && (isComplete || isFailed) && (
          <line
            x1={paymentNodeX + 48} y1={localCenter} x2={courtNodeX} y2={localCenter}
            stroke={isFailed ? '#ef4444' : '#ea580c'} strokeWidth={2}
          />
        )}

        {/* Lines from Bid Spoke Cards -> Bid Node */}
        {phase !== 'spawned' &&
          displayBids.map((bid, index) => {
            const pos = getSpokeCardPosition(index, displayBids.length);
            const isFaded = phase !== 'bidding' && bid.status !== 'accepted';
            return (
              <line
                key={`line-${flow.taskId}-bid-${bid.agentId || bid.agentInstanceId}`}
                x1={pos.x + 130}
                y1={pos.y - y + 36}
                x2={bidNodeX + 28}
                y2={localCenter}
                stroke={bid.status === 'accepted' ? '#22c55e' : '#6366f1'}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                style={{ opacity: isFaded ? 0.3 : 1 }}
              />
            );
          })}

        {/* Subcontract dashed line from main worker to subcontract card */}
        {isSubcontractVariant && flow.subcontractAgentName && (
          <line
            x1={workerCardX + 80} y1={localCenter + 50}
            x2={workerCardX + 80} y2={localCenter + 68}
            stroke="#10b981" strokeWidth={1.5} strokeDasharray="3 3"
          />
        )}
      </svg>

      {/* ── NODE COMPONENTS ────────────────────────────────────────────────── */}

      {/* 1. Task Card */}
      <div className="absolute -translate-y-1/2" style={{ left: `${taskCardX}px`, top: `${localCenter}px` }}>
        <TaskCard flow={flow} onClick={() => onTaskCardClick(flow.taskId)} />
      </div>

      {/* 2. Bid Spoke Cards */}
      {phase !== 'spawned' &&
        displayBids.map((bid, index) => {
          const pos = getSpokeCardPosition(index, displayBids.length);
          const isAccepted = bid.status === 'accepted';
          const isRejected = bid.status === 'rejected';
          const isFaded = phase !== 'bidding' && !isAccepted;

          return (
            <div
              key={`${flow.taskId}-bid-${bid.agentId || bid.agentInstanceId}`}
              className={`absolute z-20 transition-opacity duration-500 ${isFaded ? 'opacity-30' : 'opacity-100'}`}
              style={{ left: `${pos.x}px`, top: `${pos.y - y}px` }}
            >
              <BidSpokeCard
                bid={bid}
                isAccepted={isAccepted}
                isRejected={isRejected}
                onClick={() => onAgentClick?.(bid.agentInstanceId)}
              />
            </div>
          );
        })}

      {/* 3. Bid Node */}
      {phase !== 'spawned' && (
        <div className="absolute -translate-y-1/2" style={{ left: `${bidNodeX}px`, top: `${localCenter}px` }}>
          <BidNode
            bidCount={bids.length}
            isBiddingActive={isBiddingActive}
            onClick={() => onBidNodeClick(flow.taskId)}
          />
        </div>
      )}

      {/* 4. Worker Card - main agent */}
      {(phase === 'hired' || phase === 'working' || phase === 'verifying' || isComplete || isFailed) && (
        <div className="absolute -translate-y-1/2" style={{ left: `${workerCardX}px`, top: `${localCenter}px` }}>
          <WorkerCard
            agentName={workerName}
            workerAgent={workerAgent}
            qualityScore={qualityScore}
            isWorking={isWorking}
            subcontractedTo={flow.subcontractedTo}
            onClick={() => {
              if (workerAgent) onAgentClick?.(workerAgent.instanceId);
              else onWorkerCardClick(flow.taskId);
            }}
          />
        </div>
      )}

      {/* 4b. Guild Collaborator Cards — stacked with slight offset, clearly separate */}
      {isGuildVariant && flow.guildCollaborators && flow.guildCollaborators.length > 1 &&
        flow.guildCollaborators.slice(1).map((collab, idx) => (
          <div
            key={`collab-${collab.agentId}-${idx}`}
            className="absolute z-10 cursor-pointer"
            style={{ left: `${workerCardX}px`, top: `${localCenter + 58 + idx * 52}px` }}
            onClick={() => onAgentClick?.(collab.agentId)}
          >
            <div
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl border shadow-sm hover:shadow-md transition-all"
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.08), rgba(99,102,241,0.05))',
                border: '1px solid rgba(139,92,246,0.3)',
                width: '160px',
              }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: 'linear-gradient(135deg,#8b5cf6,#6366f1)' }}
              >
                {collab.agentName.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[9px] font-bold text-slate-700 truncate">{collab.agentName}</p>
                <p className="text-[7px] text-violet-500 font-medium capitalize">{collab.role}</p>
              </div>
            </div>
          </div>
        ))
      }

      {/* 4c. Subcontract Agent Card — placed below main worker, full width of card, clickable */}
      {isSubcontractVariant && flow.subcontractAgentName && (
        <div
          className="absolute cursor-pointer"
          style={{ left: `${workerCardX}px`, top: `${localCenter + 58}px` }}
          onClick={() => flow.subcontractAgentId ? onAgentClick?.(flow.subcontractAgentId) : undefined}
        >
          <div
            className="flex items-center gap-2 px-2.5 py-2 rounded-xl border shadow-sm hover:shadow-md transition-all"
            style={{
              background: 'linear-gradient(135deg, rgba(16,185,129,0.08), rgba(5,150,105,0.04))',
              border: '1px dashed rgba(16,185,129,0.5)',
              width: '160px',
            }}
          >
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}
            >
              {flow.subcontractAgentName.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[9px] font-bold text-slate-700 truncate">{flow.subcontractAgentName}</p>
              <p className="text-[7px] text-emerald-600 font-medium">
                Subcontractor{flow.subcontractFee ? ` · $${flow.subcontractFee.toFixed(2)}` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 6. Payment Node */}
      {(isComplete || isFailed) && (
        <div className="absolute -translate-y-1/2" style={{ left: `${paymentNodeX}px`, top: `${localCenter}px` }}>
          <PaymentNode
            isPaid={isComplete}
            amount={bids.find((b) => b.status === 'accepted')?.bidAmountUSDC || task.budgetUSDC}
            txHash={paymentTxHash}
          />
        </div>
      )}

      {/* 7. Supreme Court Node — clickable */}
      {isCourtVariant && flow.courtVerdict && (isComplete || isFailed) && (
        <div
          className="absolute -translate-y-1/2 cursor-pointer z-10"
          style={{ left: `${courtNodeX}px`, top: `${localCenter}px` }}
          onClick={() => onWorkerCardClick(flow.taskId)}
          title="Click to see Supreme Court ruling"
        >
          <div
            className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-2xl"
            style={{
              background: flow.courtVerdict === 'overturned'
                ? 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))'
                : 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(234,88,12,0.1))',
              border: `2px solid ${flow.courtVerdict === 'overturned' ? '#10b981' : '#f59e0b'}`,
              boxShadow: `0 0 20px ${flow.courtVerdict === 'overturned' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
            }}
          >
            ⚖️
          </div>
          {/* Verdict badge — inline-flex so emoji and text sit on same line */}
          <div
            className="mt-1.5 inline-flex items-center justify-center gap-1 px-1.5 py-0.5 rounded-full whitespace-nowrap w-full"
            style={{
              background: flow.courtVerdict === 'overturned' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: flow.courtVerdict === 'overturned' ? '#059669' : '#d97706',
              border: `1px solid ${flow.courtVerdict === 'overturned' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
              fontSize: '7px',
              fontWeight: 800,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}
          >
            <span>{flow.courtVerdict === 'overturned' ? '✅' : flow.courtVerdict === 'upheld' ? '🔴' : '⏳'}</span>
            <span>{flow.courtVerdict === 'overturned' ? 'Overturned' : flow.courtVerdict === 'upheld' ? 'Upheld' : 'Pending'}</span>
          </div>
        </div>
      )}
    </div>
    </>
  );
};
