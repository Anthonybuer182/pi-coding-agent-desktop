import type { ChatService, SendMessageParams, StreamChunk } from '../services/chat.js';
import type { Message, AssistantMessage, ContentBlock, TokenUsage, ContextUsageInfo, SessionStatsInfo, MessageTiming } from '@pi/types';
import { createAgentSession, SessionManager, ModelRegistry, AuthStorage, DefaultResourceLoader, getAgentDir } from '@earendil-works/pi-coding-agent';
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
  // Track last message end time per session for thinking time calculation
  const sessionTimings = new Map<string, number>();

  // Shared ModelRegistry — picks up built-in models + models from ~/.pi/agent/models.json
  const modelRegistry = ModelRegistry.create(AuthStorage.inMemory());

  /** Find a model in the registry by its ID string.
   *  Supports "provider/modelId" format for disambiguation.
   *  When multiple models share the same ID, prefers models with configured
   *  auth (from models.json or env vars) over built-in ones without auth. */
  function findModelById(modelId: string) {
    const slashIdx = modelId.lastIndexOf('/');
    if (slashIdx > 0) {
      const provider = modelId.substring(0, slashIdx);
      const id = modelId.substring(slashIdx + 1);
      return modelRegistry.getAll().find((m) => m.id === id && m.provider === provider);
    }
    // First, search only models that have configured auth (API key or OAuth)
    const available = modelRegistry.getAvailable();
    for (let i = available.length - 1; i >= 0; i--) {
      if (available[i].id === modelId) return available[i];
    }
    // Fall back to all models (may not have auth configured)
    const all = modelRegistry.getAll();
    for (let i = all.length - 1; i >= 0; i--) {
      if (all[i].id === modelId) return all[i];
    }
    return undefined;
  }

  /** Convert SDK Usage to our TokenUsage format */
  function sdkUsageToTokenUsage(usage: any): TokenUsage {
    return {
      inputTokens: usage.input ?? 0,
      outputTokens: usage.output ?? 0,
      totalTokens: usage.totalTokens ?? (usage.input ?? 0) + (usage.output ?? 0),
      cacheReadTokens: usage.cacheRead ?? 0,
      cacheWriteTokens: usage.cacheWrite ?? 0,
      cost: usage.cost?.total ?? 0,
    };
  }

  async function createResourceLoader(workCwd: string) {
    const resourceLoader = new DefaultResourceLoader({
      cwd: workCwd,
      agentDir: getAgentDir(),
      appendSystemPrompt: [
        'You are equipped with vision capabilities. When users attach images or when the read tool loads image files, analyze the visual content directly. This includes: screenshots of code/errors, UI designs, architecture diagrams, charts, photos, and any other images the user shares. Describe what you see clearly and use it to provide better coding assistance.',
      ],
    });
    await resourceLoader.reload();
    return resourceLoader;
  }

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
      modelRegistry, // share registry so custom models are visible
      resourceLoader: await createResourceLoader(workCwd),
    });

    const unsubscribe = session.subscribe((_event) => {
      // Events are handled at the call site level
    });

    activeSessions.set(key, { session, unsubscribe });
    return session;
  }

  return {
    async sendMessage(params: SendMessageParams): Promise<Message> {
      const session = await getOrCreateAgentSession(params.sessionId, params.workspaceCwd);

      try {
        // Switch to the requested model if specified
        if (params.modelId) {
          const model = findModelById(params.modelId);
          if (model) {
            await session.setModel(model);
          }
        }

        const images = params.attachments?.length
          ? params.attachments
              .filter((a) => a.mimeType.startsWith('image/') && a.data)
              .map((a) => ({
                type: 'image' as const,
                data: a.data,
                mimeType: a.mimeType,
              }))
          : undefined;
        await session.prompt(params.content, images?.length ? { images } : undefined);
      } catch (_err) {
        // Error surfaced via return value instead of throw
      }

      // Get session stats for cost/usage on the returned message
      let totalUsage: TokenUsage | undefined;
      try {
        const stats = session.getSessionStats();
        totalUsage = {
          inputTokens: stats.tokens.input,
          outputTokens: stats.tokens.output,
          totalTokens: stats.tokens.total,
          cacheReadTokens: stats.tokens.cacheRead,
          cacheWriteTokens: stats.tokens.cacheWrite,
          cost: stats.cost,
        };
      } catch { /* stats are best-effort */ }

      const asstMsg: AssistantMessage = {
        id: `msg-${Date.now()}-asst`,
        sessionId: params.sessionId,
        role: 'assistant',
        status: 'complete',
        modelId: params.modelId ?? 'unknown',
        content: session.getLastAssistantText() || '',
        blocks: [],
        usage: totalUsage,
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
      const session = await getOrCreateAgentSession(params.sessionId, params.workspaceCwd);
      const sessionKey = params.sessionId || 'default';

      // Guard to prevent writing to a closed SSE stream
      let streamActive = true;
      const safeChunk = (chunk: StreamChunk) => {
        if (streamActive) {
          try { onChunk(chunk); } catch { /* ignore write-after-end */ }
        }
      };

      // Timing tracking
      let messageStartTime = 0;
      let messageEndTime = 0;
      let outputText = '';
      const toolStartTimes = new Map<string, number>();

      const unsubscribe = session.subscribe((event: any) => {
        // Skip sending chunks if stream is already closed
        if (!streamActive) return;
        switch (event.type) {
          case 'message_start': {
            messageStartTime = Date.now();
            // Fall through to process content like message_update
          }
          // eslint-disable-next-line no-fallthrough
          case 'message_update': {
            const msg = event.message;
            if (msg && msg.content) {
              const content = msg.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    // block.text carries the full accumulated text, not a delta.
                    // Send as block type so the composer replaces instead of appends.
                    outputText = block.text;
                    safeChunk({
                      type: 'block',
                      block: {
                        id: `bt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                        type: 'text',
                        content: block.text,
                      },
                    });
                  } else if (block.type === 'image') {
                    // Image blocks in streaming — send as block for display
                    safeChunk({
                      type: 'block',
                      block: {
                        id: `b-img-${Date.now()}`,
                        type: 'image',
                        content: block.data || '',
                        mimeType: block.mimeType || 'image/png',
                        data: block.data || '',
                        width: block.width,
                        height: block.height,
                      },
                    });
                  } else if (block.type === 'thinking') {
                    safeChunk({
                      type: 'block',
                      block: {
                        id: `b-think-${Date.now()}`,
                        type: 'thinking',
                        content: block.thinking || '',
                        thinking: block.thinking,
                      },
                    });
                  } else if (block.type === 'toolCall' || block.type === 'tool_call') {
                    // Only emit tool_call from message_update if it has a toolCallId.
                    // Without an ID we can't dedup against tool_execution_start blocks,
                    // which would cause duplicate empty entries.
                    if (!block.toolCallId) break;
                    // block.input carries tool arguments from the SDK
                    const args = (block as any).input ?? (block as any).args;
                    safeChunk({
                      type: 'block',
                      block: {
                        id: `b-tc-${Date.now()}`,
                        type: 'tool_call',
                        content: block.name || 'tool',
                        toolCallId: block.toolCallId,
                        toolName: block.name || block.toolName,
                        args: typeof args === 'object' && args !== null ? args : undefined,
                      },
                    });
                  }
                }
              } else if (typeof content === 'string') {
                outputText += content;
                safeChunk({ type: 'text', content });
              }
            }
            break;
          }
          case 'tool_execution_start': {
            toolStartTimes.set(event.toolCallId, Date.now());
            safeChunk({
              type: 'block',
              block: {
                id: `b-te-${Date.now()}`,
                type: 'tool_call',
                content: event.toolName || 'tool execution',
                toolCallId: event.toolCallId,
                toolName: event.toolName,
                args: (event as any).args ?? undefined,
              },
            });
            break;
          }
          case 'tool_execution_end': {
            const startTime = toolStartTimes.get(event.toolCallId);
            const durationMs = startTime ? Date.now() - startTime : undefined;
            toolStartTimes.delete(event.toolCallId);

            // event.result is { content: Array<{type, text}>, isError: boolean }
            // Extract text from content blocks for display
            const rawResult = (event as any).result;
            let resultText: string;
            if (rawResult && typeof rawResult === 'object' && Array.isArray(rawResult.content)) {
              resultText = rawResult.content
                .filter((c: any) => c.type === 'text')
                .map((c: any) => c.text || '')
                .join('\n');
            } else if (typeof rawResult === 'string') {
              resultText = rawResult;
            } else {
              resultText = String(rawResult ?? '');
            }

            safeChunk({
              type: 'block',
              block: {
                id: `b-ter-${Date.now()}`,
                type: 'tool_result',
                content: event.isError ? `Error: ${resultText}` : resultText || 'Done',
                toolCallId: event.toolCallId,
                result: resultText,
                isError: (event as any).isError || rawResult?.isError || false,
              },
            });

            // Emit image blocks from tool result content
            if (rawResult && Array.isArray(rawResult.content)) {
              for (const c of rawResult.content as any[]) {
                if (c.type === 'image') {
                  safeChunk({
                    type: 'block',
                    block: {
                      id: `b-ter-img-${Date.now()}`,
                      type: 'image',
                      content: c.data || '',
                      mimeType: c.mimeType || 'image/png',
                      data: c.data || '',
                    },
                  });
                }
              }
            }

            // Emit tool timing
            if (durationMs !== undefined) {
              safeChunk({
                type: 'tool_timing',
                toolTiming: {
                  toolCallId: event.toolCallId,
                  toolName: event.toolName,
                  durationMs,
                },
              });
            }
            break;
          }
          case 'message_end': {
            messageEndTime = Date.now();
            // Forward usage data from the completed message
            const endMsg = event.message;
            const msgUsage = endMsg?.usage;
            if (msgUsage) {
              const tokenUsage = sdkUsageToTokenUsage(msgUsage);
              safeChunk({ type: 'usage', usage: tokenUsage });

              // Calculate per-message timing metrics
              const prevEndTime = sessionTimings.get(sessionKey) ?? 0;
              const thinkingTimeMs = prevEndTime > 0 ? Math.max(0, messageStartTime - prevEndTime) : 0;
              const generationTimeMs = Math.max(1, messageEndTime - messageStartTime);
              const outputTokens = tokenUsage.outputTokens || 0;
              const estTokens = Math.ceil(outputText.length / 4);
              const tps = outputTokens / (generationTimeMs / 1000);

              safeChunk({
                type: 'message_timing',
                messageTiming: {
                  estTokens,
                  tps: Math.round(tps * 10) / 10,
                  thinkingTimeMs,
                  generationTimeMs,
                },
              });

              // Update last message end time for this session
              sessionTimings.set(sessionKey, messageEndTime);
            }
            break;
          }
          case 'agent_end': {
            // Agent ended (may retry or finalize)
            if (!event.willRetry) {
              // Send context usage before done
              try {
                const ctxUsage = session.getContextUsage();
                if (ctxUsage) {
                  safeChunk({
                    type: 'context',
                    contextUsage: {
                      tokens: ctxUsage.tokens,
                      contextWindow: ctxUsage.contextWindow,
                      percent: ctxUsage.percent,
                    },
                  });
                }
              } catch { /* best-effort */ }

              // Send session stats before done
              try {
                const stats = session.getSessionStats();
                const ctxUsage = stats.contextUsage ?? session.getContextUsage();
                safeChunk({
                  type: 'stats',
                  sessionStats: {
                    tokens: {
                      input: stats.tokens.input,
                      output: stats.tokens.output,
                      cacheRead: stats.tokens.cacheRead,
                      cacheWrite: stats.tokens.cacheWrite,
                      total: stats.tokens.total,
                    },
                    cost: stats.cost,
                    contextUsage: ctxUsage
                      ? { tokens: ctxUsage.tokens, contextWindow: ctxUsage.contextWindow, percent: ctxUsage.percent }
                      : undefined,
                  },
                });
              } catch { /* best-effort */ }

              safeChunk({ type: 'done' });
            }
            break;
          }
        }
      });

      if (signal) {
        signal.addEventListener('abort', () => {
          streamActive = false;
          session.abort();
        }, { once: true });
      }

      try {
        // Switch to the requested model if specified
        if (params.modelId) {
          const model = findModelById(params.modelId);
          if (model) {
            await session.setModel(model);
          }
        }

        // Build image content array for vision models
        const images = params.attachments?.length
          ? params.attachments
              .filter((a) => a.mimeType.startsWith('image/') && a.data)
              .map((a) => ({
                type: 'image' as const,
                data: a.data,
                mimeType: a.mimeType,
              }))
          : undefined;

        await session.prompt(params.content, images?.length ? { images } : undefined);

        // Build final usage for returned message
        let totalUsage: TokenUsage | undefined;
        try {
          const stats = session.getSessionStats();
          totalUsage = {
            inputTokens: stats.tokens.input,
            outputTokens: stats.tokens.output,
            totalTokens: stats.tokens.total,
            cacheReadTokens: stats.tokens.cacheRead,
            cacheWriteTokens: stats.tokens.cacheWrite,
            cost: stats.cost,
          };
        } catch { /* stats are best-effort */ }

        const asstMsg: AssistantMessage = {
          id: `msg-${Date.now()}-asst`,
          sessionId: params.sessionId,
          role: 'assistant',
          status: 'complete',
          modelId: params.modelId ?? 'unknown',
          content: session.getLastAssistantText() || '',
          blocks: [],
          usage: totalUsage,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        streamActive = false;
        return asstMsg;
      } catch (err) {
        safeChunk({ type: 'error', error: err instanceof Error ? err.message : 'Unknown error' });
        throw err;
      } finally {
        streamActive = false;
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
