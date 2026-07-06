import React from 'react';
import { FlowState } from '../types';
import { SidebarWrapper } from './SidebarWrapper';

interface TaskSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  flow: FlowState | null;
}

export const TaskSidebar: React.FC<TaskSidebarProps> = ({ isOpen, onClose, flow }) => {
  if (!flow) return null;

  const { task, tier, status, phase, qualityScore, paymentTxHash } = flow;

  const tierBadgeStyle =
    tier === 'easy'
      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
      : tier === 'complex'
      ? 'bg-red-100 text-red-800 border-red-200'
      : 'bg-amber-100 text-amber-800 border-amber-200';

  // Timeline steps
  const steps = [
    { name: 'Task Spawned', color: 'bg-indigo-500', active: true, time: flow.createdAt },
    { name: 'Bidding Started', color: 'bg-amber-500', active: flow.bids.length > 0 },
    { name: 'Agent Hired', color: 'bg-blue-500', active: !!flow.workerAgent || !!task.assignedAgentName },
    { name: 'Work In Progress', color: 'bg-purple-500', active: phase === 'working' || phase === 'verifying' || phase === 'complete' },
    { name: 'Verification', color: 'bg-orange-500', active: phase === 'verifying' || phase === 'complete' },
    { name: 'Complete / Failed', color: status === 'complete' ? 'bg-emerald-500' : status === 'failed' ? 'bg-red-500' : 'bg-slate-300', active: status === 'complete' || status === 'failed', time: flow.completedAt },
  ];

  return (
    <SidebarWrapper
      isOpen={isOpen}
      onClose={onClose}
      title="Task Details"
      subtitle={`ID: ${task.id.slice(0, 8)}...`}
      titleIcon="📋"
    >
      {/* SECTION 1 — Task Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-2 leading-snug">
          {task.title.replace(/\[(EASY|MEDIUM|COMPLEX)\]/gi, '').trim()}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <span className="bg-indigo-600 text-white font-bold text-xs px-2.5 py-1 rounded-full shadow-xs">
            Budget: {task.budgetUSDC} USDC
          </span>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${tierBadgeStyle} uppercase`}>
            {tier}
          </span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md font-medium">
            Skill: {task.requiredSkill}
          </span>
        </div>
      </div>

      <div className="border-t border-slate-100 my-4" />

      {/* SECTION 2 — Status Timeline */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Status Timeline
        </h4>
        <div className="space-y-3 relative pl-4 border-l-2 border-slate-100 ml-1">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex items-center justify-between">
              <div
                className={`absolute -left-[21px] w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                  step.active ? `${step.color} animate-pulse` : 'bg-slate-200'
                }`}
              />
              <span
                className={`text-xs font-medium ${
                  step.active ? 'text-slate-800 font-semibold' : 'text-slate-400'
                }`}
              >
                {step.name}
              </span>
              {step.time && (
                <span className="text-[10px] text-slate-400 font-mono">
                  {new Date(step.time).toLocaleTimeString()}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-100 my-4" />

      {/* SECTION 3 — Task Details */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
          Key Metadata
        </h4>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Posted By</span>
            <span className="font-semibold text-slate-700">{task.postedBy || 'System'}</span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Assigned To</span>
            <span className="font-semibold text-slate-700">
              {task.assignedAgentName || (flow.workerAgent ? flow.workerAgent.name : 'Pending')}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Quality Score</span>
            <span className="font-semibold text-slate-700">
              {qualityScore !== null && qualityScore !== undefined ? `${qualityScore}/100` : 'Pending'}
            </span>
          </div>
          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
            <span className="text-slate-400 block text-[10px]">Payment Tx</span>
            {paymentTxHash ? (
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="font-mono text-indigo-600 font-semibold truncate block hover:underline"
                title={paymentTxHash}
              >
                {paymentTxHash.slice(0, 12)}...
              </a>
            ) : (
              <span className="text-slate-400 font-normal">Pending</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-t border-slate-100 my-4" />

      {/* SECTION 4 — Task Description */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Description
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
          {task.description}
        </p>
      </div>

      {/* SECTION 5 — Result */}
      {flow.result && (
        <>
          <div className="border-t border-slate-100 my-4" />
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Work Output
              </h4>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-700 max-h-[200px] overflow-y-auto leading-relaxed font-sans">
              {flow.result}
            </div>
          </div>
        </>
      )}
    </SidebarWrapper>
  );
};
