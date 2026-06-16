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
    const response = await this.ipc.invoke('pi:sdk:request', { id: generateRequestId(), method, params }) as {
      id: string;
      result?: unknown;
      error?: { code: number; message: string };
    };
    if (response.error) {
      throw new Error(response.error.message);
    }
    return response.result;
  }

  /**
   * Stream request via IPC events.
   * Invokes a streaming handler in the main process, then listens for
   * real-time chunks pushed back via ipcRenderer.on.
   */
  async streamRequest(
    method: string,
    params: unknown,
    onEvent: (data: any) => void,
    signal?: AbortSignal,
  ): Promise<void> {
    if (!this.ipc || !this.connected) {
      throw new Error('IPC transport not connected');
    }

    const ipc = this.ipc;
    const streamId = generateRequestId();
    const chunkChannel = `pi:stream:chunk:${streamId}`;

    return new Promise<void>((resolve, reject) => {
      let settled = false;

      const chunkHandler = (data: any) => {
        if (data?.type === 'done') {
          cleanup();
          if (!settled) { settled = true; resolve(); }
          return;
        }
        if (data?.type === 'error') {
          cleanup();
          if (!settled) { settled = true; reject(new Error(data.error || 'Stream error')); }
          return;
        }
        try { onEvent(data); } catch { /* ignore handler errors */ }
      };

      const cleanup = () => {
        ipc.removeListener(chunkChannel, chunkHandler as (...args: unknown[]) => void);
      };

      // Listen for real-time chunks from main process
      ipc.on(chunkChannel, chunkHandler as (...args: unknown[]) => void);

      // Start the stream in main process
      ipc.invoke('pi:sdk:stream', { method, params, streamId })
        .then(() => {
          // Invoke resolved normally — send done if not already settled
          if (!settled) {
            settled = true;
            cleanup();
            resolve();
          }
        })
        .catch((err: unknown) => {
          if (!settled) {
            settled = true;
            cleanup();
            reject(err instanceof Error ? err : new Error(String(err)));
          }
        });

      // Handle abort signal
      if (signal) {
        if (signal.aborted) {
          cleanup();
          if (!settled) {
            settled = true;
            reject(new DOMException('Stream aborted', 'AbortError'));
          }
          return;
        }
        const onAbort = () => {
          ipc.invoke('pi:sdk:stream:abort', { streamId }).catch(() => {});
          cleanup();
          if (!settled) {
            settled = true;
            reject(new DOMException('Stream aborted', 'AbortError'));
          }
        };
        signal.addEventListener('abort', onAbort, { once: true });
      }
    });
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
