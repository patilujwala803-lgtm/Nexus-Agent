import React from 'react';
import { EconomyStats } from '../types';

interface StatsBarProps {
  stats: EconomyStats;
  totalUSDCFlowed?: number;
  completedTasksCount?: number;
}

interface StatPillProps {
  emoji: string;
  value: string | number;
  label: string;
  color: string;
}

const StatPill: React.FC<StatPillProps> = ({ emoji, value, label, color }) => (
  <div className="flex items-center gap-1.5">
    <span className="text-sm">{emoji}</span>
    <div className="flex items-baseline gap-1">
      <span className="text-sm font-extrabold" style={{ fontFamily: "'Syne', sans-serif", color }}>
        {value}
      </span>
      <span className="text-[10px] font-medium" style={{ color: 'rgba(30,27,75,0.5)' }}>{label}</span>
    </div>
  </div>
);

const Divider = () => (
  <div className="w-px h-5" style={{ background: 'rgba(99,102,241,0.12)' }} />
);

export const StatsBar: React.FC<StatsBarProps> = React.memo(
  ({ stats, totalUSDCFlowed, completedTasksCount }) => {
    const flowed = totalUSDCFlowed !== undefined ? totalUSDCFlowed : stats.totalUSDCFlowed;
    const completed = completedTasksCount !== undefined ? completedTasksCount : stats.completedTasks;
    const topEarnerText = stats.topEarner
      ? `${stats.topEarner.name.split('-')[0]}: $${stats.topEarner.amount.toFixed(2)}`
      : '—';

    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-auto"
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.95)',
          boxShadow: '0 4px 24px rgba(99,102,241,0.12), 0 1px 2px rgba(0,0,0,0.04)',
          borderRadius: 999,
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          whiteSpace: 'nowrap',
        }}
      >
        <StatPill emoji="🤖" value={stats.totalAgents || 49} label="Agents" color="#6366f1" />
        <Divider />
        <StatPill emoji="⚡" value={stats.activeTasks} label="Active" color="#f59e0b" />
        <Divider />
        <StatPill emoji="💰" value={`$${flowed.toFixed(2)}`} label="Flowed" color="#10b981" />
        <Divider />
        <StatPill emoji="✅" value={completed} label="Done" color="#6366f1" />
        <Divider />
        <StatPill emoji="🏆" value={topEarnerText} label="" color="#8b5cf6" />
        {stats.totalLoansDisbursed > 0 && (
          <>
            <Divider />
            <StatPill emoji="🏦" value={`$${stats.totalLoansDisbursed.toFixed(2)}`} label="Loans" color="#f43f5e" />
          </>
        )}
      </div>
    );
  }
);

StatsBar.displayName = 'StatsBar';
