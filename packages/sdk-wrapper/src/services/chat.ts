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

export interface NavigateTreeOptions {
  /** If true, AI summarizes the abandoned branch before switching */
  summarize?: boolean;
  /** Custom instructions for the summary prompt */
  customInstructions?: string;
  /** Label to attach to the branch summary entry */
  label?: string;
}

export interface NavigateTreeResult {
  /** Text content of the target user message (for pre-filling editor) */
  editorText?: string;
  /** Whether the user cancelled the operation */
  cancelled: boolean;
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
  /**
   * Navigate to a different node in the session tree.
   * Moves the leaf pointer to the target entry so the next prompt creates a new branch.
   * @param sessionId - Session ID
   * @param entryId - Raw entry ID from SessionManager (the entryId field on a Message)
   * @param options - Navigation options (summarize, label, etc.)
   */
  navigateTree(sessionId: string, entryId: string, options?: NavigateTreeOptions): Promise<NavigateTreeResult>;
}
