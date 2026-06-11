export type TransportEventType =
  | 'connect'
  | 'disconnect'
  | 'error'
  | 'message'
  | 'stream-start'
  | 'stream-chunk'
  | 'stream-end'
  | 'state-change';

export interface TransportEvent {
  type: TransportEventType;
  payload?: unknown;
  timestamp: string;
}

export type TransportEventHandler = (event: TransportEvent) => void;

export interface TransportEventEmitter {
  on(event: TransportEventType, handler: TransportEventHandler): void;
  off(event: TransportEventType, handler: TransportEventHandler): void;
  emit(event: TransportEvent): void;
}

/** Delivery mode for messages sent while the agent is working */
export type StreamingBehavior = 'steer' | 'followUp';

/** Current state of the agent's steering and follow-up message queues */
export interface QueueState {
  steering: string[];
  followUp: string[];
}
