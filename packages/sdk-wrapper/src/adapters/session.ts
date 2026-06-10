import type { Session, SessionWithMessages, Message, ContentBlock, AssistantMessage, SessionTreeNode, SessionTreeResult, TreeNodeToolCall } from '@pi/types';
import type { SessionService } from '../services/session.js';
import {
  SessionManager,
  type SessionMessageEntry,
  type SessionEntry,
  type SessionInfo,
} from '@earendil-works/pi-coding-agent';
import { existsSync, unlinkSync } from 'fs';

function extractTitleFromMessage(msg: any): string | undefined {
  const content = msg.content;
  if (typeof content === 'string') {
    return content.slice(0, 60);
  }
  if (Array.isArray(content)) {
    for (const block of content) {
      if (block?.type === 'text' && block.text) {
        return String(block.text).slice(0, 60);
      }
    }
  }
  if (content && typeof content === 'object' && (content as any).text) {
    return String((content as any).text).slice(0, 60);
  }
  return undefined;
}

// === Conversion: SessionInfo → our Session type ===
function toSession(info: SessionInfo): Session {
  return {
    id: info.path,
    workspaceId: info.cwd,
    title: info.name || info.firstMessage.slice(0, 60) || 'Untitled',
    status: 'active',
    messageCount: info.messageCount,
    lastMessageAt: info.modified.toISOString(),
    createdAt: info.created.toISOString(),
    updatedAt: info.modified.toISOString(),
  };
}

/** Extract readable text from a content block or array of content blocks.
 *  pi-ai ToolResultMessage.content is (TextContent | ImageContent)[], not a plain string. */
function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .filter((c: any) => c.type === 'text')
      .map((c: any) => c.text || '')
      .join('\n');
  }
  return JSON.stringify(content);
}

// === Conversion: AgentMessage → ContentBlock[] ===
type AgentMessage = SessionMessageEntry['message'];

