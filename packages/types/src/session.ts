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

export interface TreeNodeToolCall {
  toolCallId: string;
  toolName: string;
  argsPreview?: string;
  resultPreview?: string;
  isError?: boolean;
  duration?: number;
}

export interface SessionTreeNode {
  id: string;
  parentId: string | null;
  type: string;
  timestamp: string;
  label?: string;
  /** For message entries */
  role?: 'user' | 'assistant';
  preview?: string;
  /** For model change entries */
  provider?: string;
  modelId?: string;
  /** For thinking level changes */
  thinkingLevel?: string;
  /** For custom entries */
  customType?: string;
  /** For compaction / branch summary */
  summary?: string;
  /** Children (branched sessions) */
  children: SessionTreeNode[];
  /** Tool and thinking chain summary for message entries */
  toolCount?: number;
  toolCalls?: TreeNodeToolCall[];
  hasThinking?: boolean;
  thinkingDuration?: number;
}

export interface SessionTreeResult {
  sessionId: string;
  leafId: string | null;
  nodes: SessionTreeNode[];
}
