import React from 'react';
import { FlowState, TaskTier } from '../types';

interface TaskCardProps {
  flow: FlowState;
  onClick: () => void;
}

const VARIANT_CONFIG = {
  guild: {
    borderColor: '#10b981',
    bg: 'rgba(16,185,129,0.06)',
    badge: { label: '🏛 Guild', bg: 'rgba(16,185,129,0.12)', color: '#059669' },
  },
  court: {
    borderColor: '#ef4444',
    bg: 'rgba(239,68,68,0.05)',
    badge: { label: '⚖️ Court', bg: 'rgba(239,68,68,0.1)', color: '#dc2626' },
  },
  subcontract: {
    borderColor: '#f59e0b',
    bg: 'rgba(245,158,11,0.05)',
    badge: { label: '🔗 Sub', bg: 'rgba(245,158,11,0.1)', color: '#d97706' },
  },
  loan: {
    borderColor: '#8b5cf6',
    bg: 'rgba(139,92,246,0.05)',
    badge: { label: '🏦 Loan', bg: 'rgba(139,92,246,0.1)', color: '#7c3aed' },
  },
  education: {
    borderColor: '#3b82f6',
    bg: 'rgba(59,130,246,0.05)',
    badge: { label: '🎓 Edu', bg: 'rgba(59,130,246,0.1)', color: '#2563eb' },
  },
  normal: {
    borderColor: '#6366f1',
    bg: 'rgba(255,255,255,0.7)',
    badge: null,
  },
};

const TIER_CONFIG: Record<TaskTier, { color: string; label: string }> = {
  easy: { color: '#10b981', label: 'Easy' },
  medium: { color: '#f59e0b', label: 'Medium' },
  complex: { color: '#ef4444', label: 'Complex' },
};

export const TaskCard: React.FC<TaskCardProps> = ({ flow, onClick }) => {
  const { task, tier, phase, taskVariant, guildName } = flow;
  const variant = VARIANT_CONFIG[taskVariant] || VARIANT_CONFIG.normal;
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.medium;
  const titleText = task.title.replace(/\[(EASY|MEDIUM|COMPLEX)\]/gi, '').trim();

  return (
    <div
      onClick={onClick}
      className="w-[160px] h-[100px] rounded-2xl cursor-pointer relative overflow-hidden flex flex-col justify-between p-3 select-none shrink-0 group transition-all duration-200 hover:-translate-y-0.5"
      style={{
        background: variant.bg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid rgba(255,255,255,0.9)`,
        borderLeft: `3px solid ${variant.borderColor}`,
        boxShadow: '0 2px 12px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
      }}
    >
      {/* Top Row */}
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-[9px] font-bold uppercase tracking-wider truncate"
          style={{ color: variant.borderColor }}
        >
          {task.requiredSkill}
        </span>
        {variant.badge ? (
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: variant.badge.bg, color: variant.badge.color }}
          >
            {variant.badge.label}
          </span>
        ) : (
          <span
            className="text-[8px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
            style={{ background: `${tierCfg.color}18`, color: tierCfg.color }}
          >
            {tierCfg.label}
          </span>
        )}
      </div>

      {/* Title */}
      <div className="flex-1 flex flex-col justify-center my-0.5">
        <h4
          className="text-[11px] font-bold leading-snug line-clamp-2 transition-colors"
          style={{ color: '#1e1b4b', fontFamily: "'Inter', sans-serif" }}
          title={titleText}
        >
          {titleText}
        </h4>
        {guildName && (
          <p className="text-[9px] font-bold mt-0.5 truncate" style={{ color: '#10b981' }}>{guildName}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid rgba(0,0,0,0.06)' }}>
        <span
          className="text-[11px] font-extrabold"
          style={{ fontFamily: "'Syne', sans-serif", color: '#6366f1' }}
        >
          ${task.budgetUSDC}
        </span>

        {phase === 'spawned' && (
          <span className="flex items-center gap-0.5 text-[8px] font-bold" style={{ color: '#f59e0b' }}>
            <span className="w-1.5 h-1.5 rounded-full border border-current border-t-transparent animate-spin inline-block" />
            Queued
          </span>
        )}
        {phase === 'bidding' && (
          <span className="text-[9px] font-bold animate-pulse" style={{ color: '#6366f1' }}>🔨 Bidding</span>
        )}
        {phase === 'complete' && (
          <span className="text-[9px] font-bold" style={{ color: '#10b981' }}>✓ Done</span>
        )}
        {phase === 'failed' && (
          <span className="text-[9px] font-bold" style={{ color: '#ef4444' }}>✕ Failed</span>
        )}
        {!['spawned','bidding','complete','failed'].includes(phase) && (
          <span className="text-[9px] font-bold animate-pulse" style={{ color: '#6366f1' }}>● Active</span>
        )}
      </div>
    </div>
  );
};