function agentMessageToBlocks(msg: any): ContentBlock[] {
  const blocks: ContentBlock[] = [];

  if (msg.role === 'user') {
    if (typeof msg.content === 'string') {
      blocks.push({
        id: `b-${msg.timestamp || Date.now()}`,
        type: 'text',
        content: msg.content,
      });
    } else if (Array.isArray(msg.content)) {
      for (const c of msg.content as any[]) {
        if (c.type === 'text') {
          blocks.push({
            id: `b-text-${msg.timestamp || Date.now()}-${blocks.length}`,
            type: 'text',
            content: c.text || '',
          });
        } else if (c.type === 'image') {
          blocks.push({
            id: `b-img-${msg.timestamp || Date.now()}-${blocks.length}`,
            type: 'image',
            content: '',
            mimeType: c.mimeType || 'image/png',
            data: c.data || '',
          });
        }
      }
    }
  } else if (msg.role === 'assistant') {
    const content = msg.content;
    if (Array.isArray(content)) {
      for (let i = 0; i < content.length; i++) {
        const block = content[i] as any;
        if (block.type === 'text') {
          blocks.push({
            id: `b-text-${msg.timestamp || Date.now()}-${i}`,
            type: 'text',
            content: block.text || '',
          });
        } else if (block.type === 'toolCall' || block.type === 'tool_call') {
          // pi-ai uses `arguments` (not `args` or `input`) and `id` (not `toolCallId`)
          blocks.push({
            id: `b-tool-${msg.timestamp || Date.now()}-${i}`,
            type: 'tool_call',
            content: `Calling ${block.name || block.toolName || 'tool'}`,
            toolCallId: block.id || block.toolCallId || `tc-${i}`,
            toolName: block.name || block.toolName,
            args: block.arguments || block.args || block.input || {},
          });
        } else if (block.type === 'toolResult' || block.type === 'tool_result') {
          const resultContent = extractTextFromContent(block.content);
          blocks.push({
            id: `b-tr-${msg.timestamp || Date.now()}-${i}`,
            type: 'tool_result',
            content: resultContent,
            toolCallId: block.toolCallId || `tc-${i}`,
            result: resultContent,
            isError: block.isError,
          });
          // If the tool result content also contains images, produce image blocks
          if (Array.isArray(block.content)) {
            for (const c of block.content as any[]) {
              if (c.type === 'image') {
                blocks.push({
                  id: `b-tr-img-${msg.timestamp || Date.now()}-${i}`,
                  type: 'image',
                  content: c.data || '',
                  mimeType: c.mimeType || 'image/png',
                  data: c.data || '',
                });
              }
            }
          }
        } else if (block.type === 'thinking') {
          blocks.push({
            id: `b-think-${msg.timestamp || Date.now()}-${i}`,
            type: 'thinking',
            content: block.thinking || block.text || '',
            thinking: block.thinking || block.text || '',
            duration: block.duration,
          });
        } else if (block.type === 'image') {
          blocks.push({
            id: `b-img-${msg.timestamp || Date.now()}-${i}`,
            type: 'image',
            content: block.data || '',
            mimeType: block.mimeType || 'image/png',
            data: block.data || '',
            width: block.width,
            height: block.height,
          });
        }
      }
    } else if (typeof content === 'string') {
      blocks.push({
        id: `b-text-${msg.timestamp || Date.now()}-0`,
        type: 'text',
        content,
      });
    }
  } else if (msg.role === 'toolResult' || msg.role === 'tool_result') {
    const content = extractTextFromContent(msg.content);
    blocks.push({
      id: `b-tr-${msg.timestamp || Date.now()}`,
      type: 'tool_result',
      content,
      toolCallId: msg.toolCallId || 'unknown',
      result: content,
      isError: msg.isError,
    });
  } else if (msg.role === 'bashExecution') {
    blocks.push({
      id: `b-bash-${msg.timestamp || Date.now()}`,
      type: 'text',
      content: `Bash: ${msg.command}\nOutput: ${msg.output}`,
    });
  } else if (msg.role === 'compactionSummary') {
    blocks.push({
      id: `b-compact-${msg.timestamp || Date.now()}`,
      type: 'text',
      content: msg.summary || '',
    });
  } else if (msg.role === 'branchSummary') {
    blocks.push({
      id: `b-branch-${msg.timestamp || Date.now()}`,
      type: 'text',
      content: msg.summary || '',
    });
  }

  return blocks;
}

