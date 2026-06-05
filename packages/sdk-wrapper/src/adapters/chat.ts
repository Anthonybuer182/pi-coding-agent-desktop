import type { ChatService, SendMessageParams, StreamChunk } from '../services/chat.js';
import type { Message, AssistantMessage, ContentBlock } from '@pi/types';
import { createAgentSession, SessionManager } from '@earendil-works/pi-coding-agent';
import type { AgentSession } from '@earendil-works/pi-coding-agent';

/**
 * Real chat adapter using createAgentSessionFromServices.
 *
 * Creates interactive AgentSession instances backed by the real SDK.
 * For existing sessions, opens via SessionManager and attaches to AgentSession.
 * For new sessions, creates via SessionManager.create().
 */
export function createRealChatService(cwd: string): ChatService {
  const activeSessions = new Map<string, { session: AgentSession; unsubscribe: () => void }>();

  async function getOrCreateAgentSession(
    sessionId?: string,
    workspaceCwd?: string,
  ): Promise<AgentSession> {
    const key = sessionId || 'default';

    if (activeSessions.has(key)) {
      return activeSessions.get(key)!.session;
    }

    const workCwd = workspaceCwd || cwd;
    let sessionManager: SessionManager;

    if (sessionId) {
      // Open existing session
      sessionManager = SessionManager.open(sessionId, undefined, workCwd);
    } else {
      // Create new session
      sessionManager = SessionManager.create(workCwd);
    }

    const { session } = await createAgentSession({
      cwd: workCwd,
      sessionManager,
    });

    const unsubscribe = session.subscribe((_event) => {
      // Events are handled at the call site level
    });

    activeSessions.set(key, { session, unsubscribe });
    return session;
  }

  return {
    async sendMessage(params: SendMessageParams): Promise<Message> {
      const session = await getOrCreateAgentSession(params.sessionId);
      await session.prompt(params.content);

      const asstMsg: AssistantMessage = {
        id: `msg-${Date.now()}-asst`,
        sessionId: params.sessionId,
        role: 'assistant',
        status: 'complete',
        modelId: params.modelId ?? 'unknown',
        content: session.getLastAssistantText() || '',
        blocks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return asstMsg;
    },

    async sendMessageStream(
      params: SendMessageParams,
      onChunk: (chunk: StreamChunk) => void,
      signal?: AbortSignal,
    ): Promise<Message> {
      const session = await getOrCreateAgentSession(params.sessionId);

      const unsubscribe = session.subscribe((event: any) => {
        switch (event.type) {
          case 'message_start':
          case 'message_update': {
            const msg = event.message;
            if (msg && msg.content) {
              const content = msg.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    onChunk({ type: 'text', content: block.text });
                  } else if (block.type === 'thinking') {
                    onChunk({
                      type: 'block',
                      block: {
                        id: `b-think-${Date.now()}`,
                        type: 'thinking',
                        content: block.thinking || '',
                        thinking: block.thinking,
                      },
                    });
                  } else if (block.type === 'toolCall' || block.type === 'tool_call') {
                    onChunk({
                      type: 'block',
                      block: {
                        id: `b-tc-${Date.now()}`,
                        type: 'tool_call',
                        content: block.name || 'tool',
                        toolCallId: block.toolCallId,
                        toolName: block.name || block.toolName,
                      },
                    });
                  }
                }
              } else if (typeof content === 'string') {
                onChunk({ type: 'text', content });
              }
            }
            break;
          }
          case 'tool_execution_start': {
            onChunk({
              type: 'block',
              block: {
                id: `b-te-${Date.now()}`,
                type: 'tool_call',
                content: event.toolName || 'tool execution',
                toolCallId: event.toolCallId,
                toolName: event.toolName,
              },
            });
            break;
          }
          case 'tool_execution_end': {
            onChunk({
              type: 'block',
              block: {
                id: `b-ter-${Date.now()}`,
                type: 'tool_result',
                content: event.isError ? `Error: ${event.result}` : 'Done',
                toolCallId: event.toolCallId,
                result: event.result,
                isError: event.isError,
              },
            });
            break;
          }
          case 'message_end': {
            onChunk({ type: 'done' });
            break;
          }
          case 'agent_end': {
            // Agent ended (may retry or finalize)
            if (!event.willRetry) {
              onChunk({ type: 'done' });
            }
            break;
          }
        }
      });

      if (signal) {
        signal.addEventListener('abort', () => {
          session.abort();
        }, { once: true });
      }

      try {
        await session.prompt(params.content);

        const asstMsg: AssistantMessage = {
          id: `msg-${Date.now()}-asst`,
          sessionId: params.sessionId,
          role: 'assistant',
          status: 'complete',
          modelId: params.modelId ?? 'unknown',
          content: session.getLastAssistantText() || '',
          blocks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        return asstMsg;
      } catch (err) {
        onChunk({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
        throw err;
      } finally {
        unsubscribe();
      }
    },

    async getMessages(sessionId: string, _limit?: number, _offset?: number): Promise<Message[]> {
      if (!sessionId) return [];

      try {
        const sm = SessionManager.open(sessionId);
        const entries = sm.getEntries();
        return entries
          .filter((e) => e.type === 'message')
          .map((e) => {
            const msg = (e as any).message;
            const timestamp = msg.timestamp
              ? new Date(msg.timestamp).toISOString()
              : new Date().toISOString();
            return {
              id: `msg-${sessionId}-${e.id}`,
              sessionId,
              role: msg.role === 'assistant' ? 'assistant' : msg.role === 'user' ? 'user' : 'system',
              status: 'complete',
              content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
              blocks: [],
              createdAt: timestamp,
              updatedAt: timestamp,
            } as Message;
          });
      } catch {
        return [];
      }
    },

    async stopGeneration(): Promise<void> {
      // Abort all active sessions
      for (const [, { session }] of activeSessions) {
        try {
          await session.abort();
        } catch { /* ignore */ }
      }
      activeSessions.clear();
    },
  };
}
