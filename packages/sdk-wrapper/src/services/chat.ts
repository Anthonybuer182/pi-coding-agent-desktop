import type { Message, ContentBlock, TokenUsage, ContextUsageInfo, SessionStatsInfo, MessageTiming, ToolTiming } from '@pi/types';

export interface SendMessageParams {
  sessionId: string;
  content: string;
  /** Image attachments with base64 data for vision models */
  attachments?: { name: string; mimeType: string; data: string }[];
  modelId?: string;
  workspaceCwd?: string;
}

export interface StreamChunk {
  type: 'text' | 'block' | 'usage' | 'context' | 'stats' | 'message_timing' | 'tool_timing' | 'done' | 'error';
  content?: string;
  block?: ContentBlock;
  error?: string;
  usage?: TokenUsage;
  contextUsage?: ContextUsageInfo;
  sessionStats?: SessionStatsInfo;
  messageTiming?: MessageTiming;
  toolTiming?: ToolTiming;
}

export interface ChatService {
  sendMessage(params: SendMessageParams): Promise<Message>;
  sendMessageStream(
    params: SendMessageParams,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<Message>;
  getMessages(sessionId: string, limit?: number, offset?: number): Promise<Message[]>;
  stopGeneration(sessionId: string): Promise<void>;
}
