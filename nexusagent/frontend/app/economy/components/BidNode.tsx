import React from 'react';

interface BidNodeProps {
  bidCount: number;
  isBiddingActive: boolean;
  onClick: () => void;
}

export const BidNode: React.FC<BidNodeProps> = ({ bidCount, isBiddingActive, onClick }) => {
  return (
    <div
      onClick={onClick}
      className="w-[56px] h-[56px] rounded-full flex flex-col items-center justify-center cursor-pointer relative z-10 select-none group shrink-0 transition-all duration-300 hover:scale-105"
      title="Click to view Bidding Auction Leaderboard"
      style={{
        background: isBiddingActive ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.8)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `2px solid ${isBiddingActive ? '#6366f1' : bidCount > 0 ? '#6366f1' : 'rgba(148,163,184,0.5)'}`,
        boxShadow: isBiddingActive
          ? '0 0 0 4px rgba(99,102,241,0.15)'
          : '0 2px 8px rgba(0,0,0,0.06)',
        animation: isBiddingActive ? 'pulseGlow 1.6s ease-in-out infinite' : 'none',
      }}
    >
      {/* Gavel SVG */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="group-hover:scale-110 transition-transform">
        <path
          d="M5 3L19 17M15 3L21 9M8 16l-5 5"
          stroke={isBiddingActive ? '#6366f1' : bidCount > 0 ? '#6366f1' : '#94a3b8'}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span
        className="text-[9px] font-extrabold mt-0.5"
        style={{ fontFamily: "'Syne', sans-serif", color: isBiddingActive ? '#6366f1' : '#94a3b8' }}
      >
        {bidCount}
      </span>

      {isBiddingActive && (
        <span
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full animate-ping"
          style={{ background: '#6366f1' }}
        />
      )}
    </div>
  );
};
