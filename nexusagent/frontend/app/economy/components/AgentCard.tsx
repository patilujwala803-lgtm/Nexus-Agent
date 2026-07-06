import React from 'react';
import { Agent, Bid } from '../types';

interface BidSpokeCardProps {
  bid: Bid;
  isRejected?: boolean;
  isAccepted?: boolean;
  onClick?: () => void;
}

export const BidSpokeCard: React.FC<BidSpokeCardProps> = ({
  bid,
  isRejected,
  isAccepted,
  onClick,
}) => {
  const borderColor = isAccepted ? '#10b981' : isRejected ? 'rgba(148,163,184,0.3)' : '#6366f1';
  const glowStyle = isAccepted
    ? { boxShadow: '0 0 12px rgba(16,185,129,0.25)' }
    : {};

  return (
    <div
      onClick={onClick}
      className="w-[130px] h-[72px] rounded-xl p-2 flex flex-col justify-between cursor-pointer select-none transition-all duration-500"
      style={{
        background: isRejected ? 'rgba(255,255,255,0.3)' : isAccepted ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${borderColor}`,
        opacity: isRejected ? 0.3 : 1,
        transform: isRejected ? 'scale(0.9)' : 'scale(1)',
        ...glowStyle,
      }}
    >
      <div className="flex items-center justify-between">
        <h5
          className="text-[10px] font-bold truncate max-w-[80px]"
          style={{ color: '#1e1b4b' }}
        >
          {bid.agentName.split('-')[0]}
        </h5>
        <span
          className="text-[9px] font-extrabold"
          style={{ fontFamily: "'Syne', sans-serif", color: isAccepted ? '#10b981' : '#6366f1' }}
        >
          ${bid.bidAmountUSDC.toFixed(2)}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center text-[8px]" style={{ color: 'rgba(30,27,75,0.5)' }}>
          <span>Rep: {bid.reputation ?? 50}</span>
          <span>{bid.jobsCompleted ?? 0} jobs</span>
        </div>
        <div className="w-full rounded-full h-1 overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(10, bid.reputation ?? 50))}%`,
              background: isAccepted ? '#10b981' : '#6366f1',
            }}
          />
        </div>
      </div>

      {bid.counterOfferUSDC && (
        <span
          className="text-[8px] font-bold rounded px-1 text-center"
          style={{ color: '#d97706', background: 'rgba(245,158,11,0.1)' }}
        >
          Counter: ${bid.counterOfferUSDC}
        </span>
      )}
    </div>
  );
};

interface WorkerCardProps {
  agentName: string;
  workerAgent: Agent | null;
  qualityScore: number | null;
  isWorking: boolean;
  subcontractedTo?: string | null;
  onClick?: () => void;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({
  agentName,
  workerAgent,
  qualityScore,
  isWorking,
  subcontractedTo,
  onClick,
}) => {
  const rep = workerAgent?.reputation ?? 85;
  const jobs = workerAgent?.jobsCompleted ?? 0;

  return (
    <div
      onClick={onClick}
      className="w-[160px] h-[100px] rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer select-none group shrink-0 transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: isWorking ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.9)',
        borderLeft: '3px solid #6366f1',
        boxShadow: isWorking
          ? '0 0 0 0 rgba(99,102,241,0.3), 0 2px 12px rgba(99,102,241,0.12)'
          : '0 2px 12px rgba(0,0,0,0.06)',
        animation: isWorking ? 'pulseGlow 1.8s ease-in-out infinite' : 'none',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: 'rgba(30,27,75,0.4)' }}>
          Worker
        </span>
        <span
          className="text-[8px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: 'rgba(99,102,241,0.1)', color: '#6366f1' }}
        >
          {workerAgent?.role || 'Producer'}
        </span>
      </div>

      {/* Name */}
      <div className="my-0.5">
        <h4
          className="text-[11px] font-bold truncate transition-colors"
          style={{ color: '#1e1b4b', fontFamily: "'Inter', sans-serif" }}
        >
          {agentName}
        </h4>
        {subcontractedTo && (
          <p className="text-[9px] font-bold truncate" style={{ color: '#f59e0b' }}>
            ↳ Sub: {subcontractedTo}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="space-y-1 pt-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <div className="flex justify-between items-center text-[9px]" style={{ color: 'rgba(30,27,75,0.45)' }}>
          <span>Rep {rep}/100</span>
          <span>{jobs} done</span>
        </div>
        {isWorking ? (
          <div className="text-[9px] font-bold flex items-center gap-1" style={{ color: '#6366f1' }}>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping inline-block" />
            Working...
          </div>
        ) : qualityScore !== null && qualityScore !== undefined ? (
          <div className="flex items-center justify-between text-[9px]">
            <span style={{ color: 'rgba(30,27,75,0.4)' }}>Score:</span>
            <span
              className="font-extrabold px-1.5 py-0.5 rounded-full"
              style={{
                background: qualityScore >= 74 ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)',
                color: qualityScore >= 74 ? '#059669' : '#dc2626',
              }}
            >
              {qualityScore}/100
            </span>
          </div>
        ) : (
          <span className="text-[9px] italic" style={{ color: 'rgba(30,27,75,0.3)' }}>Assigned</span>
        )}
      </div>
    </div>
  );
};
