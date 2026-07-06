import React from 'react';
import { ToastItem } from '../types';

interface ToastProps {
  toasts: ToastItem[];
}

const TOAST_CONFIG = {
  success: { bg: 'rgba(16,185,129,0.9)', border: 'rgba(16,185,129,0.5)', icon: '✓' },
  error:   { bg: 'rgba(239,68,68,0.9)',  border: 'rgba(239,68,68,0.5)',  icon: '✕' },
  info:    { bg: 'rgba(99,102,241,0.9)', border: 'rgba(99,102,241,0.5)', icon: 'ℹ' },
};

export const Toast: React.FC<ToastProps> = React.memo(({ toasts }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const cfg = TOAST_CONFIG[toast.type] || TOAST_CONFIG.info;
        return (
          <div
            key={toast.id}
            className="px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 animate-slideInUp text-white"
            style={{
              background: cfg.bg,
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: `1px solid ${cfg.border}`,
              boxShadow: `0 4px 16px ${cfg.border}`,
            }}
          >
            <span className="font-bold text-sm leading-none">{cfg.icon}</span>
            <span>{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
});

Toast.displayName = 'Toast';
