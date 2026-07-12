import React, { useState, useEffect } from 'react';
import { FlowState } from '../types';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  allFlows: FlowState[];
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ isOpen, onClose, allFlows }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'completed' | 'failed'>('all');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [historyTasks, setHistoryTasks] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
      fetch(`${API_URL}/task-records`)
        .then((res) => res.json())
        .then((data) => {
          setHistoryTasks(data || []);
        })
        .catch((err) => console.error("Failed to fetch history:", err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen]);

  // Merge live session flows (allFlows) with historyTasks (from db) to show everything
  const combinedHistory = React.useMemo(() => {
    const map = new Map<string, any>();
    
    // Add history tasks (these are backend Task docs)
    historyTasks.forEach((t) => {
      map.set(t.id, {
        taskId: t.id,
        task: t,
        status: t.status,
        qualityScore: t.qualityScore,
        result: t.result,
        bids: t.bids || [],
        paymentTxHash: t.paymentTxHash,
        workerAgent: { name: t.assignedAgentName || 'Unknown' }
      });
    });

    // Override with any live flows from the current session
    allFlows.forEach((f) => {
      map.set(f.taskId, f);
    });

    return Array.from(map.values()).sort((a, b) => {
      const timeA = a.task.createdAt || 0;
      const timeB = b.task.createdAt || 0;
      return timeB - timeA;
    });
  }, [allFlows, historyTasks]);

  const filteredFlows = combinedHistory.filter((flow) => {
    if (activeTab === 'completed') return flow.status === 'complete';
    if (activeTab === 'failed') return flow.status === 'failed';
    return true;
  });

  const toggleExpand = (taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  };

  return (
    <>
      {/* Transparent Backdrop covering canvas when open */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-transparent cursor-pointer"
          onClick={onClose}
        />
      )}

      {/* Slide-in History Panel from LEFT */}
      <div
        className="fixed left-0 top-0 h-screen bg-white shadow-[8px_0_32px_rgba(0,0,0,0.12)] z-50 transition-transform duration-300 flex flex-col pointer-events-auto border-r border-slate-200 w-[480px]"
        style={{
          transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
          transitionTimingFunction: 'cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        {/* Header */}
        <div className="h-[64px] border-b border-slate-200 px-5 flex items-center justify-between shrink-0 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <span className="text-xl">🕐</span>
            <div>
              <h3 className="font-semibold text-base text-slate-800">Session History</h3>
              <p className="text-xs text-slate-400">
                {combinedHistory.length} {combinedHistory.length === 1 ? 'task' : 'tasks'} recorded
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            ✕
          </button>
        </div>

        {/* Filter Tabs */}
        <div className="flex border-b border-slate-200 px-5 bg-white shrink-0">
          {(['all', 'completed', 'failed'] as const).map((tab) => {
            const label = tab.charAt(0).toUpperCase() + tab.slice(1);
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer capitalize ${
                  isActive
                    ? 'border-indigo-600 text-indigo-600 font-bold'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* History List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              Loading history...
            </div>
          ) : filteredFlows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 space-y-2">
              <span className="text-4xl block">🤖</span>
              <p className="text-xs font-medium">
                No tasks match your filter yet. Start the economy to begin recording history!
              </p>
            </div>
          ) : (
            filteredFlows.map((flow) => {
              const isExpanded = expandedTaskId === flow.taskId;
              const stripeColor =
                flow.tier === 'easy'
                  ? 'bg-emerald-500'
                  : flow.tier === 'complex'
                  ? 'bg-red-500'
                  : 'bg-amber-500';

              const statusBadgeStyle =
                flow.status === 'complete'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  : flow.status === 'failed'
                  ? 'bg-red-100 text-red-700 border-red-200'
                  : flow.status === 'in-progress'
                  ? 'bg-indigo-100 text-indigo-700 border-indigo-200'
                  : 'bg-amber-100 text-amber-800 border-amber-200';

              const acceptedBid = flow.bids.find((b: any) => b.status === 'accepted');
              const finalPrice = acceptedBid ? acceptedBid.bidAmountUSDC : flow.task.budgetUSDC;

              return (
                <div
                  key={flow.taskId}
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  {/* Card Header row */}
                  <div
                    onClick={() => toggleExpand(flow.taskId)}
                    className="p-3.5 flex gap-3 items-start hover:bg-slate-50/80 transition-colors"
                  >
                    {/* Tier stripe */}
                    <div className={`w-1.5 self-stretch rounded-full ${stripeColor} shrink-0`} />

                    <div className="flex-1 min-w-0 space-y-1.5">
                      {/* Title & Status Badge */}
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-xs font-bold text-slate-800 truncate">
                          {flow.task.title.replace(/\[(EASY|MEDIUM|COMPLEX)\]/gi, '').trim()}
                        </h4>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusBadgeStyle}`}
                        >
                          {flow.status}
                        </span>
                      </div>

                      {/* Chips */}
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                          {flow.task.requiredSkill}
                        </span>
                        <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md">
                          {flow.task.budgetUSDC} USDC
                        </span>
                      </div>

                      {/* Details row */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                        <span>
                          Worker: {flow.task.assignedAgentName || flow.workerAgent?.name || 'Unassigned'}
                        </span>
                        {flow.qualityScore !== null && flow.qualityScore !== undefined && (
                          <span
                            className={`font-semibold ${
                              flow.qualityScore >= 74 ? 'text-emerald-600' : 'text-red-500'
                            }`}
                          >
                            Score: {flow.qualityScore}/100
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accordion Expanded Content */}
                  {isExpanded && (
                    <div className="bg-slate-50 p-4 border-t border-slate-200 text-xs space-y-3">
                      {/* Description */}
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                          Description
                        </span>
                        <p className="text-slate-600 text-xs leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                          {flow.task.description}
                        </p>
                      </div>

                      {/* Output result */}
                      {flow.result && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            Result Output
                          </span>
                          <div className="text-slate-700 text-xs bg-white p-2.5 rounded-lg border border-slate-200 max-h-[120px] overflow-y-auto leading-relaxed">
                            {flow.result}
                          </div>
                        </div>
                      )}

                      {/* Bids overview */}
                      {flow.bids.length > 0 && (
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-1">
                            Submitted Bids ({flow.bids.length})
                          </span>
                          <div className="space-y-1">
                            {flow.bids.map((b: any, i: any) => (
                              <div
                                key={b.id || i}
                                className="flex justify-between items-center bg-white px-2.5 py-1.5 rounded border border-slate-200 text-[11px]"
                              >
                                <span className="font-medium text-slate-700">{b.agentName}</span>
                                <span className="font-bold text-indigo-600">{b.bidAmountUSDC} USDC</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Transaction info */}
                      {flow.paymentTxHash && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          TxHash: {flow.paymentTxHash}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};
