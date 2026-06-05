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
