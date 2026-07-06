import React from 'react';
import { Agent } from '../types';
import { SidebarWrapper } from './SidebarWrapper';

interface AgentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  agent: Agent | null;
}

const ROLE_ACCENT: Record<string, { color: string; bg: string; label: string }> = {
  producer: { color: '#6366f1', bg: 'rgba(99,102,241,0.1)', label: 'Producer' },
  verifier: { color: '#10b981', bg: 'rgba(16,185,129,0.1)', label: 'Verifier' },
  finance:  { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  label: 'Finance' },
  meta:     { color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  label: 'Meta' },
};

const StatCard: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <div
    className="p-3 rounded-xl"
    style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.08)' }}
  >
    <span className="text-[10px] font-medium uppercase tracking-wider block mb-0.5" style={{ color: 'rgba(30,27,75,0.45)' }}>
      {label}
    </span>
    <span
      className="text-sm font-extrabold"
      style={{ fontFamily: "'Syne', sans-serif", color: color || '#1e1b4b' }}
    >
      {value}
    </span>
  </div>
);

export const AgentSidebar: React.FC<AgentSidebarProps> = ({ isOpen, onClose, agent }) => {
  if (!agent) return null;

  const roleTheme = ROLE_ACCENT[agent.role] || ROLE_ACCENT.producer;
  const netPosition = parseFloat((agent.totalEarned - agent.totalSpent).toFixed(2));
  const totalJobs = (agent.jobsCompleted || 0) + (agent.jobsFailed || 0);
  const successRate = totalJobs > 0 ? Math.round((agent.jobsCompleted / totalJobs) * 100) : 100;
  const repColor = agent.reputation >= 70 ? '#10b981' : agent.reputation >= 40 ? '#f59e0b' : '#ef4444';

  return (
    <SidebarWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Agent Profile"
      subtitle={`ID: ${agent.instanceId}`}
      titleIcon="🤖"
      accentColor={roleTheme.color}
    >
      {/* Avatar & Identity */}
      <div
        className="flex items-center gap-4 p-4 rounded-2xl"
        style={{ background: 'rgba(99,102,241,0.04)', border: '1px solid rgba(99,102,241,0.1)' }}
      >
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-extrabold shrink-0"
          style={{ background: `linear-gradient(135deg, ${roleTheme.color}, ${roleTheme.color}88)`, boxShadow: `0 0 0 3px ${roleTheme.bg}` }}
        >
          {agent.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-base truncate" style={{ fontFamily: "'Syne', sans-serif", color: '#1e1b4b' }}>
            {agent.name}
          </h3>
          <div className="flex flex-wrap items-center gap-1.5 mt-1">
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: roleTheme.bg, color: roleTheme.color }}
            >
              {roleTheme.label}
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={{
                background: agent.status === 'busy' ? 'rgba(245,158,11,0.1)' : 'rgba(16,185,129,0.1)',
                color: agent.status === 'busy' ? '#d97706' : '#059669',
              }}
            >
              ● {agent.status}
            </span>
            {agent.bidStrategy && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(30,27,75,0.05)', color: 'rgba(30,27,75,0.5)' }}
              >
                {agent.bidStrategy}
              </span>
            )}
          </div>
          <p className="text-[10px] font-mono mt-1 truncate" style={{ color: 'rgba(30,27,75,0.3)' }}>
            {agent.instanceId}
          </p>
        </div>
      </div>

      {/* Financials */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(30,27,75,0.4)' }}>
          Financial Standing
        </h4>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="USDC Balance" value={`$${agent.usdcBalance.toFixed(4)}`} color={agent.usdcBalance < 0.02 ? '#ef4444' : '#10b981'} />
          <StatCard label="Net Position" value={`${netPosition >= 0 ? '+' : ''}$${netPosition}`} color={netPosition >= 0 ? '#10b981' : '#ef4444'} />
          <StatCard label="Total Earned" value={`$${agent.totalEarned.toFixed(4)}`} color="#6366f1" />
          <StatCard label="Total Spent" value={`$${agent.totalSpent.toFixed(4)}`} />
        </div>
      </div>

      {/* Loan Section */}
      {agent.loanBalance && agent.loanBalance > 0 ? (
        <div
          className="p-3.5 rounded-2xl space-y-2"
          style={{ background: 'rgba(244,63,94,0.05)', border: '1px solid rgba(244,63,94,0.2)' }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#f43f5e' }}>
              ⚠️ Active Bank Loan
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(244,63,94,0.1)', color: '#f43f5e' }}
            >
              {((agent.loanInterestRate || 0.15) * 100).toFixed(0)}% Rate
            </span>
          </div>
          <div className="flex justify-between text-xs">
            <span style={{ color: 'rgba(30,27,75,0.5)' }}>Balance:</span>
            <span className="font-bold" style={{ fontFamily: "'Syne', sans-serif", color: '#f43f5e' }}>
              ${agent.loanBalance.toFixed(2)} USDC
            </span>
          </div>
          <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'rgba(244,63,94,0.1)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(5, (1 - agent.loanBalance / 5) * 100)}%`, background: '#f43f5e' }}
            />
          </div>
          {agent.isHighDefaultRisk && (
            <p className="text-[10px] font-bold animate-pulse" style={{ color: '#ef4444' }}>
              🚨 High Default Risk — Bank seizure flag active
            </p>
          )}
        </div>
      ) : null}

      {/* Reputation */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(30,27,75,0.4)' }}>
            Reputation Score
          </h4>
          <span className="text-sm font-extrabold" style={{ fontFamily: "'Syne', sans-serif", color: repColor }}>
            {agent.reputation}/100
          </span>
        </div>
        <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${agent.reputation}%`, background: `linear-gradient(90deg, ${repColor}, ${repColor}99)` }}
          />
        </div>
        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.1)' }}>
            <span className="text-[10px] block" style={{ color: 'rgba(30,27,75,0.4)' }}>Completed</span>
            <span className="font-extrabold" style={{ color: '#10b981' }}>{agent.jobsCompleted || 0}</span>
          </div>
          <div className="p-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
            <span className="text-[10px] block" style={{ color: 'rgba(30,27,75,0.4)' }}>Failed</span>
            <span className="font-extrabold" style={{ color: '#ef4444' }}>{agent.jobsFailed || 0}</span>
          </div>
          <div className="p-2 rounded-xl" style={{ background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.1)' }}>
            <span className="text-[10px] block" style={{ color: 'rgba(30,27,75,0.4)' }}>Win Rate</span>
            <span className="font-extrabold" style={{ color: '#6366f1' }}>{successRate}%</span>
          </div>
        </div>
      </div>

      {/* Guild */}
      <div>
        <h4 className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(30,27,75,0.4)' }}>
          Guild Affiliation
        </h4>
        {agent.guildName ? (
          <div className="flex items-center justify-between p-3 rounded-xl" style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
            <span className="text-xs font-bold flex items-center gap-1.5" style={{ color: '#059669' }}>
              🏛️ {agent.guildName}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(16,185,129,0.12)', color: '#059669' }}>
              Member
            </span>
          </div>
        ) : (
          <p className="text-xs italic" style={{ color: 'rgba(30,27,75,0.3)' }}>Not in a guild</p>
        )}
      </div>

      {/* Skills */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'rgba(30,27,75,0.4)' }}>
            Skills & Certs
          </h4>
          {agent.qualityOffset && agent.qualityOffset > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(245,158,11,0.1)', color: '#d97706' }}>
              📈 +{agent.qualityOffset} Quality
            </span>
          ) : null}
        </div>
        {agent.certifications && agent.certifications.length > 0 && (
          <div className="flex items-center gap-2 p-2 rounded-xl mb-2" style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.15)' }}>
            <span>⭐</span>
            <span className="text-xs font-bold" style={{ color: '#d97706' }}>Advanced Certified Agent</span>
          </div>
        )}
        <div className="flex flex-wrap gap-1.5">
          {agent.skills.map((skill, i) => (
            <span
              key={i}
              className="text-[10px] font-semibold px-2 py-1 rounded-lg"
              style={{ background: 'rgba(99,102,241,0.07)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.12)' }}
            >
              {skill}
            </span>
          ))}
        </div>
      </div>

      {/* Wallet */}
      {agent.walletAddress && (
        <div className="p-3 rounded-xl" style={{ background: 'rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.06)' }}>
          <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: 'rgba(30,27,75,0.35)' }}>
            Wallet Address
          </span>
          <span className="text-[10px] font-mono break-all" style={{ color: 'rgba(30,27,75,0.5)' }}>
            {agent.walletAddress}
          </span>
        </div>
      )}
    </SidebarWrapper>
  );
};
