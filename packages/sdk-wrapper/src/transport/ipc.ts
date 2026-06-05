import type { TransportEvent, TransportEventHandler, TransportEventType } from '@pi/types';
import type { Transport } from './base.js';
import { generateRequestId } from './base.js';

interface IpcBridge {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, callback: (...args: unknown[]) => void): void;
  removeListener(channel: string, callback: (...args: unknown[]) => void): void;
}

export class IPCTransport implements Transport {
  private ipc: IpcBridge | null = null;
  private connected = false;
  private listeners = new Map<string, Set<TransportEventHandler>>();

  async connect(): Promise<void> {
    if (typeof window !== 'undefined' && 'electronAPI' in window) {
      this.ipc = (window as unknown as { electronAPI: IpcBridge }).electronAPI;
      this.connected = true;
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.ipc = null;
    this.listeners.clear();
  }

  async request(method: string, params?: unknown): Promise<unknown> {
    if (!this.ipc || !this.connected) {
      throw new Error('IPC transport not connected');
    }
    return this.ipc.invoke('pi:sdk:request', { id: generateRequestId(), method, params });
  }

  on(event: TransportEventType, handler: TransportEventHandler): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
      if (this.ipc) {
        this.ipc.on(`pi:event:${event}`, ((payload: unknown) => {
          this.emit({ type: event, payload, timestamp: new Date().toISOString() });
        }) as (...args: unknown[]) => void);
      }
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: TransportEventType, handler: TransportEventHandler): void {
    this.listeners.get(event)?.delete(handler);
  }

  isConnected(): boolean {
    return this.connected;
  }

  private emit(event: TransportEvent): void {
    this.listeners.get(event.type)?.forEach((handler) => handler(event));
  }
}
