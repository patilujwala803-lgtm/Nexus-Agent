import React from 'react';

interface PaymentNodeProps {
  isPaid?: boolean;
  amount?: number | null;
  txHash?: string | null;
}

export const PaymentNode: React.FC<PaymentNodeProps> = React.memo(
  ({ isPaid = false, amount = null, txHash }) => {
    return (
      <div className="relative flex flex-col items-center">
        <div
          className="w-[48px] h-[48px] rounded-full flex items-center justify-center transition-all duration-500"
          style={{
            background: isPaid ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `2px solid ${isPaid ? '#10b981' : 'rgba(148,163,184,0.5)'}`,
            boxShadow: isPaid
              ? '0 0 0 4px rgba(16,185,129,0.15), 0 4px 16px rgba(16,185,129,0.2)'
              : '0 2px 8px rgba(0,0,0,0.06)',
            animation: isPaid ? 'greenPulse 1.5s ease-in-out infinite' : 'none',
            transform: isPaid ? 'scale(1.1)' : 'scale(1)',
          }}
        >
          {/* Coin / Payment SVG */}
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="9"
              stroke={isPaid ? '#10b981' : '#94a3b8'}
              strokeWidth="1.8"
            />
            <path
              d="M12 7v10M9 9.5C9 8.1 10.3 7 12 7s3 1.1 3 2.5c0 2.6-6 2.6-6 5C9 16 10.3 17 12 17s3-1 3-2.5"
              stroke={isPaid ? '#10b981' : '#94a3b8'}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        </div>
        <span
          className="text-[10px] font-bold mt-1 whitespace-nowrap"
          style={{
            fontFamily: "'Syne', sans-serif",
            color: isPaid ? '#10b981' : 'rgba(30,27,75,0.35)',
          }}
        >
          {isPaid && amount !== null && amount !== undefined ? `$${amount}` : 'Escrow'}
        </span>
        {isPaid && txHash && (
          <span
            className="text-[8px] font-mono truncate max-w-[64px]"
            style={{ color: 'rgba(16,185,129,0.6)' }}
            title={txHash}
          >
            {txHash.slice(0, 8)}...
          </span>
        )}
      </div>
    );
  }
);

PaymentNode.displayName = 'PaymentNode';
