/**
 * socket.ts
 * ──────────────────────────────────────────────────────────────────────────────
 * Socket.io client singleton for NexusAgent frontend.
 * Connects to the backend at NEXT_PUBLIC_SOCKET_URL and exports:
 *  - `socket`    → singleton Socket.io client instance
 *  - `useSocket` → React hook for subscribing to events in components
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { io, Socket } from 'socket.io-client';
import { useEffect } from 'react';

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ?? 'http://localhost:4000';

/**
 * Singleton socket instance — created once and shared across the app.
 * autoConnect: false lets us connect manually after the page mounts,
 * avoiding SSR issues in Next.js.
 */
let socket: Socket;

if (typeof window !== 'undefined') {
  socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,         // auto-reconnect if connection drops
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,    // 1 s initial delay
    reconnectionDelayMax: 5000, // max 5 s between reconnect attempts
    transports: ['websocket', 'polling'],
  });
}

export { socket };

// ── AgentActivity event shape ──────────────────────────────────────────────────

/** The wrapper every backend event is emitted inside. */
export interface AgentActivityPayload {
  event: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;
  timestamp: string;
}

// ── React hook ─────────────────────────────────────────────────────────────────

/**
 * useSocket
 * Subscribes a component to a Socket.io event and automatically cleans up
 * the listener when the component unmounts.
 *
 * @param event    The event name to listen for
 * @param handler  Callback invoked with the event payload
 */
export function useSocket(
  event: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (data: any) => void
): void {
  useEffect(() => {
    if (!socket) return;

    socket.on(event, handler);
    return () => {
      socket.off(event, handler);
    };
  }, [event, handler]);
}
