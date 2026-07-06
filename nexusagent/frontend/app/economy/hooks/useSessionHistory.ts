import { useState, useCallback, useMemo } from 'react';
import { FlowState } from '../types';

export function useSessionHistory() {
  const [allFlows, setAllFlows] = useState<FlowState[]>([]);

  const addOrUpdateFlow = useCallback((flow: FlowState) => {
    setAllFlows((prev) => {
      const index = prev.findIndex((f) => f.taskId === flow.taskId);
      if (index >= 0) {
        const next = [...prev];
        next[index] = flow;
        return next;
      } else {
        // Newest first
        return [flow, ...prev];
      }
    });
  }, []);

  const getFlow = useCallback(
    (taskId: string) => allFlows.find((f) => f.taskId === taskId),
    [allFlows]
  );

  const completedCount = useMemo(
    () => allFlows.filter((f) => f.status === 'complete').length,
    [allFlows]
  );

  const failedCount = useMemo(
    () => allFlows.filter((f) => f.status === 'failed').length,
    [allFlows]
  );

  const totalUSDCFlowed = useMemo(
    () =>
      allFlows.reduce((sum, f) => {
        if (f.status === 'complete') {
          const acceptedBid = f.bids.find((b) => b.status === 'accepted');
          return sum + (acceptedBid ? acceptedBid.bidAmountUSDC : f.task.budgetUSDC);
        }
        return sum;
      }, 0),
    [allFlows]
  );

  return {
    allFlows,
    addOrUpdateFlow,
    getFlow,
    completedCount,
    failedCount,
    totalUSDCFlowed,
  };
}
