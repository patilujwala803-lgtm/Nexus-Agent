import React from 'react';

interface JudgeNodeProps {
  isEvaluating?: boolean;
  verdict?: 'sustained' | 'overturned' | 'approved' | 'rejected' | null;
  onClick?: () => void;
}

export const JudgeNode: React.FC<JudgeNodeProps> = React.memo(
  ({ isEvaluating = false, verdict = null, onClick }) => {
    const isApproved = verdict === 'approved' || verdict === 'overturned';
    const isRejected = verdict === 'rejected' || verdict === 'sustained';

    const borderColor = isEvaluating
      ? '#f59e0b'
      : isApproved
      ? '#10b981'
      : isRejected
      ? '#ef4444'
      : 'rgba(148,163,184,0.5)';

    const bg = isEvaluating
      ? 'rgba(245,158,11,0.08)'
      : isApproved
      ? 'rgba(16,185,129,0.08)'
      : isRejected
      ? 'rgba(239,68,68,0.06)'
      : 'rgba(255,255,255,0.8)';

    const label = isEvaluating ? 'Evaluating' : isApproved ? '✓ Approved' : isRejected ? '✕ Rejected' : 'Jury';

    return (
      <div className="relative flex flex-col items-center" onClick={onClick}>
        <div
          className="w-[48px] h-[48px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-300 hover:scale-105"
          style={{
            background: bg,
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `2px solid ${borderColor}`,
            boxShadow: isEvaluating
              ? '0 0 0 4px rgba(245,158,11,0.15)'
              : isApproved
              ? '0 0 12px rgba(16,185,129,0.2)'
              : '0 2px 8px rgba(0,0,0,0.06)',
            animation: isEvaluating ? 'amberPulse 1.8s ease-in-out infinite' : 'none',
          }}
        >
          {/* Scale SVG */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 3v18M3 7l9-4 9 4M6 11l-3 6h6L6 11zm12 0l-3 6h6l-3-6z"
              stroke={isEvaluating ? '#f59e0b' : isApproved ? '#10b981' : isRejected ? '#ef4444' : '#94a3b8'}
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <span
          className="text-[10px] font-bold mt-1 whitespace-nowrap"
          style={{
            color: isEvaluating ? '#f59e0b' : isApproved ? '#10b981' : isRejected ? '#ef4444' : 'rgba(30,27,75,0.4)',
          }}
        >
          {label}
        </span>
      </div>
    );
  }
);

JudgeNode.displayName = 'JudgeNode';
