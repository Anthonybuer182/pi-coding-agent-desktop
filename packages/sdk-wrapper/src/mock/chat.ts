import type { Message, AssistantMessage, ContentBlock } from '@pi/types';
import type { ChatService, SendMessageParams, StreamChunk } from '../services/chat.js';

const MOCK_STREAMING_RESPONSES = [
  "I'll help you with that. ",
  'Let me analyze the codebase first. ',
  'Looking at the current implementation, ',
  "I can see that there are several ways to approach this. ",
  'Here is my recommended solution:\n\n',
  '```typescript\n',
  'function example() {\n',
  '  return "Hello World";\n',
  '}\n',
  '```\n\n',
  'This should address your requirements. Let me know if you need any clarification!',
];

export class MockChatService implements ChatService {
  private messages: Message[] = [];

  async sendMessage(params: SendMessageParams): Promise<Message> {
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sessionId: params.sessionId,
      role: 'user',
      status: 'complete',
      content: params.content,
      blocks: [{ id: `b-user-${Date.now()}`, type: 'text', content: params.content }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.messages.push(userMsg);

    const asstMsg: AssistantMessage = {
      id: `msg-${Date.now()}-asst`,
      sessionId: params.sessionId,
      role: 'assistant',
      status: 'complete',
      modelId: params.modelId ?? 'claude-sonnet-4',
      content: MOCK_STREAMING_RESPONSES.join(''),
      blocks: [
        { id: 'b-thinking-1', type: 'thinking', content: 'Analyzing the user request...', thinking: 'Let me think about what the user is asking for and how to best help them.', duration: 800 },
        { id: 'b-text-1', type: 'text', content: MOCK_STREAMING_RESPONSES.join('') },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usage: {
        inputTokens: 350,
        outputTokens: 180,
        totalTokens: 530,
      },
    };
    this.messages.push(asstMsg);
    return asstMsg;
  }

  async sendMessageStream(
    params: SendMessageParams,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal,
  ): Promise<Message> {
    const userMsg: Message = {
      id: `msg-${Date.now()}-user`,
      sessionId: params.sessionId,
      role: 'user',
      status: 'complete',
      content: params.content,
      blocks: [{ id: `b-user-${Date.now()}`, type: 'text', content: params.content }],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.messages.push(userMsg);

    onChunk({ type: 'block', block: { id: 'b-thinking', type: 'thinking', content: 'Thinking...', thinking: 'Let me analyze the request carefully before responding.', duration: 0 } });

    await delay(500);

    for (let i = 0; i < MOCK_STREAMING_RESPONSES.length; i++) {
      if (signal?.aborted) {
        onChunk({ type: 'error', error: 'Generation cancelled' });
        throw new Error('Generation cancelled');
      }
      onChunk({ type: 'text', content: MOCK_STREAMING_RESPONSES[i] });
      await delay(150 + Math.random() * 200);
    }

    const asstMsg: AssistantMessage = {
      id: `msg-${Date.now()}-asst`,
      sessionId: params.sessionId,
      role: 'assistant',
      status: 'complete',
      modelId: params.modelId ?? 'claude-sonnet-4',
      content: MOCK_STREAMING_RESPONSES.join(''),
      blocks: [
        { id: 'b-thinking', type: 'thinking', content: 'Analyzing the request...', thinking: 'Let me analyze the request carefully before responding.', duration: 500 },
        { id: 'b-text', type: 'text', content: MOCK_STREAMING_RESPONSES.join('') },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      usage: {
        inputTokens: 350,
        outputTokens: 180,
        totalTokens: 530,
      },
    };

    onChunk({ type: 'done' });
    this.messages.push(asstMsg);
    return asstMsg;
  }

  async getMessages(sessionId: string, limit?: number, offset?: number): Promise<Message[]> {
    const sessionMessages = this.messages.filter((m) => m.sessionId === sessionId);
    const start = offset ?? 0;
    const end = limit ? start + limit : undefined;
    return sessionMessages.slice(start, end);
  }

  async stopGeneration(_sessionId: string): Promise<void> {
    // Mock: no-op
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
