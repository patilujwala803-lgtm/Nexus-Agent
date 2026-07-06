import React from 'react';

interface SidebarWrapperProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  titleIcon?: string;
  accentColor?: string;
  children: React.ReactNode;
  width?: number;
}

export const SidebarWrapper: React.FC<SidebarWrapperProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  titleIcon = '📋',
  accentColor = '#6366f1',
  children,
  width = 440,
}) => {
  return (
    <>
      {/* Transparent Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent cursor-pointer"
          onClick={onClose}
        />
      )}

      {/* Slide-in Sidebar Panel */}
      <div
        className="fixed right-0 top-0 h-screen z-50 flex flex-col pointer-events-auto"
        style={{
          width: `${width}px`,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderLeft: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '-8px 0 48px rgba(99,102,241,0.12), -1px 0 0 rgba(99,102,241,0.05)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.32s cubic-bezier(0.22,1,0.36,1)',
        }}
      >
        {/* Gradient Header Border */}
        <div
          className="h-[3px] shrink-0"
          style={{ background: `linear-gradient(90deg, ${accentColor}, ${accentColor}66)` }}
        />

        {/* Header */}
        <div
          className="h-[60px] px-5 flex items-center justify-between shrink-0"
          style={{ borderBottom: '1px solid rgba(99,102,241,0.08)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xl shrink-0">{titleIcon}</span>
            <div className="min-w-0">
              <h3
                className="font-bold text-base truncate"
                style={{ fontFamily: "'Syne', sans-serif", color: '#1e1b4b' }}
              >
                {title}
              </h3>
              {subtitle && (
                <p className="text-[11px] truncate font-mono" style={{ color: 'rgba(30,27,75,0.35)' }}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-sm transition-all cursor-pointer hover:scale-105"
            style={{
              background: 'rgba(99,102,241,0.08)',
              color: '#6366f1',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4" style={{ color: '#1e1b4b', fontSize: 13 }}>
          {children}
        </div>
      </div>
    </>
  );
};
