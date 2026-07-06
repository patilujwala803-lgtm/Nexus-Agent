import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { FlowState, EconomyStats, TravelingCircle, ToastItem, Task, Bid, Agent } from '../types';
import type { EducatingAgent } from '../components/EducationCard';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

// Bug Fix 4: cap completed flows
const MAX_COMPLETED_FLOWS = 20;

export interface EconomyAnnouncement {
  id: string;
  type: 'guild_formed' | 'loan_issued' | 'loan_repaid' | 'court_appeal' | 'education_purchased' | 'subcontract_hired';
  payload: any;
}

export function useEconomySocket(onSessionUpdate?: (flow: FlowState) => void) {
  const [flows, setFlows] = useState<Map<string, FlowState>>(new Map());
  const [activeFlowIds, setActiveFlowIds] = useState<string[]>([]);
  const [completedFlowIds, setCompletedFlowIds] = useState<string[]>([]);
  const [stats, setStats] = useState<EconomyStats>({
    totalAgents: 49,
    idleAgents: 49,
    busyAgents: 0,
    totalTasksSpawned: 0,
    completedTasks: 0,
    failedTasks: 0,
    activeTasks: 0,
    totalUSDCFlowed: 0,
    topEarner: null,
    isRunning: false,
    uptimeSeconds: 0,
    totalLoansDisbursed: 0,
    totalGuildCapital: 100.0,
  });
  const [isEconomyRunning, setIsEconomyRunning] = useState<boolean>(false);
  const [travelingCircles, setTravelingCircles] = useState<TravelingCircle[]>([]);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [announcements, setAnnouncements] = useState<EconomyAnnouncement[]>([]);
  const [educatingAgents, setEducatingAgents] = useState<EducatingAgent[]>([]);

  const addToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const addAnnouncement = useCallback((type: EconomyAnnouncement['type'], payload: any) => {
    const id = `ann-${Date.now()}-${Math.random()}`;
    setAnnouncements(prev => [...prev.slice(-5), { id, type, payload }]);
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(a => a.id !== id));
    }, 4500);
  }, []);

  const spawnCircle = useCallback(
    (color: string, fromX: number, fromY: number, toX: number, toY: number, duration = 1000) => {
      const id = `circle-${Date.now()}-${Math.random()}`;
      const circle: TravelingCircle = { id, color, fromX, fromY, toX, toY, startTime: Date.now(), duration };
      setTravelingCircles((prev) => [...prev, circle]);
      setTimeout(() => {
        setTravelingCircles((prev) => prev.filter((c) => c.id !== id));
      }, duration + 100);
    },
    []
  );

  const updateFlowInState = useCallback((taskId: string, updater: (prev: FlowState) => FlowState) => {
    setFlows((prevMap) => {
      const nextMap = new Map(prevMap);
      const existing = nextMap.get(taskId);
      if (existing) nextMap.set(taskId, updater(existing));
      return nextMap;
    });
  }, []);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    // Bug Fix 2: Restore running state on reconnect
    socket.on('economy:full_state', (data: { stats: EconomyStats | null; isRunning: boolean }) => {
      if (data.stats) {
        setStats(data.stats);
        setIsEconomyRunning(data.isRunning);
      }
    });

    socket.on('economy:started', () => {
      setIsEconomyRunning(true);
      addToast('🚀 Autonomous AI Economy engine started!', 'success');
    });

    socket.on('economy:stopped', () => {
      setIsEconomyRunning(false);
      addToast('⏹ Autonomous AI Economy engine paused.', 'info');
    });

    socket.on('economy:stats_update', (newStats: EconomyStats) => {
      setStats(newStats);
      setIsEconomyRunning(newStats.isRunning);
    });

    socket.on('economy:task_spawned', (data: { task: Task; tier?: 'easy' | 'medium' | 'complex' }) => {
      const { task, tier = 'medium' } = data;
      setFlows((prevMap) => {
        const nextMap = new Map(prevMap);
        const existing = nextMap.get(task.id);
        const initialFlow: FlowState = {
          taskId: task.id,
          task,
          status: task.status || 'open',
          bids: task.bids || [],
          winnerAgentId: null,
          workerAgent: null,
          result: null,
          qualityScore: null,
          paymentTxHash: null,
          phase: 'spawned',
          createdAt: task.createdAt || Date.now(),
          tier: tier || 'medium',
          taskVariant: task.taskVariant || 'normal',
          guildName: task.guildName || null,
          isAppeal: task.isAppeal || false,
          subcontractedTo: task.subcontractedTo || null,
          loanTriggered: task.loanTriggered || false,
          educationTriggered: task.educationTriggered || false,
          ...existing,
        };
        nextMap.set(task.id, initialFlow);
        return nextMap;
      });
      setActiveFlowIds((prev) => (prev.includes(task.id) ? prev : [...prev, task.id]));
      addToast(`📋 Task Spawned: ${task.title.slice(0, 32)}...`, 'info');
    });

    socket.on('economy:hiring_agent_assigned', (data: { taskId: string; agentName: string }) => {
      updateFlowInState(data.taskId, (prev) => ({ ...prev, hiringAgentName: data.agentName }));
    });

    socket.on('economy:bidding_started', (data: { taskId: string; eligibleAgentCount: number }) => {
      updateFlowInState(data.taskId, (prev) => ({
        ...prev,
        phase: 'bidding',
        biddingActive: true,
        status: 'bidding',
      }));
    });

    socket.on('economy:bid_placed', (data: { taskId: string; bid: Bid; agentName: string; agentInstanceId: string }) => {
      const { taskId, bid } = data;
      setFlows((prevMap) => {
        const nextMap = new Map(prevMap);
        const flow = nextMap.get(taskId);
        if (flow) {
          const exists = flow.bids.some((b) => b.id === bid.id || b.agentId === bid.agentId);
          const newBids = exists ? flow.bids.map((b) => (b.id === bid.id ? bid : b)) : [...flow.bids, bid];
          nextMap.set(taskId, { ...flow, bids: newBids });
        }
        return nextMap;
      });
      setFlows((currMap) => {
        const flowList = Array.from(currMap.keys());
        const flowIndex = flowList.indexOf(taskId);
        const flowY = 100 + (flowIndex >= 0 ? flowIndex : 0) * 240;
        spawnCircle('#fbbf24', 263, flowY + 36, 348, flowY + 50, 1000);
        return currMap;
      });
    });

    socket.on('economy:bids_rejected', (data: { taskId: string; rejectedAgentIds: string[] }) => {
      updateFlowInState(data.taskId, (prev) => ({
        ...prev,
        bids: prev.bids.map((b) =>
          data.rejectedAgentIds.includes(b.agentInstanceId || b.agentId) ? { ...b, status: 'rejected' } : b
        ),
      }));
    });

    socket.on('economy:agent_hired', (data: { taskId: string; agentId: string; agentName: string; finalPrice: number }) => {
      updateFlowInState(data.taskId, (prev) => ({
        ...prev,
        phase: 'hired',
        biddingActive: false,
        winnerAgentId: data.agentId,
        workerAgent: prev.workerAgent || ({ name: data.agentName, instanceId: data.agentId } as Agent),
        bids: prev.bids.map((b) =>
          b.agentInstanceId === data.agentId || b.agentId === data.agentId
            ? { ...b, status: 'accepted' }
            : { ...b, status: 'rejected' }
        ),
      }));
      addToast(`🤝 Hired ${data.agentName} for $${data.finalPrice} USDC`, 'info');
    });

    socket.on('economy:escrow_locked', (data: { taskId: string; amount: number }) => {
      updateFlowInState(data.taskId, (prev) => ({ ...prev, escrowLocked: true }));
    });

    socket.on('economy:work_started', (data: { taskId: string; agentName: string }) => {
      updateFlowInState(data.taskId, (prev) => ({ ...prev, phase: 'working', status: 'in-progress' }));
    });

    socket.on('economy:work_completed', (data: { taskId: string; agentId: string; result: string }) => {
      updateFlowInState(data.taskId, (prev) => ({ ...prev, phase: 'verifying', result: data.result }));
      setFlows((currMap) => {
        const flowList = Array.from(currMap.keys());
        const flowIndex = flowList.indexOf(data.taskId);
        const flowY = 100 + (flowIndex >= 0 ? flowIndex : 0) * 240;
        spawnCircle('#6366f1', 580, flowY + 50, 744, flowY + 50, 1200);
        return currMap;
      });
    });

    socket.on('economy:verification_started', (data: { taskId: string }) => {
      updateFlowInState(data.taskId, (prev) => ({ ...prev, juryEvaluating: true }));
    });

    socket.on('economy:task_complete', (data: {
      taskId: string; agentName: string; earned: number; qualityScore: number;
      txHash: string; result?: string; taskVariant?: any; guildName?: string;
      isAppeal?: boolean; subcontractedTo?: string;
    }) => {
      const { taskId, agentName, earned, qualityScore, txHash, result } = data;
      setFlows((prevMap) => {
        const nextMap = new Map(prevMap);
        const flow = nextMap.get(taskId);
        if (flow) {
          const updated: FlowState = {
            ...flow,
            phase: 'complete',
            status: 'complete',
            qualityScore,
            paymentTxHash: txHash,
            result: result || flow.result,
            taskVariant: data.taskVariant || flow.taskVariant,
            guildName: data.guildName || flow.guildName,
            isAppeal: data.isAppeal || flow.isAppeal,
            subcontractedTo: data.subcontractedTo || flow.subcontractedTo,
          };
          nextMap.set(taskId, updated);
          if (onSessionUpdate) onSessionUpdate(updated);
        }
        return nextMap;
      });
      setFlows((currMap) => {
        const flowList = Array.from(currMap.keys());
        const flowIndex = flowList.indexOf(taskId);
        const flowY = 100 + (flowIndex >= 0 ? flowIndex : 0) * 240;
        spawnCircle('#22c55e', 884, flowY + 50, 580, flowY + 50, 1400);
        return currMap;
      });
      addToast(`✅ ${agentName} earned $${earned} USDC (Score: ${qualityScore}/100)`, 'success');
      setTimeout(() => {
        setActiveFlowIds((prev) => prev.filter((id) => id !== taskId));
        // Bug Fix 4: cap completed flows
        setCompletedFlowIds((prev) => {
          const next = prev.includes(taskId) ? prev : [taskId, ...prev];
          return next.slice(0, MAX_COMPLETED_FLOWS);
        });
      }, 3000);
    });

    socket.on('economy:task_failed', (data: { taskId: string; qualityScore?: number; reason?: string }) => {
      const { taskId, qualityScore } = data;
      setFlows((prevMap) => {
        const nextMap = new Map(prevMap);
        const flow = nextMap.get(taskId);
        if (flow) {
          const updated: FlowState = { ...flow, phase: 'failed', status: 'failed', qualityScore: qualityScore ?? flow.qualityScore };
          nextMap.set(taskId, updated);
          if (onSessionUpdate) onSessionUpdate(updated);
        }
        return nextMap;
      });
      addToast(`❌ Task Failed (${data.reason || 'Quality threshold unmet'})`, 'error');
      setTimeout(() => {
        setActiveFlowIds((prev) => prev.filter((id) => id !== taskId));
        setCompletedFlowIds((prev) => {
          const next = prev.includes(taskId) ? prev : [taskId, ...prev];
          return next.slice(0, MAX_COMPLETED_FLOWS);
        });
      }, 3000);
    });

    // ── Section 6 & 8: New Interactive Events ────────────────────────────────
    socket.on('economy:guild_formed', (data: any) => {
      addToast(`🏛️ ${data.guildName} formed! ${data.members?.length || 2} agents collaborating.`, 'success');
      addAnnouncement('guild_formed', data);
    });

    socket.on('economy:loan_issued', (data: any) => {
      addToast(`🏦 Loan of $${data.amount} USDC issued to ${data.agentName}`, 'info');
      addAnnouncement('loan_issued', data);
    });

    socket.on('economy:loan_repaid', (data: any) => {
      addToast(`💚 ${data.agentName} repaid $${data.amount} USDC`, 'success');
      addAnnouncement('loan_repaid', data);
    });

    socket.on('economy:court_appeal', (data: any) => {
      if (data.round === 'filing') {
        addToast(`⚖️ ${data.agentName} filed Supreme Court appeal!`, 'info');
      } else {
        // Store AI judgment in the flow state
        updateFlowInState(data.taskId, (prev) => ({
          ...prev,
          courtOpinion: data.courtOpinion || null,
          courtVerdict: data.result as 'overturned' | 'upheld' | null,
          justiceVotes: data.justiceVotes || [],
        }));
        addToast(
          data.result === 'overturned'
            ? `⚖️ OVERTURNED! Supreme Court reversed the verdict on "${data.taskTitle?.slice(0,30)}"`
            : `⚖️ UPHELD! Supreme Court sustained the verdict on "${data.taskTitle?.slice(0,30)}"`,
          data.result === 'overturned' ? 'success' : 'error'
        );
      }
      addAnnouncement('court_appeal', data);
    });

    // Capture jury votes in flow state
    socket.on('economy:jury_voted', (data: { taskId: string; votes: Array<{ jurorId: string; jurorName: string; approve: boolean }> }) => {
      updateFlowInState(data.taskId, (prev) => ({
        ...prev,
        juryVotes: data.votes,
      }));
    });

    socket.on('economy:education_purchased', (data: any) => {
      addToast(`🎓 ${data.agentName} learned "${data.skill}" for $${data.cost} USDC`, 'success');
      addAnnouncement('education_purchased', data);
    });

    socket.on('economy:subcontract_hired', (data: any) => {
      addToast(`🔗 ${data.primaryAgentName} subcontracted ${data.subAgentName}`, 'info');
      addAnnouncement('subcontract_hired', data);
    });

    // Education started — add to educating agents list
    socket.on('economy:education_started', (data: {
      agentId: string; agentName: string; skill: string;
      repGain: number; durationMs: number; cost: number; startedAt: number;
    }) => {
      setEducatingAgents(prev => {
        if (prev.find(a => a.agentId === data.agentId)) return prev;
        return [...prev, data];
      });
      addToast(`🎓 ${data.agentName} started studying "${data.skill.replace(/-/g,' ')}" (+${data.repGain} rep)`, 'info');
    });

    // Education complete — remove from educating agents list
    socket.on('economy:education_complete', (data: { agentId: string; agentName: string; skill: string; repGain: number; newReputation: number }) => {
      setEducatingAgents(prev => prev.filter(a => a.agentId !== data.agentId));
      addToast(`✨ ${data.agentName} mastered "${data.skill.replace(/-/g,' ')}"! Rep now ${data.newReputation}`, 'success');
    });

    return () => {
      socket.disconnect();
    };
  }, [addToast, addAnnouncement, onSessionUpdate, spawnCircle, updateFlowInState]);

  return {
    flows,
    activeFlowIds,
    completedFlowIds,
    stats,
    isEconomyRunning,
    travelingCircles,
    toasts,
    isConnected,
    addToast,
    announcements,
    educatingAgents,
  };
}
