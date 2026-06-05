import type { TokenUsage } from './usage.js';

export type MessageRole = 'user' | 'assistant' | 'system';

export type MessageStatus = 'pending' | 'streaming' | 'complete' | 'error';

export interface ContentBlock {
  id: string;
  type: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'image' | 'file';
  content: string;
  metadata?: Record<string, unknown>;
  // Subtype-specific optional properties
  thinking?: string;
  duration?: number;
  toolCallId?: string;
  toolName?: string;
  args?: Record<string, unknown>;
  result?: string;
  isError?: boolean;
}

export interface ThinkingBlock extends ContentBlock {
  type: 'thinking';
  thinking: string;
  duration?: number;
}

export interface ToolCallBlock extends ContentBlock {
  type: 'tool_call';
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

export interface ToolResultBlock extends ContentBlock {
  type: 'tool_result';
  toolCallId: string;
  result: string;
  isError?: boolean;
}

export interface Message {
  id: string;
  sessionId: string;
  role: MessageRole;
  status: MessageStatus;
  content: string;
  blocks: ContentBlock[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface UserMessage extends Message {
  role: 'user';
  attachments?: string[];
}

export interface AssistantMessage extends Message {
  role: 'assistant';
  modelId: string;
  usage?: TokenUsage;
}

export interface SystemMessage extends Message {
  role: 'system';
}