// === Conversion: AgentMessage → our Message type ===
function toMessage(msg: any, sessionId: string, index: number): Message | null {
  const blocks = agentMessageToBlocks(msg);
  if (blocks.length === 0) return null;

  const id = `msg-${sessionId}-${index}`;
  const content = blocks.map((b) => b.content).join('\n\n');
  const timestamp = msg.timestamp
    ? new Date(msg.timestamp).toISOString()
    : new Date().toISOString();

  if (msg.role === 'user') {
    return {
      id,
      sessionId,
      role: 'user',
      status: 'complete',
      content,
      blocks,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  } else if (msg.role === 'assistant') {
    return {
      id,
      sessionId,
      role: 'assistant',
      status: 'complete',
      modelId: msg.model || 'unknown',
      content,
      blocks,
      createdAt: timestamp,
      updatedAt: timestamp,
      usage: msg.usage ? {
        inputTokens: msg.usage.input ?? msg.usage.inputTokens ?? 0,
        outputTokens: msg.usage.output ?? msg.usage.outputTokens ?? 0,
        totalTokens: msg.usage.totalTokens ?? (msg.usage.input ?? 0) + (msg.usage.output ?? 0),
        cacheReadTokens: msg.usage.cacheRead ?? msg.usage.cacheReadTokens ?? 0,
        cacheWriteTokens: msg.usage.cacheWrite ?? msg.usage.cacheWriteTokens ?? 0,
        cost: msg.usage.cost?.total ?? 0,
      } : undefined,
    } as AssistantMessage;
  }

  // For non-standard messages (bash, system, custom, compaction, branch)
  return {
    id,
    sessionId,
    role: 'system',
    status: 'complete',
    content,
    blocks,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function isSessionMessageEntry(e: SessionEntry): e is SessionMessageEntry {
  return e.type === 'message';
}

// === Conversion: SDK SessionTreeNode → our SessionTreeNode ===
function extractPreview(entry: any): string | undefined {
  if (entry.type === 'message' && entry.message) {
    const msg = entry.message;
    const content = typeof msg.content === 'string'
      ? msg.content
      : Array.isArray(msg.content)
        ? msg.content.map((c: any) => (c.text || '')).join(' ')
        : '';
    return content.slice(0, 60);
  }
  if (entry.type === 'model_change') {
    return `${entry.provider}/${entry.modelId}`;
  }
  if (entry.type === 'thinking_level_change') {
    return entry.thinkingLevel || '';
  }
  if (entry.type === 'compaction' || entry.type === 'branch_summary') {
    return (entry.summary || '').slice(0, 60);
  }
  if (entry.type === 'session_info' && entry.name) {
    return entry.name;
  }
  if (entry.type === 'label') {
    return entry.label || entry.targetId;
  }
  if (entry.type === 'custom' || entry.type === 'custom_message') {
    return entry.customType || entry.type;
  }
  return undefined;
}

function extractToolAndThinking(msg: any): {
  toolCount: number;
  toolCalls: TreeNodeToolCall[];
  hasThinking: boolean;
  thinkingDuration?: number;
} {
  let toolCount = 0;
  const toolCalls: TreeNodeToolCall[] = [];
  let hasThinking = false;
  let thinkingDuration: number | undefined;

  const content = msg.content;
  if (!Array.isArray(content)) return { toolCount, toolCalls, hasThinking };

  for (const block of content) {
    if (block.type === 'toolCall' || block.type === 'tool_call') {
      toolCount++;
      // pi-ai uses `arguments` (not `args`/`input`) and `id` (not `toolCallId`)
      const args = block.arguments || block.args || block.input || {};
      const argsPreview = typeof args === 'object'
        ? JSON.stringify(args).slice(0, 80)
        : String(args).slice(0, 80);
      toolCalls.push({
        toolCallId: block.id || block.toolCallId || `tc-${toolCount}`,
        toolName: block.name || block.toolName || 'unknown',
        argsPreview,
      });
    } else if (block.type === 'toolResult' || block.type === 'tool_result') {
      // Match tool result to its call and add result info
      const matchingCall = toolCalls.find((tc) => tc.toolCallId === block.toolCallId);
      if (matchingCall) {
        const resultContent = typeof block.content === 'string' ? block.content : JSON.stringify(block.content);
        matchingCall.resultPreview = resultContent.slice(0, 100);
        matchingCall.isError = block.isError;
      }
    } else if (block.type === 'thinking') {
      hasThinking = true;
      if (typeof block.duration === 'number') {
        thinkingDuration = (thinkingDuration ?? 0) + block.duration;
      }
    }
  }

  return { toolCount, toolCalls, hasThinking, thinkingDuration };
}

function toSessionTreeNode(node: any): SessionTreeNode {
  const entry = node.entry as any;
  const result: SessionTreeNode = {
    id: entry.id,
    parentId: entry.parentId ?? null,
    type: entry.type,
    timestamp: entry.timestamp || '',
    label: node.label,
    children: (node.children || []).map(toSessionTreeNode),
    preview: extractPreview(entry),
  };

  if (entry.type === 'message' && entry.message) {
    result.role = entry.message.role === 'user' ? 'user' : 'assistant';
    // Extract tool and thinking info from message content
    if (entry.message.role === 'assistant') {
      const info = extractToolAndThinking(entry.message);
      if (info.toolCount > 0) {
        result.toolCount = info.toolCount;
        result.toolCalls = info.toolCalls;
      }
      if (info.hasThinking) {
        result.hasThinking = true;
        result.thinkingDuration = info.thinkingDuration;
      }
    }
  }
  if (entry.type === 'model_change') {
    result.provider = entry.provider;
    result.modelId = entry.modelId;
  }
  if (entry.type === 'thinking_level_change') {
    result.thinkingLevel = entry.thinkingLevel;
  }
  if (entry.type === 'compaction' || entry.type === 'branch_summary') {
    result.summary = entry.summary;
  }
  if (entry.type === 'custom' || entry.type === 'custom_message') {
    result.customType = entry.customType;
  }

  return result;
}

export function createRealSessionService(): SessionService {
  return {
    async list(workspaceId: string): Promise<Session[]> {
      try {
        const sessions = await SessionManager.list(workspaceId);
        return sessions.map(toSession);
      } catch {
        return [];
      }
    },

    async get(id: string): Promise<SessionWithMessages> {
      let sm: SessionManager;
      try {
        sm = SessionManager.open(id);
      } catch {
        throw new Error(`Session not found: ${id}`);
      }

      const header = sm.getHeader();
      const entries = sm.getEntries();
      const messageEntries = entries.filter(isSessionMessageEntry);

      // Build messages, merging tool_result entries into their preceding assistant message.
      // This ensures the renderBlocks pairing in message-bubble.tsx can correctly
      // pair tool_call blocks with their results within a single message.
      const messages: Message[] = [];
      let msgIndex = 0;

      for (const entry of messageEntries) {
        const rawMsg = entry.message;

        // Merge toolResult into the preceding assistant message
        if (rawMsg.role === 'toolResult') {
          const lastMsg = messages[messages.length - 1];
          if (lastMsg && lastMsg.role === 'assistant') {
            const toolBlocks = agentMessageToBlocks(rawMsg);
            if (toolBlocks.length > 0) {
              lastMsg.blocks.push(...toolBlocks);
              lastMsg.content += '\n' + (toolBlocks[0]?.content || '');
              // Update timestamp to reflect the tool result's time
              if (rawMsg.timestamp) {
                const ts = new Date(rawMsg.timestamp).toISOString();
                lastMsg.updatedAt = ts;
              }
            }
          }
          continue;
        }

        const message = toMessage(rawMsg, id, msgIndex++);
        if (message) messages.push(message);
      }

      const cwd = header?.cwd || sm.getCwd();
      const sessionName = sm.getSessionName();
      const title = (typeof sessionName === 'string' && sessionName ? sessionName : undefined)
        || (messageEntries.length > 0 ? extractTitleFromMessage(messageEntries[0].message) : undefined)
        || 'Untitled';

      // Use header timestamp if available
      const createdAt = header?.timestamp
        ? new Date(header.timestamp).toISOString()
        : new Date().toISOString();

      return {
        id,
        workspaceId: cwd,
        title,
        status: 'active',
        messageCount: messages.length,
        lastMessageAt: messages.length > 0 ? messages[messages.length - 1].createdAt : null,
        createdAt,
        updatedAt: messages.length > 0 ? messages[messages.length - 1].createdAt : createdAt,
        messages,
      };
    },

    async create(workspaceId: string, title?: string): Promise<Session> {
      const sm = SessionManager.create(workspaceId);
      if (title) {
        sm.appendSessionInfo(title);
      }
      const file = sm.getSessionFile();
      return {
        id: file || `sess-${sm.getSessionId()}`,
        workspaceId,
        title: title ?? 'New Session',
        status: 'active',
        messageCount: 0,
        lastMessageAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },

    async delete(id: string): Promise<void> {
      if (existsSync(id)) {
        unlinkSync(id);
      }
    },

    async archive(id: string): Promise<Session> {
      return this.get(id);
    },

    async unarchive(id: string): Promise<Session> {
      return this.get(id);
    },

    async updateTitle(id: string, title: string): Promise<Session> {
      try {
        const sm = SessionManager.open(id);
        sm.appendSessionInfo(title);
        return this.get(id);
      } catch {
        throw new Error(`Session not found: ${id}`);
      }
    },

    async getTree(id: string): Promise<SessionTreeResult> {
      let sm: SessionManager;
      try {
        sm = SessionManager.open(id);
      } catch {
        throw new Error(`Session not found: ${id}`);
      }

      const sdkNodes = sm.getTree();
      const leafId = sm.getLeafId();
      const nodes = sdkNodes.map(toSessionTreeNode);

      return {
        sessionId: sm.getSessionId(),
        leafId,
        nodes,
      };
    },
  };
}
