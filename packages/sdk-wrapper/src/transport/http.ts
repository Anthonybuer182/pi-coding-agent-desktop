import type { TransportEvent, TransportEventHandler, TransportEventType } from '@pi/types';
import type { Transport } from './base.js';
import { generateRequestId } from './base.js';

export class HTTPTransport implements Transport {
  private baseUrl: string;
  private connected = false;
  private listeners = new Map<string, Set<TransportEventHandler>>();

  constructor(baseUrl: string = 'http://localhost:3000/api') {
    this.baseUrl = baseUrl;
  }

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.listeners.clear();
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    const res = await fetch(`${this.baseUrl}/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: generateRequestId(), method, params }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);
    return data.result;
  }

  /**
   * Stream request via Server-Sent Events.
   * Reads the response body as an SSE stream and calls onEvent for each data frame.
   */
  async streamRequest(
    method: string,
    params: unknown,
    onEvent: (data: any) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    const res = await fetch(`${this.baseUrl}/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: generateRequestId(), method, params }),
      signal,
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    if (!res.body) throw new Error('No response body');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              onEvent(data);
            } catch {
              // skip unparseable lines
            }
          }
        }
      }

      // Process remaining buffer
      if (buffer.startsWith('data: ')) {
        try {
          const data = JSON.parse(buffer.slice(6));
          onEvent(data);
        } catch {}
      }
    } finally {
      reader.releaseLock();
    }
  }

  on(event: TransportEventType, handler: TransportEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: TransportEventType, handler: TransportEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }
}
