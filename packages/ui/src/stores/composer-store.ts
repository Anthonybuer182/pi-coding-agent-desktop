import { create } from 'zustand';
import type { Attachment, ContentBlock, TokenUsage, ContextUsageInfo, SessionStatsInfo, MessageTiming, ToolTiming } from '@pi/types';

interface ComposerState {
  value: string;
  cursorPosition: number;
  isStreaming: boolean;
  isDragging: boolean;
  showSlashMenu: boolean;
  showMentionMenu: boolean;
  slashQuery: string;
  mentionQuery: string;
  pendingAttachments: Attachment[];
  uploadProgress: Record<string, number>;
  abortController: AbortController | null;
  streamingBlocks: ContentBlock[];
  streamingUsage: TokenUsage | null;
  contextUsage: ContextUsageInfo | null;
  sessionStats: SessionStatsInfo | null;
  messageTiming: MessageTiming | null;
  toolTimings: Map<string, number>;

  setValue: (value: string) => void;
  setCursorPosition: (pos: number) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  setShowSlashMenu: (show: boolean, query?: string) => void;
  setShowMentionMenu: (show: boolean, query?: string) => void;
  addAttachment: (attachment: Attachment) => void;
  /** Update an attachment with base64 file data after FileReader completes */
  updateAttachmentData: (id: string, data: string) => void;
  removeAttachment: (id: string) => void;
  setUploadProgress: (id: string, progress: number) => void;
  clearUploadProgress: () => void;
  setAbortController: (controller: AbortController | null) => void;
  clearAttachments: () => void;
  addStreamingBlock: (block: ContentBlock) => void;
  updateStreamingBlock: (id: string, updates: Partial<ContentBlock>) => void;
  clearStreamingBlocks: () => void;
  setStreamingUsage: (usage: TokenUsage | null) => void;
  setContextUsage: (ctx: ContextUsageInfo | null) => void;
  setSessionStats: (stats: SessionStatsInfo | null) => void;
  setMessageTiming: (timing: MessageTiming | null) => void;
  setToolTiming: (timing: ToolTiming) => void;
  reset: () => void;
}

export const useComposerStore = create<ComposerState>((set) => ({
  value: '',
  cursorPosition: 0,
  isStreaming: false,
  isDragging: false,
  showSlashMenu: false,
  showMentionMenu: false,
  slashQuery: '',
  mentionQuery: '',
  pendingAttachments: [],
  uploadProgress: {},
  abortController: null,
  streamingBlocks: [],
  streamingUsage: null,
  contextUsage: null,
  sessionStats: null,
  messageTiming: null,
  toolTimings: new Map(),

  setSessionStats: (sessionStats) => set({ sessionStats }),
  setMessageTiming: (messageTiming) => set({ messageTiming }),
  setToolTiming: (timing) =>
    set((s) => ({
      toolTimings: new Map(s.toolTimings).set(timing.toolCallId, timing.durationMs),
    })),

  setValue: (value) => set({ value }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setIsDragging: (isDragging) => set({ isDragging }),
  setShowSlashMenu: (show, query = '') => set({ showSlashMenu: show, slashQuery: query }),
  setShowMentionMenu: (show, query = '') => set({ showMentionMenu: show, mentionQuery: query }),
  addAttachment: (attachment) =>
    set((s) => ({ pendingAttachments: [...s.pendingAttachments, attachment] })),
  updateAttachmentData: (id, data) =>
    set((s) => ({
      pendingAttachments: s.pendingAttachments.map((a) =>
        a.id === id ? { ...a, data, status: 'ready' as const } : a,
      ),
    })),
  removeAttachment: (id) =>
    set((s) => ({ pendingAttachments: s.pendingAttachments.filter((a) => a.id !== id) })),
  setUploadProgress: (id, progress) =>
    set((s) => ({ uploadProgress: { ...s.uploadProgress, [id]: progress } })),
  clearUploadProgress: () => set({ uploadProgress: {} }),
  setAbortController: (abortController) => set({ abortController }),
  clearAttachments: () => set({ pendingAttachments: [], uploadProgress: {} }),
  addStreamingBlock: (block) =>
    set((s) => ({ streamingBlocks: [...s.streamingBlocks, block] })),
  updateStreamingBlock: (id, updates) =>
    set((s) => ({
      streamingBlocks: s.streamingBlocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      ),
    })),
  clearStreamingBlocks: () => set({ streamingBlocks: [] }),
  setStreamingUsage: (streamingUsage) => set({ streamingUsage }),
  setContextUsage: (contextUsage) => set({ contextUsage }),
  reset: () =>
    set({
      value: '',
      cursorPosition: 0,
      isStreaming: false,
      isDragging: false,
      showSlashMenu: false,
      showMentionMenu: false,
      slashQuery: '',
      mentionQuery: '',
      pendingAttachments: [],
      uploadProgress: {},
      abortController: null,
      streamingBlocks: [],
      streamingUsage: null,
      contextUsage: null,
      sessionStats: null,
      messageTiming: null,
      toolTimings: new Map(),
    }),
}));
