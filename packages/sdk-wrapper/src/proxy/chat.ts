import type { Transport } from '../transport/base.js';
import type { ChatService, SendMessageParams, StreamChunk } from '../services/chat.js';
import type { Message } from '@pi/types';

/**
 * Check if a transport supports streaming.
 */
function hasStreaming(transport: Transport): transport is Transport & {
  streamRequest(method: string, params: unknown, onEvent: (data: any) => void, signal?: AbortSignal): Promise<void>;
} {
  return typeof (transport as any).streamRequest === 'function';
}

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
      // Use real streaming via SSE if transport supports it
      if (hasStreaming(transport)) {
        try {
          await transport.streamRequest('chat.sendMessageStream', params, (event) => {
            onChunk(event as StreamChunk);
          }, signal);
        } catch (err) {
          if (signal?.aborted) return { role: 'assistant' } as Message;
          onChunk({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
          throw err;
        }
        // Fetch the final message after stream ends
        const messages = await transport.request('chat.getMessages', {
          sessionId: params.sessionId,
          limit: 1,
          offset: 0,
        }) as Message[];
        return messages[0] || ({ role: 'assistant' } as Message);
      }

      // Fallback: non-streaming for transports without streamRequest
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
