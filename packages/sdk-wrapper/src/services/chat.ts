import type { Message, ContentBlock } from '@pi/types';

export interface SendMessageParams {
  sessionId: string;
  content: string;
  attachments?: string[];
  modelId?: string;
}

export interface StreamChunk {
  type: 'text' | 'block' | 'done' | 'error';
  content?: string;
  block?: ContentBlock;
  error?: string;
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
