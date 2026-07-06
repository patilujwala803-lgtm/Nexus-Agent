import React from 'react';
import { FlowState } from '../types';

interface MiniMapProps {
  activeFlowIds: string[];
  completedFlowIds: string[];
  flows: Map<string, FlowState>;
  onPanTo: (x: number, y: number) => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({
  activeFlowIds,
  completedFlowIds,
  flows,
  onPanTo,
}) => {
  const SCALE = 12; // Canvas coord -> minimap pixel scale

  return (
    <div className="fixed bottom-6 right-20 z-40 w-[120px] h-[80px] bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-xl overflow-hidden backdrop-blur-md pointer-events-auto select-none p-1.5 flex flex-col justify-between">
      {/* Title */}
      <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-wider">
        <span>Canvas Map</span>
        <span className="text-indigo-400 font-mono">{activeFlowIds.length + completedFlowIds.length}</span>
      </div>

      {/* Mini Viewport canvas area */}
      <div
        className="w-full h-[54px] bg-slate-950/80 rounded border border-slate-800 relative cursor-pointer overflow-hidden"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickY = e.clientY - rect.top;
          onPanTo(-clickX * SCALE + 300, -clickY * SCALE + 200);
        }}
      >
        {/* Render Active Flows Dots */}
        {activeFlowIds.map((id, index) => {
          const flow = flows.get(id);
          const dotY = (100 + index * 240) / SCALE;
          const isFailed = flow?.phase === 'failed';
          return (
            <div
              key={`mini-active-${id}`}
              className={`absolute left-4 w-1.5 h-1.5 rounded-full ${
                isFailed ? 'bg-red-500' : 'bg-indigo-500 animate-ping'
              }`}
              style={{ top: `${Math.min(46, Math.max(2, dotY))}px` }}
            />
          );
        })}

        {/* Render Completed Flows Dots */}
        {completedFlowIds.map((id, index) => {
          const flow = flows.get(id);
          const activeHeight = Math.max(1, activeFlowIds.length) * 240;
          const dotY = (100 + activeHeight + 80 + index * 200) / SCALE;
          const isFailed = flow?.status === 'failed';
          return (
            <div
              key={`mini-completed-${id}`}
              className={`absolute left-4 w-1.5 h-1.5 rounded-full ${
                isFailed ? 'bg-red-500 opacity-80' : 'bg-slate-400'
              }`}
              style={{ top: `${Math.min(46, Math.max(2, dotY))}px` }}
            />
          );
        })}

        {/* Viewport Box overlay */}
        <div className="absolute top-1 left-1 w-10 h-6 border border-white/80 bg-white/10 rounded-sm pointer-events-none" />
      </div>
    </div>
  );
};
