import type { Transport } from '../transport/base.js';
import type { ChatService, SendMessageParams, StreamChunk } from '../services/chat.js';
import type { Message } from '@pi/types';

export function createProxyChatService(transport: Transport): ChatService {
  return {
    async sendMessage(params: SendMessageParams): Promise<Message> {
      return transport.request('chat.sendMessage', params) as Promise<Message>;
    },

    async sendMessageStream(
      params: SendMessageParams,
      onChunk: (chunk: StreamChunk) => void,
      signal?: AbortSignal,
    ): Promise<Message> {
      // For proxy mode, we call the non-streaming endpoint and emit a single text chunk + done
      // Full streaming support requires backend SSE/WebSocket integration
      try {
        const message = await transport.request('chat.sendMessage', params) as Message;
        const textContent = typeof message.content === 'string'
          ? message.content
          : (Array.isArray(message.content) ? JSON.stringify(message.content) : '');
        onChunk({ type: 'text', content: textContent });
        onChunk({ type: 'done' });
        return message;
      } catch (err) {
        onChunk({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
        throw err;
      }
    },

    async getMessages(sessionId: string, limit?: number, offset?: number) {
      return transport.request('chat.getMessages', { sessionId, limit, offset }) as ReturnType<ChatService['getMessages']>;
    },

    async stopGeneration(sessionId: string) {
      return transport.request('chat.stopGeneration', { sessionId }) as ReturnType<ChatService['stopGeneration']>;
    },
  };
}
