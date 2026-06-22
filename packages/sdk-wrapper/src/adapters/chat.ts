import * as fs from 'fs';
import * as path from 'path';
import type { ChatService, SendMessageParams, StreamChunk } from '../services/chat.js';
import type { Message, AssistantMessage, ContentBlock, TokenUsage, ContextUsageInfo, SessionStatsInfo, MessageTiming } from '@pi/types';
import { createAgentSession, SessionManager, ModelRegistry, AuthStorage, DefaultResourceLoader, getAgentDir, SettingsManager } from '@earendil-works/pi-coding-agent';
import type { AgentSession } from '@earendil-works/pi-coding-agent';

/**
 * Real chat adapter using createAgentSessionFromServices.
 *
 * Creates interactive AgentSession instances backed by the real SDK.
 * For existing sessions, opens via SessionManager and attaches to AgentSession.
 * For new sessions, creates via SessionManager.create().
 */
export function createRealChatService(cwd: string, modelRegistry?: ModelRegistry, settingsManager?: SettingsManager): ChatService {
  const activeSessions = new Map<string, { session: AgentSession; unsubscribe: () => void; cwd: string; skills?: string[] }>();
  // Track last message end time per session for thinking time calculation
  const sessionTimings = new Map<string, number>();

  // Shared ModelRegistry — picks up built-in models + models from ~/.pi/agent/models.json
  const registry = modelRegistry ?? ModelRegistry.create(AuthStorage.inMemory());

  /** Find a model in the registry by its ID string.
   *  Supports "provider/modelId" format for disambiguation.
   *  When multiple models share the same ID, prefers models with configured
   *  auth (from models.json or env vars) over built-in ones without auth. */
  function findModelById(modelId: string) {
    const slashIdx = modelId.lastIndexOf('/');
    if (slashIdx > 0) {
      const provider = modelId.substring(0, slashIdx);
      const id = modelId.substring(slashIdx + 1);
      return registry.getAvailable().find((m) => m.id === id && m.provider === provider);
    }
    // Only return models that have configured auth (API key or OAuth)
    const available = registry.getAvailable();
    for (let i = available.length - 1; i >= 0; i--) {
      if (available[i].id === modelId) return available[i];
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

  /** Map file extension to MIME type */
  function getMimeType(filePath: string): string {
    const ext = path.extname(filePath).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.txt': 'text/plain',
      '.md': 'text/markdown',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'text/javascript',
      '.ts': 'text/typescript',
      '.jsx': 'text/javascript',
      '.tsx': 'text/typescript',
      '.json': 'application/json',
      '.xml': 'text/xml',
      '.yaml': 'application/x-yaml',
      '.yml': 'application/x-yaml',
      '.py': 'text/x-python',
      '.rs': 'text/x-rust',
      '.go': 'text/x-go',
      '.java': 'text/x-java',
      '.c': 'text/x-c',
      '.cpp': 'text/x-c++',
      '.h': 'text/x-c',
      '.sh': 'application/x-sh',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.mp3': 'audio/mpeg',
      '.wav': 'audio/wav',
      '.mp4': 'video/mp4',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      '.zip': 'application/zip',
    };
    return mimeMap[ext] || 'application/octet-stream';
  }

  /**
   * Extract <think>...</think> tags from text content.
   * Some models (Minimax, DeepSeek-R1) return thinking content as XML tags
   * in the text stream rather than as structured reasoning_content blocks.
   *
   * Returns the extracted thinking content (null if none) and the text
   * with think tags stripped.
   *
   * Handles streaming partials:
   *  - Incomplete <think> (no closing tag): all content treated as thinking
   *  - Complete <think>...</think>: thinking extracted, text cleaned
   *  - No think tag: thinking=null, text=original
   */
  function extractThinkContent(text: string): { thinking: string | null; text: string } {
    // Fast path: no opening tag at all
    if (!text.includes('<think>')) {
      return { thinking: null, text };
    }

    const thinkRegex = /<think>([\s\S]*?)(?:<\/think>|$)/g;
    let thinking = '';
    const textParts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = thinkRegex.exec(text)) !== null) {
      // Text before this think block
      textParts.push(text.slice(lastIndex, match.index));
      // Thinking content
      thinking += (thinking ? '\n' : '') + match[1];
      lastIndex = match.index + match[0].length;
    }
    // Remaining text after last think block
    textParts.push(text.slice(lastIndex));

    const cleanText = textParts.join('').trim();
    return {
      thinking: thinking.trim() || null,
      text: cleanText,
    };
  }

  /** Detect file paths written by tools, returning existing files with stats */
  function detectWrittenFiles(
    toolName: string,
    args: Record<string, unknown> | undefined,
    resultText: string,
    workspaceCwd: string | undefined,
  ): Array<{ absPath: string; relPath: string; size: number; mimeType: string }> {
    const files: Array<{ absPath: string; relPath: string; size: number; mimeType: string }> = [];
    const cwd = workspaceCwd || process.cwd();

    // Helper to try adding a file candidate
    const tryAdd = (candidate: string) => {
      if (!candidate) return;
      const absPath = path.isAbsolute(candidate) ? candidate : path.resolve(cwd, candidate);
      if (!fs.existsSync(absPath)) return;
      const stat = fs.statSync(absPath);
      if (!stat.isFile()) return;
      if (files.some((f) => f.absPath === absPath)) return;
      const relPath = path.relative(cwd, absPath);
      // Only include files under the workspace
      if (relPath.startsWith('..')) return;
      files.push({ absPath, relPath, size: stat.size, mimeType: getMimeType(absPath) });
    };

    // Known file-writing/editing tools: extract path from args (precise, no regex)
    const WRITE_TOOLS = new Set([
      'write', 'write_to_file', 'Write',
      'Edit', 'mcp__filesystem__edit_file',
      'mcp__filesystem__write_file',
    ]);
    if (WRITE_TOOLS.has(toolName) && args) {
      const filePath = (args as any).path || (args as any).filePath || (args as any).file_path;
      if (filePath && typeof filePath === 'string') {
        tryAdd(filePath);
        return files;
      }
    }

    // For other tools (Bash, etc.): parse result text for file paths.
    // Only match paths with explicit file-creation context (not any whitespace)
    // to avoid picking up filenames from ls output, build logs, or error messages.
    // Uses the 'u' flag for Unicode filename support (Chinese, etc.).
    if (resultText && cwd) {
      const creationPrefix = '(?:^|created[:,]?\\s+|created\\s+at\\s+|saved\\s+(?:to\\s+)?|written\\s+(?:to\\s+)?|generated[:,]?\\s+|wrote[:,]?\\s+|exported[:,]?\\s+|:\\s*|已生成\\S*\\s*[：:]\\s*|生成\\S*\\s*[：:]\\s*)';
      const pathPart = '[\\p{L}\\w\\-./]+\\.\\w{2,6}|\\/[\\p{L}\\w\\-./\\\\ ]+\\.\\w{2,6}';
      const pathPattern = new RegExp(`(?<=${creationPrefix})(${pathPart})\\b`, 'giu');
      let match;
      while ((match = pathPattern.exec(resultText)) !== null) {
        tryAdd(match[1].trim());
      }
    }

    return files;
  }

  async function createResourceLoader(workCwd: string, selectedSkillIds?: string[]) {
    const resourceLoader = new DefaultResourceLoader({
      cwd: workCwd,
      agentDir: getAgentDir(),
      appendSystemPrompt: [
        'You are equipped with vision capabilities. When users attach images or when the read tool loads image files, analyze the visual content directly. This includes: screenshots of code/errors, UI designs, architecture diagrams, charts, photos, and any other images the user shares. Describe what you see clearly and use it to provide better coding assistance.',
      ],
      skillsOverride: selectedSkillIds
        ? (base) => {
            const enabledNames = new Set(
              selectedSkillIds.map((id) => id.startsWith('skill-') ? id.slice(6) : id),
            );
            return {
              skills: base.skills.filter((s) => enabledNames.has(s.name)),
              diagnostics: base.diagnostics,
            };
          }
        : undefined,
    });
    await resourceLoader.reload();
    return resourceLoader;
  }

  async function getOrCreateAgentSession(
    sessionId?: string,
    workspaceCwd?: string,
    skills?: string[],
  ): Promise<AgentSession> {
    const key = sessionId || 'default';
    const workCwd = workspaceCwd || cwd;

    // If a cached session exists, return it directly unless the caller provided
    // an explicit workspaceCwd that differs from the session's cwd (e.g. user
    // switched workspaces) or skills changed. steer/followUp/navigateTree don't
    // pass workspaceCwd or skills, so they safely reuse the existing session.
    const cached = activeSessions.get(key);
    if (cached) {
      const skillsChanged = skills && !cached.skills
        ? true
        : skills && cached.skills
          ? skills.length !== cached.skills.length || !skills.every((s) => cached.skills!.includes(s))
          : false;
      if ((!workspaceCwd || cached.cwd === workspaceCwd) && !skillsChanged) {
        return cached.session;
      }
      // cwd or skills mismatch — tear down the old session and create a new one
      cached.unsubscribe();
      activeSessions.delete(key);
    }
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
      modelRegistry: registry, // share registry so custom models are visible
      resourceLoader: await createResourceLoader(workCwd, skills),
      settingsManager,         // share settings so shell path is respected
    });

    const unsubscribe = session.subscribe((_event) => {
      // Events are handled at the call site level
    });

    activeSessions.set(key, { session, unsubscribe, cwd: workCwd, skills });
    return session;
  }

  return {
    async sendMessage(params: SendMessageParams): Promise<Message> {
      const session = await getOrCreateAgentSession(params.sessionId, params.workspaceCwd, params.skills);

      try {
        // Switch to the requested model if specified
        if (params.modelId) {
          const model = findModelById(params.modelId);
          if (!model) {
            throw new Error(`Model "${params.modelId}" not found. Please configure a valid model in Settings or set the correct API key environment variable.`);
          }
          await session.setModel(model);
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
      } catch (err) {
        throw new Error(err instanceof Error ? err.message : 'Failed to send message');
      }
    },

    async sendMessageStream(
      params: SendMessageParams,
      onChunk: (chunk: StreamChunk) => void,
      signal?: AbortSignal,
    ): Promise<Message> {
      const session = await getOrCreateAgentSession(params.sessionId, params.workspaceCwd, params.skills);
      const sessionKey = params.sessionId || 'default';
      const workspaceCwd = params.workspaceCwd;

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
      let thinkingBlockId: string | null = null; // stable ID per message turn
      let textBlockId: string | null = null; // stable ID per message turn
      const toolStartTimes = new Map<string, number>();
      const toolArgs = new Map<string, Record<string, unknown>>();

      const unsubscribe = session.subscribe((event: any) => {
        // Skip sending chunks if stream is already closed
        if (!streamActive) return;
        switch (event.type) {
          case 'message_start': {
            messageStartTime = Date.now();
            thinkingBlockId = null; // reset for new turn
            textBlockId = null; // reset for new turn
            // Signal frontend that a new message group is starting,
            // so it creates fresh blocks instead of overwriting prior group.
            safeChunk({ type: 'message_start' });
            break;
          }
          case 'message_update': {
            const msg = event.message;
            if (msg && msg.content) {
              const content = msg.content;
              if (Array.isArray(content)) {
                for (const block of content) {
                  if (block.type === 'text' && block.text) {
                    // block.text carries the full accumulated text, not a delta.
                    outputText = block.text;

                    // Extract <think>...</think> tags from text (Minimax, DeepSeek-R1).
                    // These models return thinking content as XML tags in the text stream
                    // rather than structured reasoning_content blocks.
                    const thinkResult = extractThinkContent(block.text);

                    // Emit thinking block when think content is present
                    if (thinkResult.thinking !== null) {
                      if (!thinkingBlockId) {
                        thinkingBlockId = `b-think-${Date.now()}`;
                      }
                      safeChunk({
                        type: 'block',
                        block: {
                          id: thinkingBlockId,
                          type: 'thinking',
                          content: thinkResult.thinking,
                          thinking: thinkResult.thinking,
                        },
                      });
                    }

                    // Always emit text block with think tags stripped (may be empty during thinking phase)
                    if (!textBlockId) textBlockId = `bt-stream-${Date.now()}`;
                    safeChunk({
                      type: 'block',
                      block: {
                        id: textBlockId,
                        type: 'text',
                        content: thinkResult.text,
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
                    if (!thinkingBlockId) {
                      thinkingBlockId = `b-think-${Date.now()}`;
                    }
                    safeChunk({
                      type: 'block',
                      block: {
                        id: thinkingBlockId,
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
                    // Store args for file detection in tool_execution_end
                    if (block.toolCallId && args) {
                      toolArgs.set(block.toolCallId, typeof args === 'object' ? args : undefined);
                    }
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
            toolArgs.set(event.toolCallId, (event as any).args);
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
            const storedArgs = toolArgs.get(event.toolCallId);
            toolStartTimes.delete(event.toolCallId);
            toolArgs.delete(event.toolCallId);

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

            // Emit file blocks for files written by tools
            const effectiveArgs = storedArgs || (event as any).args;
            if (!event.isError && effectiveArgs) {
              const writtenFiles = detectWrittenFiles(
                event.toolName,
                effectiveArgs,
                resultText,
                workspaceCwd,
              );
              for (const file of writtenFiles) {
                safeChunk({
                  type: 'block',
                  block: {
                    id: `b-ter-file-${file.relPath}`,
                    type: 'file',
                    content: path.basename(file.absPath),
                    mimeType: file.mimeType,
                    fileName: path.basename(file.absPath),
                    fileSize: file.size,
                    workspacePath: file.absPath,
                  },
                });
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
          case 'queue_update': {
            safeChunk({
              type: 'queue_update',
              queueState: {
                steering: Array.isArray(event.steering) ? event.steering : [],
                followUp: Array.isArray(event.followUp) ? event.followUp : [],
              },
            });
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
          if (!model) {
            const errMsg = `Model "${params.modelId}" not found. Please configure a valid model in Settings or set the correct API key environment variable.`;
            safeChunk({ type: 'error', error: errMsg });
            throw new Error(errMsg);
          }
          await session.setModel(model);
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

    async stopGeneration(sessionId?: string): Promise<void> {
      if (sessionId) {
        const entry = activeSessions.get(sessionId);
        if (entry) {
          try { await entry.session.abort(); } catch { /* ignore */ }
          entry.unsubscribe();
          activeSessions.delete(sessionId);
        }
        return;
      }
      // Abort all active sessions (backward compatibility)
      for (const [, { session }] of activeSessions) {
        try {
          await session.abort();
        } catch { /* ignore */ }
      }
      activeSessions.clear();
    },

    async steer(sessionId: string, content: string, images?: { name: string; mimeType: string; data: string }[]): Promise<void> {
      const session = await getOrCreateAgentSession(sessionId);
      await session.steer(content, images?.length ? images.map((img) => ({
        type: 'image' as const,
        data: img.data,
        mimeType: img.mimeType,
      })) : undefined);
    },

    async followUp(sessionId: string, content: string, images?: { name: string; mimeType: string; data: string }[]): Promise<void> {
      const session = await getOrCreateAgentSession(sessionId);
      await session.followUp(content, images?.length ? images.map((img) => ({
        type: 'image' as const,
        data: img.data,
        mimeType: img.mimeType,
      })) : undefined);
    },

    async navigateTree(sessionId: string, entryId: string, options?: { summarize?: boolean; customInstructions?: string; label?: string }): Promise<{ editorText?: string; cancelled: boolean }> {
      const session = await getOrCreateAgentSession(sessionId);
      const result = await session.navigateTree(entryId, options);
      return { editorText: result.editorText, cancelled: result.cancelled };
    },
  };
}
