import type { Message } from './message.js';

export type SessionStatus = 'active' | 'archived' | 'deleted';

export interface Session {
  id: string;
  workspaceId: string;
  title: string;
  status: SessionStatus;
  messageCount: number;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface SessionWithMessages extends Session {
  messages: Message[];
}

export interface SessionGroup {
  workspaceId: string;
  workspaceName: string;
  sessions: Session[];
}
