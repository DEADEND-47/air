import { api } from './api';

export interface RealtimeEvent<T = unknown> {
  type: string;
  payload: T;
  timestamp?: string;
}

let activeSocket: WebSocket | null = null;
let activeListeners = 0;
let connectTimer: ReturnType<typeof setTimeout> | null = null;

export function connectRealtime(onEvent: (event: RealtimeEvent) => void) {
  if (connectTimer) {
    clearTimeout(connectTimer);
    connectTimer = null;
  }
  if (!activeSocket || activeSocket.readyState > WebSocket.OPEN) {
    activeSocket = null;
  }
  activeListeners += 1;
  const ensureSocket = () => {
    if (!activeSocket && activeListeners > 0) {
      activeSocket = new WebSocket(api.websocketUrl());
    }
    return activeSocket;
  };
  const socket = ensureSocket();
  const handleMessage = (message: MessageEvent<string>) => {
    try { onEvent(JSON.parse(message.data)); }
    catch { /* Ignore malformed realtime messages. */ }
  };
  if (socket) socket.addEventListener('message', handleMessage);
  return () => {
    const current = activeSocket;
    if (current) current.removeEventListener('message', handleMessage);
    activeListeners = Math.max(0, activeListeners - 1);
    if (activeListeners === 0) {
      connectTimer = setTimeout(() => {
        if (activeListeners === 0 && activeSocket) {
          activeSocket.close();
          activeSocket = null;
        }
        connectTimer = null;
      }, 75);
    }
  };
}
