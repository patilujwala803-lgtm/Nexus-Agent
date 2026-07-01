'use client';

/**
 * Leaderboard.tsx
 * ──────────────────────────────────────────────────────────────────────────────
 * Live pipeline reputation leaderboard.
 * Fetches from GET /agent/leaderboard and updates when reputation_updated
 * or leaderboard_updated Socket.io events arrive.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { useCallback, useEffect, useState } from 'react';
import { socket } from '@/lib/socket';
import { api } from '@/lib/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeaderboardEntry {
  pipelineId:  string;
  wins:        number;
  losses:      number;
  winRate:     number;
  avgScore:    number;
  totalEarned: number;
  runs:        number;
}

// ── Config ────────────────────────────────────────────────────────────────────

const PIPELINE_STYLES: Record<string, { emoji: string; color: string; bg: string; ring: string }> = {
  alpha: { emoji: '⚡', color: 'text-blue-600', bg: 'bg-blue-50', ring: 'ring-blue-200' },
  beta:  { emoji: '🔮', color: 'text-violet-600', bg: 'bg-violet-50', ring: 'ring-violet-200' },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function Leaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch from API
  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await api.get<{ leaderboard: LeaderboardEntry[] }>('/agent/leaderboard');
      setEntries(res.data.leaderboard);
    } catch {
      // Backend may not be running yet — silently ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  // Only re-fetch when a bounty actually completes — NOT on leaderboard_updated,
  // because that would create a loop: fetch → GET /agent/leaderboard (silent) → done.
  // The leaderboard_updated socket event is only emitted by masterAgent post-bounty,
  // but to be safe we only trigger on bounty_completed.
  const handleActivity = useCallback(
    (payload: { event: string; data: { leaderboard?: LeaderboardEntry[] } }) => {
      if (payload.event === 'bounty_completed' || payload.event === 'leaderboard_updated') {
        // Use the leaderboard data sent with the event if available (no extra HTTP call needed)
        if (payload.data.leaderboard && Array.isArray(payload.data.leaderboard)) {
          setEntries(payload.data.leaderboard as LeaderboardEntry[]);
          setLoading(false);
        } else {
          setTimeout(fetchLeaderboard, 400);
        }
      }
    },
    [fetchLeaderboard]
  );

  useEffect(() => {
    if (!socket) return;
    socket.on('agentActivity', handleActivity);
    return () => { socket.off('agentActivity', handleActivity); };
  }, [handleActivity]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base">⭐</span>
          <h2 className="text-slate-800 font-semibold text-sm uppercase tracking-widest">
            Leaderboard
          </h2>
        </div>
        <span className="text-slate-400 text-xs">{entries.length} pipelines</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 text-slate-400">
          <span className="text-2xl mb-1">🏁</span>
          <p className="text-xs">No runs yet — complete a bounty to see rankings</p>
        </div>
      ) : (
        <div className="space-y-2">
          {entries.map((entry, i) => {
            const style = PIPELINE_STYLES[entry.pipelineId] ?? PIPELINE_STYLES['alpha'];
            const winPct = (entry.winRate * 100).toFixed(0);

            return (
              <div
                key={entry.pipelineId}
                className={`
                  flex items-center gap-3 rounded-xl p-3
                  ${style.bg} ring-1 ${style.ring}
                  transition-all duration-200
                `}
              >
                {/* Rank */}
                <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm shrink-0">
                  {i + 1}
                </div>

                {/* Pipeline identity */}
                <div className="flex items-center gap-1.5 shrink-0 w-20">
                  <span>{style.emoji}</span>
                  <span className={`font-bold text-sm ${style.color}`}>
                    {entry.pipelineId.toUpperCase()}
                  </span>
                </div>

                {/* Stats */}
                <div className="flex-1 grid grid-cols-3 gap-1 text-xs text-center">
                  <div>
                    <p className="text-slate-500">W/L</p>
                    <p className="font-semibold text-slate-700">{entry.wins}–{entry.losses}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Win%</p>
                    <p className={`font-semibold ${entry.winRate >= 0.5 ? 'text-emerald-600' : 'text-red-500'}`}>
                      {winPct}%
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Avg</p>
                    <p className="font-semibold text-slate-700">{entry.avgScore}/10</p>
                  </div>
                </div>

                {/* Earnings */}
                <div className="shrink-0 text-right">
                  <p className="text-slate-400 text-[10px]">Earned</p>
                  <p className="text-emerald-600 font-mono font-bold text-xs">
                    ${entry.totalEarned.toFixed(3)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
