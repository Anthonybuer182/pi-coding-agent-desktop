import type { TransportEventHandler, TransportEventType } from '@pi/types';

export interface TransportRequest {
  id: string;
  method: string;
  params: unknown;
}

export interface TransportResponse {
  id: string;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface Transport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  request(method: string, params?: unknown): Promise<unknown>;
  on(event: TransportEventType, handler: TransportEventHandler): void;
  off(event: TransportEventType, handler: TransportEventHandler): void;
  isConnected(): boolean;
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
