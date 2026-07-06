import React from 'react';
import { EconomyAnnouncement } from '../hooks/useEconomySocket';

interface AnnouncementBannerProps {
  announcements: EconomyAnnouncement[];
}

const ANNOUNCEMENT_CONFIG = {
  guild_formed: {
    emoji: '🏛️',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.12)',
    border: 'rgba(16,185,129,0.3)',
    formatMessage: (payload: any) => `${payload.guildName} formed — ${payload.members?.length || 2} agents collaborating`,
  },
  loan_issued: {
    emoji: '🏦',
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.1)',
    border: 'rgba(139,92,246,0.25)',
    formatMessage: (payload: any) => `Bank loan of $${payload.amount} USDC to ${payload.agentName} at ${(payload.interestRate * 100).toFixed(0)}%`,
  },
  loan_repaid: {
    emoji: '💚',
    color: '#10b981',
    bg: 'rgba(16,185,129,0.08)',
    border: 'rgba(16,185,129,0.2)',
    formatMessage: (payload: any) => `${payload.agentName} repaid $${payload.amount} USDC — $${payload.remaining} remaining`,
  },
  court_appeal: {
    emoji: '⚖️',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.08)',
    border: 'rgba(239,68,68,0.2)',
    formatMessage: (payload: any) => payload.round === 'filing'
      ? `${payload.agentName} filed Supreme Court appeal`
      : `Supreme Court: ${payload.result === 'overturned' ? 'OVERRULED ✓' : 'UPHELD ✗'} for ${payload.agentName}`,
  },
  education_purchased: {
    emoji: '🎓',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.08)',
    border: 'rgba(245,158,11,0.2)',
    formatMessage: (payload: any) => `${payload.agentName} upgraded: learned "${payload.skill}" for $${payload.cost} USDC`,
  },
  subcontract_hired: {
    emoji: '🔗',
    color: '#6366f1',
    bg: 'rgba(99,102,241,0.08)',
    border: 'rgba(99,102,241,0.2)',
    formatMessage: (payload: any) => `${payload.primaryAgentName} subcontracted ${payload.subAgentName} for $${payload.fee} USDC`,
  },
};

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcements }) => {
  if (announcements.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2 pointer-events-none">
      {announcements.map((ann) => {
        const cfg = ANNOUNCEMENT_CONFIG[ann.type];
        if (!cfg) return null;
        const message = cfg.formatMessage(ann.payload);

        return (
          <div
            key={ann.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl max-w-[360px] announcement-enter"
            style={{
              background: cfg.bg,
              backdropFilter: 'blur(16px) saturate(180%)',
              WebkitBackdropFilter: 'blur(16px) saturate(180%)',
              border: `1px solid ${cfg.border}`,
              boxShadow: `0 4px 24px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.5) inset`,
            }}
          >
            {/* Icon */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm"
              style={{ background: `${cfg.color}18`, border: `1px solid ${cfg.color}40` }}
            >
              {cfg.emoji}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p
                className="text-xs font-semibold leading-snug"
                style={{ color: '#1e1b4b' }}
              >
                {message}
              </p>
            </div>

            {/* Accent dot */}
            <div
              className="w-1.5 h-1.5 rounded-full shrink-0 animate-pulse"
              style={{ background: cfg.color }}
            />
          </div>
        );
      })}
    </div>
  );
};
