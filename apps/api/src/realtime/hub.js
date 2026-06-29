import { WebSocketServer } from 'ws';

let wss;

export function attachRealtime(server) {
  wss = new WebSocketServer({ server, path: '/ws' });
  wss.on('connection', (socket) => {
    socket.send(JSON.stringify({ type: 'connected', payload: { timestamp: new Date().toISOString() } }));
  });
  return wss;
}

export function broadcast(type, payload) {
  if (!wss) return;
  const message = JSON.stringify({ type, payload, timestamp: new Date().toISOString() });
  for (const client of wss.clients) {
    if (client.readyState === client.OPEN) client.send(message);
  }
}
