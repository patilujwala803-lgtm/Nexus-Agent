'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Agent, FlowState } from './types';
import { useCanvasControls } from './hooks/useCanvasControls';
import { useSessionHistory } from './hooks/useSessionHistory';
import { useTypewriter } from './hooks/useTypewriter';
import { useEconomySocket } from './hooks/useEconomySocket';

import { FlowDiagram } from './components/FlowDiagram';
import { TravelingCircles } from './components/TravelingCircles';
import { StatsBar } from './components/StatsBar';
import { Toast } from './components/Toast';
import { TaskSidebar } from './components/TaskSidebar';
import { BidSidebar } from './components/BidSidebar';
import { WorkSidebar } from './components/WorkSidebar';
import { AgentSidebar } from './components/AgentSidebar';
import { HistoryPanel } from './components/HistoryPanel';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { AnalyticsSidebar } from './components/AnalyticsSidebar';
import { BankSidebar } from './components/BankSidebar';
import { EducationCard } from './components/EducationCard';
import SupremeCourt from './components/SupremeCourt';


const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export default function EconomyCanvasPage() {
  // Canvas Controls Hook
  const {
    containerRef,
    canvasRef,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetView,
    panTo,
    handleMouseDown,
  } = useCanvasControls();

  // Session History Hook
  const {
    allFlows,
    addOrUpdateFlow,
    completedCount,
    totalUSDCFlowed,
  } = useSessionHistory();

  // Socket & Real-time State Hook
  const {
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
  } = useEconomySocket(addOrUpdateFlow);

  // Agent registry cache for AgentSidebar
  const [agentsMap, setAgentsMap] = useState<Map<string, Agent>>(new Map());
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Sidebar UI State
  const [selectedSidebar, setSelectedSidebar] = useState<{
    type: 'task' | 'bid' | 'work';
    taskId: string;
  } | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isAnalyticsOpen, setIsAnalyticsOpen] = useState<boolean>(false);
  const [isBankOpen, setIsBankOpen] = useState<boolean>(false);
  const [isCourtOpen, setIsCourtOpen] = useState<boolean>(false);
  const [isTogglingEconomy, setIsTogglingEconomy] = useState<boolean>(false);


  // Fetch all agents on mount & update agentsMap
  const refreshAgents = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/economy/agents`);
      if (res.ok) {
        const data = await res.json();
        // API returns a flat array of agents
        const agentList = Array.isArray(data) ? data : Array.isArray(data.agents) ? data.agents : [];
        if (agentList.length > 0) {
          const map = new Map<string, Agent>();
          agentList.forEach((ag: Agent) => map.set(ag.instanceId, ag));
          setAgentsMap(map);
        }
      }
    } catch {
      // Fallback silent
    }
  }, []);

  useEffect(() => {
    refreshAgents();
    const interval = setInterval(refreshAgents, 5000); // 5s for more real-time agent stats
    return () => clearInterval(interval);
  }, [refreshAgents]);

  // Work Sidebar flow reference
  const workSidebarFlow =
    selectedSidebar?.type === 'work' ? flows.get(selectedSidebar.taskId) ?? null : null;

  // Typewriter Hook for Work Sidebar
  const { typedText, isTyping, reset: resetTypewriter } = useTypewriter(
    workSidebarFlow?.result ?? null,
    workSidebarFlow?.phase === 'working' || workSidebarFlow?.result != null
  );

  // Click Handlers
  const handleTaskCardClick = useCallback((taskId: string) => {
    setIsHistoryOpen(false);
    setSelectedAgent(null);
    setSelectedSidebar({ type: 'task', taskId });
  }, []);

  const handleBidNodeClick = useCallback((taskId: string) => {
    setIsHistoryOpen(false);
    setSelectedAgent(null);
    setSelectedSidebar({ type: 'bid', taskId });
  }, []);

  const handleWorkerCardClick = useCallback(
    (taskId: string) => {
      setIsHistoryOpen(false);
      setSelectedAgent(null);
      resetTypewriter();
      setSelectedSidebar({ type: 'work', taskId });
    },
    [resetTypewriter]
  );

  const handleAgentClick = useCallback(
    (agentInstanceId: string) => {
      setIsHistoryOpen(false);
      setSelectedSidebar(null);
      const agent = agentsMap.get(agentInstanceId);
      if (agent) {
        setSelectedAgent(agent);
      } else {
        // Fallback agent shell
        setSelectedAgent({
          id: agentInstanceId,
          instanceId: agentInstanceId,
          name: agentInstanceId,
          role: 'producer',
          skills: ['specialist'],
          usdcBalance: 0.05,
          reputation: 50,
          status: 'idle',
          jobsCompleted: 0,
          totalEarned: 0,
          totalSpent: 0,
        });
      }
    },
    [agentsMap]
  );

  const handleHistoryButtonClick = useCallback(() => {
    setSelectedSidebar(null);
    setSelectedAgent(null);
    setIsHistoryOpen((prev) => !prev);
    setIsAnalyticsOpen(false);
    setIsBankOpen(false);
  }, []);

  const handleAnalyticsButtonClick = useCallback(() => {
    setSelectedSidebar(null);
    setSelectedAgent(null);
    setIsAnalyticsOpen((prev) => !prev);
    setIsHistoryOpen(false);
    setIsBankOpen(false);
  }, []);

  const handleBankButtonClick = useCallback(() => {
    setSelectedSidebar(null);
    setSelectedAgent(null);
    setIsBankOpen((prev) => !prev);
    setIsHistoryOpen(false);
    setIsAnalyticsOpen(false);
    setIsCourtOpen(false);
  }, []);

  const handleCourtButtonClick = useCallback(() => {
    setSelectedSidebar(null);
    setSelectedAgent(null);
    setIsCourtOpen((prev) => !prev);
    setIsHistoryOpen(false);
    setIsAnalyticsOpen(false);
    setIsBankOpen(false);
  }, []);


  // Economy Start / Stop API handlers
  const handleToggleEconomy = async () => {
    setIsTogglingEconomy(true);
    try {
      const endpoint = isEconomyRunning ? '/api/economy/stop' : '/api/economy/start';
      const res = await fetch(API_URL + endpoint, { method: 'POST' });
      const data = await res.json();

      if (data.success !== false) {
        addToast(
          isEconomyRunning ? 'Economy simulation stopped.' : 'Economy simulation started!',
          isEconomyRunning ? 'info' : 'success'
        );
      } else {
        addToast('Failed to change economy state', 'error');
      }
    } catch {
      addToast('Error contacting backend server', 'error');
    } finally {
      setIsTogglingEconomy(false);
    }
  };

  // Y Coordinate Calculations (CRITICAL FIX 2)
  const activeSectionHeight = Math.max(1, activeFlowIds.length) * 320;
  const completedSectionStartY = activeSectionHeight + 180;

  return (
    <div className="relative w-screen h-screen overflow-hidden select-none font-sans" style={{ background: 'var(--bg-canvas)' }}>
      {/* ── LAYER 1: Infinite Canvas & Flow Diagrams ───────────────────────── */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden"
        style={{
          backgroundImage: 'radial-gradient(rgba(99,102,241,0.15) 1.5px, transparent 1.5px)',
          backgroundSize: `${24 * zoomLevel}px ${24 * zoomLevel}px`,
          backgroundColor: 'var(--bg-canvas)',
          backgroundBlendMode: 'screen',
        }}
      >
        {/* Transformable Canvas Container */}
        <div ref={canvasRef} className="absolute inset-0 transform-gpu origin-top-left">
          {/* Traveling Circles Overlay (Child of transform canvas div) */}
          <TravelingCircles circles={travelingCircles} />

          {/* Section 1: Active Tasks Header */}
          <div className="absolute left-[80px] top-[40px] text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2 pointer-events-none">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
            <span>⚡ ACTIVE TASKS ({activeFlowIds.length})</span>
          </div>

          {/* Render Active Flows */}
          {activeFlowIds.map((id, index) => {
            const flow = flows.get(id);
            if (!flow) return null;
            const flowY = 100 + index * 320;
            return (
              <FlowDiagram
                key={flow.taskId}
                flow={flow}
                y={flowY}
                onTaskCardClick={handleTaskCardClick}
                onBidNodeClick={handleBidNodeClick}
                onWorkerCardClick={handleWorkerCardClick}
                onAgentClick={handleAgentClick}
              />
            );
          })}

          {/* Section 2: Completed Tasks Divider & Section */}
          {completedFlowIds.length > 0 && (
            <>
              {/* Dashed divider line */}
              <div
                className="absolute left-[80px] w-[960px] border-t-2 border-dashed border-slate-300 pointer-events-none"
                style={{ top: `${completedSectionStartY - 40}px` }}
              />

              <div
                className="absolute left-[80px] text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2 pointer-events-none"
                style={{ top: `${completedSectionStartY - 20}px` }}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>✅ COMPLETED TASKS ({completedFlowIds.length})</span>
              </div>

              {/* Render Completed Flows */}
              {completedFlowIds.map((id, index) => {
                const flow = flows.get(id);
                if (!flow) return null;
                const flowY = completedSectionStartY + index * 320;
                return (
                  <FlowDiagram
                    key={flow.taskId}
                    flow={flow}
                    y={flowY}
                    onTaskCardClick={handleTaskCardClick}
                    onBidNodeClick={handleBidNodeClick}
                    onWorkerCardClick={handleWorkerCardClick}
                    onAgentClick={handleAgentClick}
                  />
                );
              })}
            </>
          )}

          {/* Education Cards for studying agents */}
          {educatingAgents.map((student, idx) => (
            <EducationCard 
              key={student.agentId} 
              student={student} 
              cardX={1300} 
              cardY={100 + idx * 280} 
            />
          ))}

          {/* Empty Canvas State */}
          {activeFlowIds.length === 0 && completedFlowIds.length === 0 && (
            <div
              className="absolute left-[320px] top-[200px] p-8 text-center max-w-[460px] pointer-events-auto select-none rounded-3xl"
              style={{
                background: 'rgba(255,255,255,0.75)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.9)',
                boxShadow: '0 8px 48px rgba(99,102,241,0.12)',
              }}
            >
              <div
                className="w-16 h-16 rounded-2xl text-3xl flex items-center justify-center mx-auto mb-4"
                style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.2)' }}
              >
                🌐
              </div>
              <h2 className="text-xl font-extrabold mb-2" style={{ fontFamily: "'Syne', sans-serif", color: '#1e1b4b' }}>
                Autonomous Agent Economy
              </h2>
              <p className="text-xs leading-relaxed mb-6" style={{ color: 'rgba(30,27,75,0.5)' }}>
                49 AI agents executing bounties, bidding in real-time, earning Circle USDC, forming guilds, and settling disputes on-chain — all without human intervention.
              </p>
              <button
                onClick={handleToggleEconomy}
                disabled={isTogglingEconomy}
                className="font-bold text-xs px-7 py-3 rounded-xl flex items-center justify-center gap-2 mx-auto cursor-pointer transition-all hover:scale-105 disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                  color: 'white',
                  boxShadow: '0 4px 20px rgba(99,102,241,0.35)',
                  border: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <span>▶</span>
                <span>Start Economy Engine</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── LAYER 2: Fixed UI Overlays ────────────────────────────────────── */}
      <StatsBar
        stats={stats}
        totalUSDCFlowed={totalUSDCFlowed}
        completedTasksCount={completedCount}
      />

      <Toast toasts={toasts} />

      {/* Economy Toggle Button (Top Left) */}
      <div className="fixed top-4 left-6 z-40 flex items-center gap-3">
        <button
          onClick={handleToggleEconomy}
          disabled={isTogglingEconomy}
          className="px-4 py-2.5 rounded-full font-bold text-xs flex items-center gap-2 cursor-pointer transition-all hover:scale-105 disabled:opacity-50"
          style={{
            background: isEconomyRunning ? 'rgba(239,68,68,0.85)' : 'rgba(16,185,129,0.85)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            border: `1px solid ${isEconomyRunning ? 'rgba(239,68,68,0.5)' : 'rgba(16,185,129,0.5)'}`,
            color: 'white',
            boxShadow: isEconomyRunning ? '0 4px 16px rgba(239,68,68,0.25)' : '0 4px 16px rgba(16,185,129,0.25)',
            fontFamily: "'Inter', sans-serif",
          }}
        >
          <span
            className={`w-2 h-2 rounded-full bg-white ${isEconomyRunning ? 'animate-ping' : ''}`}
          />
          <span>{isEconomyRunning ? '⏹ Stop Economy' : '▶ Start Economy'}</span>
        </button>

        {!isConnected && (
          <span
            className="text-[10px] font-bold px-3 py-1 rounded-full animate-pulse"
            style={{ background: 'rgba(245,158,11,0.12)', color: '#d97706', border: '1px solid rgba(245,158,11,0.3)' }}
          >
            Reconnecting...
          </span>
        )}
      </div>

      {/* Zoom Controls (Bottom Right) */}
      <div
        className="fixed bottom-24 right-6 z-40 p-1.5 flex flex-col gap-1 pointer-events-auto rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(99,102,241,0.12)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        }}
      >
        <button
          onClick={zoomIn}
          className="w-9 h-9 rounded-xl font-bold text-base flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          style={{ color: '#6366f1', background: 'rgba(99,102,241,0.06)' }}
          title="Zoom In"
        >
          +
        </button>
        <div style={{ height: 1, background: 'rgba(99,102,241,0.08)' }} />
        <button
          onClick={zoomOut}
          className="w-9 h-9 rounded-xl font-bold text-base flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          style={{ color: '#6366f1', background: 'rgba(99,102,241,0.06)' }}
          title="Zoom Out"
        >
          -
        </button>
        <div style={{ height: 1, background: 'rgba(99,102,241,0.08)' }} />
        <button
          onClick={resetView}
          className="w-9 h-9 rounded-xl text-xs flex items-center justify-center transition-all cursor-pointer hover:scale-105"
          style={{ color: '#6366f1', background: 'rgba(99,102,241,0.06)' }}
          title="Reset View"
        >
          ⌖
        </button>
      </div>

      {/* MiniMap removed */}

      {/* Floating History Button (Bottom Left) */}
      <button
        onClick={handleHistoryButtonClick}
        className="fixed bottom-6 left-6 z-40 w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl hover:scale-105 transition-all cursor-pointer pointer-events-auto"
        title="Session History"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          color: '#6366f1',
        }}
      >
        🕐
      </button>

      {/* Floating Supreme Court Button (Bottom Left, offset) */}
      <button
        onClick={handleCourtButtonClick}
        className="fixed bottom-6 left-[222px] z-40 w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl hover:scale-105 transition-all cursor-pointer pointer-events-auto"
        title="Supreme Court"
        style={{
          background: isCourtOpen ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: isCourtOpen ? '1px solid rgba(239,68,68,0.4)' : '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          color: isCourtOpen ? '#ef4444' : '#6366f1',
        }}
      >
        ⚖️
      </button>

      {/* Floating Analytics Button (Bottom Left, offset) */}
      <button
        onClick={handleAnalyticsButtonClick}
        className="fixed bottom-6 left-[90px] z-40 w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl hover:scale-105 transition-all cursor-pointer pointer-events-auto"
        title="Economy Analytics"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          color: '#6366f1',
        }}
      >
        📊
      </button>

      {/* Floating Bank Button (Bottom Left, offset) */}
      <button
        onClick={handleBankButtonClick}
        className="fixed bottom-6 left-[156px] z-40 w-[52px] h-[52px] rounded-full flex items-center justify-center text-xl hover:scale-105 transition-all cursor-pointer pointer-events-auto"
        title="Central Bank"
        style={{
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid rgba(99,102,241,0.15)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          color: '#6366f1',
        }}
      >
        🏦
      </button>

      {/* ── LAYER 3: Interactive Sidebars & History Panel ──────────────────── */}
      <TaskSidebar
        isOpen={selectedSidebar?.type === 'task'}
        onClose={() => setSelectedSidebar(null)}
        flow={selectedSidebar?.type === 'task' ? flows.get(selectedSidebar.taskId) ?? null : null}
      />

      <BidSidebar
        isOpen={selectedSidebar?.type === 'bid'}
        onClose={() => setSelectedSidebar(null)}
        flow={selectedSidebar?.type === 'bid' ? flows.get(selectedSidebar.taskId) ?? null : null}
      />

      <WorkSidebar
        isOpen={selectedSidebar?.type === 'work'}
        onClose={() => setSelectedSidebar(null)}
        flow={workSidebarFlow}
        isTyping={isTyping}
        typedText={typedText}
      />

      <AgentSidebar
        isOpen={selectedAgent !== null}
        onClose={() => setSelectedAgent(null)}
        agent={selectedAgent ? (agentsMap.get(selectedAgent.instanceId) || selectedAgent) : null}
      />

      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        allFlows={allFlows}
      />

      <AnalyticsSidebar
        isOpen={isAnalyticsOpen}
        onClose={() => setIsAnalyticsOpen(false)}
        stats={stats}
      />

      <BankSidebar
        isOpen={isBankOpen}
        onClose={() => setIsBankOpen(false)}
      />

      {/* Supreme Court Panel */}
      {isCourtOpen && (
        <div
          className="fixed top-0 right-0 h-full z-50 flex flex-col overflow-hidden pointer-events-auto"
          style={{
            width: '340px',
            background: 'rgba(8,8,20,0.92)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderLeft: '1px solid rgba(239,68,68,0.2)',
            boxShadow: '-8px 0 40px rgba(239,68,68,0.08)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 shrink-0">
            <span className="text-white font-bold text-sm tracking-wide">⚖️ Supreme Court</span>
            <button
              onClick={() => setIsCourtOpen(false)}
              className="text-slate-500 hover:text-white transition-colors text-base w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto p-4">
            <SupremeCourt />
          </div>
        </div>
      )}

      {/* Section 8: Economy Announcements */}
      <AnnouncementBanner announcements={announcements} />
    </div>
  );
}
