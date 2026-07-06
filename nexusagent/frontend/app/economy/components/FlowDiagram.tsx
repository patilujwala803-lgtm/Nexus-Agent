import React from 'react';
import { FlowState } from '../types';
import { TaskCard } from './TaskCard';
import { BidNode } from './BidNode';
import { BidSpokeCard, WorkerCard } from './AgentCard';
import { JudgeNode } from './JudgeNode';
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
  const isVerifying = phase === 'verifying';
  const isComplete = phase === 'complete';
  const isFailed = phase === 'failed';
  const isCourtVariant = taskVariant === 'court';

  // Coordinate system
  const CANVAS_START_X = 80;
  const taskCardX = CANVAS_START_X; // 80
  const bidNodeX = CANVAS_START_X + 240; // 320
  const workerCardX = CANVAS_START_X + 420; // 500
  const judgeNodeX = CANVAS_START_X + 640; // 720
  const paymentNodeX = CANVAS_START_X + 780; // 860
  const courtNodeX = CANVAS_START_X + 900; // 980

  const centerY = y + 50;

  // Spoke card positions (up to 3 bids)
  const displayBids = bids.slice(0, 3);

  const getSpokeCardPosition = (index: number, total: number) => {
    const spokeX = bidNodeX - 120; // 200
    let spokeY = y + 50;
    if (total === 1) {
      spokeY = y - 80;
    } else if (total === 2) {
      spokeY = index === 0 ? y - 80 : y + 100;
    } else if (total >= 3) {
      if (index === 0) spokeY = y - 80;
      else if (index === 1) spokeY = y + 30;
      else spokeY = y + 140;
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

  const line1 = getLineStyle(1); // Task -> BidNode
  const line2 = getLineStyle(2); // BidNode -> WorkerCard
  const line3 = getLineStyle(3); // WorkerCard -> JudgeNode
  const line4 = getLineStyle(4); // JudgeNode -> PaymentNode

  const isGuildVariant = taskVariant === 'guild';
  const isCourtVariant = taskVariant === 'court';
  const isSubcontractVariant = taskVariant === 'subcontract';

  // Container glow styles per variant
  const containerStyle: React.CSSProperties = isGuildVariant
    ? {
        position: 'absolute', left: 0, width: '1160px', height: '210px', top: `${y}px`,
        borderRadius: '16px',
        background: 'linear-gradient(90deg, rgba(139,92,246,0.04), rgba(99,102,241,0.06), rgba(139,92,246,0.04))',
        border: '1px solid rgba(139,92,246,0.2)',
        boxShadow: '0 0 32px rgba(139,92,246,0.12), inset 0 1px 0 rgba(255,255,255,0.5)',
        animation: 'guildPulse 3s ease-in-out infinite',
      }
    : isCourtVariant
    ? {
        position: 'absolute', left: 0, width: '1160px', height: '210px', top: `${y}px`,
        borderRadius: '16px',
        background: 'linear-gradient(90deg, rgba(245,158,11,0.04), rgba(234,88,12,0.07), rgba(245,158,11,0.04))',
        border: '1px solid rgba(245,158,11,0.28)',
        boxShadow: '0 0 36px rgba(245,158,11,0.18), inset 0 1px 0 rgba(255,255,255,0.5)',
        animation: 'courtPulse 2.5s ease-in-out infinite',
      }
    : isSubcontractVariant
    ? {
        position: 'absolute', left: 0, width: '1160px', height: '210px', top: `${y}px`,
        borderRadius: '16px',
        background: 'rgba(16,185,129,0.02)',
        border: '1px solid rgba(16,185,129,0.1)',
      }
    : { position: 'absolute', left: 0, width: '1160px', height: '210px', top: `${y}px` };

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

      {/* Variant label badge floating top-right of row */}
      {isGuildVariant && (
        <div
          className="absolute pointer-events-none font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest"
          style={{ left: 1080, top: y + 6, background: 'rgba(139,92,246,0.12)', color: '#7c3aed', border: '1px solid rgba(139,92,246,0.25)', zIndex: 5 }}
        >
          🏛️ GUILD COLLAB
        </div>
      )}
      {isCourtVariant && (
        <div
          className="absolute pointer-events-none font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse"
          style={{ left: 1060, top: y + 6, background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)', zIndex: 5 }}
        >
          ⚖️ SUPREME COURT
        </div>
      )}

    <div className="absolute left-0 w-[1100px] h-[210px]" style={{ top: `${y}px` }}>
      {/* ── SVG CONNECTING LINES ───────────────────────────────────────────── */}
      <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0">
        {/* Task Card -> Bid Node */}
        {phase !== 'spawned' && (
          <line
            x1={taskCardX + 160}
            y1={50}
            x2={bidNodeX}
            y2={50}
            stroke={line1.stroke}
            strokeWidth={line1.strokeWidth}
            strokeDasharray={line1.dash}
          />
        )}

        {/* Task Card 60px stub when spawned */}
        {phase === 'spawned' && (
          <line
            x1={taskCardX + 160}
            y1={50}
            x2={taskCardX + 220}
            y2={50}
            stroke="#cbd5e1"
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
        )}

        {/* Bid Node -> Worker Card */}
        {(phase === 'hired' || phase === 'working' || phase === 'verifying' || isComplete || isFailed) && (
          <line
            x1={bidNodeX + 56}
            y1={50}
            x2={workerCardX}
            y2={50}
            stroke={line2.stroke}
            strokeWidth={line2.strokeWidth}
            strokeDasharray={line2.dash}
          />
        )}

        {/* Worker Card -> Judge Node */}
        {(phase === 'verifying' || isComplete || isFailed) && (
          <line
            x1={workerCardX + 160}
            y1={50}
            x2={judgeNodeX}
            y2={50}
            stroke={line3.stroke}
            strokeWidth={line3.strokeWidth}
            strokeDasharray={line3.dash}
          />
        )}

        {/* Judge Node -> Payment Node */}
        {(isComplete || isFailed) && (
          <line
            x1={judgeNodeX + 48}
            y1={50}
            x2={paymentNodeX}
            y2={50}
            stroke={line4.stroke}
            strokeWidth={line4.strokeWidth}
            strokeDasharray={line4.dash}
          />
        )}

        {/* Court Node Extension Line */}
        {isCourtVariant && (isComplete || isFailed) && (
          <line
            x1={paymentNodeX + 48}
            y1={50}
            x2={courtNodeX}
            y2={50}
            stroke={isFailed ? '#ef4444' : '#ea580c'}
            strokeWidth={2}
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
                y2={50}
                stroke={bid.status === 'accepted' ? '#22c55e' : '#6366f1'}
                strokeWidth={1.5}
                strokeDasharray="3 3"
                style={{ opacity: isFaded ? 0.3 : 1 }}
              />
            );
          })}
      </svg>

      {/* ── NODE COMPONENTS ────────────────────────────────────────────────── */}

      {/* 1. Task Card */}
      <div className="absolute top-[0px]" style={{ left: `${taskCardX}px` }}>
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
        <div className="absolute top-[22px]" style={{ left: `${bidNodeX}px` }}>
          <BidNode
            bidCount={bids.length}
            isBiddingActive={isBiddingActive}
            onClick={() => onBidNodeClick(flow.taskId)}
          />
        </div>
      )}

      {/* 4. Worker Card */}
      {(phase === 'hired' || phase === 'working' || phase === 'verifying' || isComplete || isFailed) && (
        <div className="absolute top-[0px]" style={{ left: `${workerCardX}px` }}>
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

      {/* 5. Judge Node */}
      {(phase === 'verifying' || isComplete || isFailed) && (
        <div className="absolute top-[26px]" style={{ left: `${judgeNodeX}px` }}>
          <JudgeNode
            isEvaluating={isVerifying}
            verdict={
              isComplete
                ? 'approved'
                : isFailed
                ? 'rejected'
                : null
            }
            onClick={() => onWorkerCardClick(flow.taskId)}
          />
        </div>
      )}

      {/* 6. Payment Node */}
      {(isComplete || isFailed) && (
        <div className="absolute top-[26px]" style={{ left: `${paymentNodeX}px` }}>
          <PaymentNode
            isPaid={isComplete}
            amount={
              bids.find((b) => b.status === 'accepted')?.bidAmountUSDC || task.budgetUSDC
            }
            txHash={paymentTxHash}
          />
        </div>
      )}

      {/* 7. Supreme Court Node (Court Variant) — clickable, glowing */}
      {isCourtVariant && (isComplete || isFailed) && (
        <div
          className="absolute top-[22px] cursor-pointer z-10 group"
          style={{ left: `${courtNodeX}px` }}
          onClick={() => onWorkerCardClick(flow.taskId)}
          title="Click to see Supreme Court ruling"
        >
          <div
            className="w-[56px] h-[56px] rounded-full flex items-center justify-center text-2xl relative"
            style={{
              background: flow.courtVerdict === 'overturned'
                ? 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(5,150,105,0.1))'
                : 'linear-gradient(135deg,rgba(245,158,11,0.15),rgba(234,88,12,0.1))',
              border: `2px solid ${flow.courtVerdict === 'overturned' ? '#10b981' : '#f59e0b'}`,
              boxShadow: `0 0 20px ${flow.courtVerdict === 'overturned' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
              animation: 'courtPulse 2.5s ease-in-out infinite',
            }}
          >
            ⚖️
          </div>
          {/* Verdict badge */}
          <div
            className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[7px] font-extrabold px-1.5 py-0.5 rounded-full whitespace-nowrap uppercase tracking-wider"
            style={{
              background: flow.courtVerdict === 'overturned' ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
              color: flow.courtVerdict === 'overturned' ? '#059669' : '#d97706',
              border: `1px solid ${flow.courtVerdict === 'overturned' ? 'rgba(16,185,129,0.4)' : 'rgba(245,158,11,0.4)'}`,
            }}
          >
            {flow.courtVerdict === 'overturned' ? 'Overturned' : flow.courtVerdict === 'upheld' ? 'Upheld' : 'Pending'}
          </div>
        </div>
      )}
    </div>
    </>
  );
};
