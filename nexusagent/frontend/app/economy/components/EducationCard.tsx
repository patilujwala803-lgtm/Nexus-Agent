'use client';
import React, { useEffect, useRef, useState } from 'react';

export interface EducatingAgent {
  agentId: string;
  agentName: string;
  skill: string;
  repGain: number;
  durationMs: number;
  cost: number;
  startedAt: number;
}

interface EducationCardProps {
  student: EducatingAgent;
  cardX: number;
  cardY: number;
}

const EDUCATOR_OFFSET_X = -180;

export function EducationCard({ student, cardX, cardY }: EducationCardProps) {
  const [progress, setProgress] = useState(0);
  const [dots, setDots] = useState<{ id: string; t: number }[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const dotIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Progress bar
  useEffect(() => {
    const tick = () => {
      const elapsed = Date.now() - student.startedAt;
      setProgress(Math.min(100, (elapsed / student.durationMs) * 100));
    };
    tick();
    intervalRef.current = setInterval(tick, 500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [student.startedAt, student.durationMs]);

  // Spawn traveling orange dots from educator to agent
  useEffect(() => {
    dotIntervalRef.current = setInterval(() => {
      const id = `dot-${Date.now()}-${Math.random()}`;
      setDots(prev => [...prev, { id, t: 0 }]);
      setTimeout(() => setDots(prev => prev.filter(d => d.id !== id)), 1600);
    }, 600);
    return () => { if (dotIntervalRef.current) clearInterval(dotIntervalRef.current); };
  }, []);

  const isNearDone = progress >= 75;
  const timeLeft = Math.max(0, Math.ceil((student.durationMs - (Date.now() - student.startedAt)) / 1000));

  const educatorX = cardX + EDUCATOR_OFFSET_X;
  const educatorY = cardY;
  const studentX = cardX;
  const studentY = cardY;

  return (
    <>
      {/* ── Connector line educator→student ── */}
      <svg
        className="absolute pointer-events-none"
        style={{ left: 0, top: 0, width: '100%', height: '100%', overflow: 'visible', zIndex: 1 }}
      >
        <line
          x1={educatorX + 140}
          y1={educatorY + 36}
          x2={studentX}
          y2={studentY + 36}
          stroke="rgba(251,146,60,0.4)"
          strokeWidth={2}
          strokeDasharray="6 4"
        />
        {/* Traveling dots along the line */}
        {dots.map((dot, i) => (
          <circle key={dot.id} r={5} fill="#f97316" opacity={0.85}>
            <animateMotion
              dur="1.5s"
              repeatCount="1"
              fill="freeze"
              path={`M ${educatorX + 140} ${educatorY + 36} L ${studentX} ${studentY + 36}`}
            />
            <animate attributeName="opacity" values="0;0.9;0.9;0" dur="1.5s" repeatCount="1" fill="freeze" />
            <animate attributeName="r" values="3;6;3" dur="1.5s" repeatCount="1" fill="freeze" />
          </circle>
        ))}
      </svg>

      {/* ── Educator Card ── */}
      <div
        className="absolute pointer-events-auto"
        style={{ left: educatorX, top: educatorY, width: 140, zIndex: 2 }}
      >
        <div
          className="rounded-2xl p-3"
          style={{
            background: 'linear-gradient(135deg,rgba(251,146,60,0.12),rgba(234,88,12,0.08))',
            border: '1px solid rgba(251,146,60,0.35)',
            boxShadow: '0 2px 16px rgba(251,146,60,0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-base"
              style={{ background: 'rgba(251,146,60,0.15)' }}
            >
              🎓
            </div>
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: '#ea580c' }}>Educator</p>
              <p className="text-[9px]" style={{ color: 'rgba(30,27,75,0.45)' }}>NexusEdu AI</p>
            </div>
          </div>
          <div
            className="rounded-lg px-2 py-1 text-center text-[9px] font-bold"
            style={{ background: 'rgba(251,146,60,0.1)', color: '#ea580c', border: '1px solid rgba(251,146,60,0.2)' }}
          >
            Teaching: {student.skill.replace(/-/g, ' ')}
          </div>
        </div>
      </div>

      {/* ── Student Agent Card ── */}
      <div
        className="absolute pointer-events-auto"
        style={{ left: studentX, top: studentY, width: 160, zIndex: 2 }}
      >
        {/* Pulsing orange glow behind card */}
        <div
          className="absolute inset-0 rounded-2xl"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(251,146,60,0.3) 0%, transparent 70%)',
            animation: 'educationGlow 2s ease-in-out infinite',
          }}
        />
        <style>{`
          @keyframes educationGlow {
            0%, 100% { opacity: 0.2; transform: scale(0.95); }
            50% { opacity: 1; transform: scale(1.06); }
          }
        `}</style>

        <div
          className="relative rounded-2xl p-3"
          style={{
            background: 'rgba(255,255,255,0.88)',
            backdropFilter: 'blur(12px)',
            border: `1.5px solid ${isNearDone ? 'rgba(16,185,129,0.5)' : 'rgba(251,146,60,0.4)'}`,
            boxShadow: `0 4px 20px ${isNearDone ? 'rgba(16,185,129,0.2)' : 'rgba(251,146,60,0.2)'}`,
            transition: 'border-color 0.5s, box-shadow 0.5s',
          }}
        >
          {/* Status badge */}
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: isNearDone ? 'rgba(16,185,129,0.1)' : 'rgba(251,146,60,0.12)',
                color: isNearDone ? '#10b981' : '#ea580c',
                border: `1px solid ${isNearDone ? 'rgba(16,185,129,0.25)' : 'rgba(251,146,60,0.25)'}`,
              }}
            >
              {isNearDone ? '✨ Almost Done' : '📖 Studying'}
            </span>
            <span className="text-[10px] font-bold" style={{ color: '#6366f1' }}>+{student.repGain} rep</span>
          </div>

          {/* Agent name */}
          <p className="text-[11px] font-extrabold truncate mb-0.5" style={{ color: '#1e1b4b' }}>{student.agentName}</p>
          <p className="text-[9px] truncate mb-2.5" style={{ color: 'rgba(30,27,75,0.4)' }}>
            Learning: <span style={{ color: '#ea580c', fontWeight: 700 }}>{student.skill.replace(/-/g, ' ')}</span>
          </p>

          {/* Progress bar */}
          <div className="mb-1.5">
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(251,146,60,0.1)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progress}%`,
                  background: isNearDone
                    ? 'linear-gradient(90deg,#f97316,#10b981)'
                    : 'linear-gradient(90deg,#f97316,#fbbf24)',
                }}
              />
            </div>
          </div>

          <div className="flex justify-between text-[9px]" style={{ color: 'rgba(30,27,75,0.4)' }}>
            <span>{progress.toFixed(0)}% complete</span>
            <span>⏱ {timeLeft}s left</span>
          </div>

          <div className="mt-2 text-center text-[9px] font-semibold" style={{ color: 'rgba(30,27,75,0.35)' }}>
            Cost: ${student.cost} USDC
          </div>
        </div>
      </div>
    </>
  );
}
