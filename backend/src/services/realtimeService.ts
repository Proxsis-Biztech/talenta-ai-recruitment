import { randomUUID } from 'crypto';
import { Request, Response } from 'express';

interface SseClient {
  id: string;
  channel: string;
  userId?: string;
  res: Response;
}

const clients = new Map<string, SseClient>();
let heartbeat: NodeJS.Timeout | null = null;

const ensureHeartbeat = () => {
  if (heartbeat) return;
  heartbeat = setInterval(() => {
    for (const client of clients.values()) {
      try {
        client.res.write(': ping\n\n');
      } catch {
        clients.delete(client.id);
      }
    }
    if (clients.size === 0 && heartbeat) {
      clearInterval(heartbeat);
      heartbeat = null;
    }
  }, 25000);
  heartbeat.unref?.();
};

export const openSseStream = (
  req: Request,
  res: Response,
  channel: string,
  userId?: string
): string => {
  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write('retry: 4000\n\n');

  const id = randomUUID();
  clients.set(id, { id, channel, userId, res });
  ensureHeartbeat();

  const cleanup = () => {
    clients.delete(id);
  };
  req.on('close', cleanup);
  req.on('aborted', cleanup);
  res.on('close', cleanup);
  return id;
};

export const publish = (channel: string, event: string, data: unknown): number => {
  let sent = 0;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (client.channel !== channel) continue;
    try {
      client.res.write(payload);
      sent += 1;
    } catch {
      clients.delete(client.id);
    }
  }
  return sent;
};

export const publishToUser = (userId: string, event: string, data: unknown): number => {
  let sent = 0;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients.values()) {
    if (client.userId !== userId) continue;
    try {
      client.res.write(payload);
      sent += 1;
    } catch {
      clients.delete(client.id);
    }
  }
  return sent;
};

export const sseClientCount = (): number => clients.size;