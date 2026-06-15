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
  streamingBlocks: ContentBlock[];
  streamingUsage: TokenUsage | null;
  contextUsage: ContextUsageInfo | null;
  sessionStats: SessionStatsInfo | null;
  messageTiming: MessageTiming | null;
  toolTimings: Map<string, number>;
  streamError: string | null;
  triggerSend: number;
  /** Editing mode: the raw entry ID being edited */
  editingEntryId: string | null;
  /** Editing mode: the UI message ID being edited (for reference) */
  editingMessageId: string | null;
  /** Editing mode: current text content of the editing textarea */
  editingContent: string;

  /** Steering and follow-up message queues */
  steeringQueue: string[];
  followUpQueue: string[];

  /** Enqueue a follow-up message to be sent after the current stream completes */
  enqueueFollowUp: (text: string) => void;
  /** Enqueue a steering message to be sent at the next tool turn boundary */
  enqueueSteer: (text: string) => void;
  /** Remove a queued item by type and index */
  removeQueuedItem: (type: 'steer' | 'followUp', index: number) => void;
  /** Dequeue and return the next item (steer first, then follow-up). Returns null if empty. */
  dequeueNext: () => string | null;

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
  clearAttachments: () => void;
  addStreamingBlock: (block: ContentBlock) => void;
  updateStreamingBlock: (id: string, updates: Partial<ContentBlock>) => void;
  clearStreamingBlocks: () => void;
  setStreamingBlocks: (blocks: ContentBlock[]) => void;
  setStreamingUsage: (usage: TokenUsage | null) => void;
  setContextUsage: (ctx: ContextUsageInfo | null) => void;
  setSessionStats: (stats: SessionStatsInfo | null) => void;
  setMessageTiming: (timing: MessageTiming | null) => void;
  setToolTiming: (timing: ToolTiming) => void;
  setStreamError: (error: string | null) => void;
  setTriggerSend: (content: string) => void;
  /** Enter edit mode: track entry and message IDs for navigateTree on send */
  setEditingMessage: (entryId: string, messageId: string, initialContent: string) => void;
  /** Set editing content (e.g. as user types in the textarea) */
  setEditingContent: (content: string) => void;
  /** Exit edit mode: clear composer and editing state */
  clearEditingMessage: () => void;
  /** Update the steering and follow-up queue state */
  setQueues: (steering: string[], followUp: string[]) => void;
  reset: () => void;
}

export const useComposerStore = create<ComposerState>((set, get) => ({
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
  streamingBlocks: [],
  streamingUsage: null,
  contextUsage: null,
  sessionStats: null,
  messageTiming: null,
  toolTimings: new Map(),
  streamError: null,
  triggerSend: 0,
  editingEntryId: null,
  editingMessageId: null,
  editingContent: '',
  steeringQueue: [],
  followUpQueue: [],

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
  clearAttachments: () => set({ pendingAttachments: [], uploadProgress: {} }),
  addStreamingBlock: (block) =>
    set((s) => {
      const idx = s.streamingBlocks.findIndex((b) => b.id === block.id);
      if (idx >= 0) {
        // Replace existing block with the latest snapshot (avoids duplication
        // when SDK re-sends the same block ID with accumulated content)
        const updated = [...s.streamingBlocks];
        updated[idx] = block;
        return { streamingBlocks: updated };
      }
      return { streamingBlocks: [...s.streamingBlocks, block] };
    }),
  updateStreamingBlock: (id, updates) =>
    set((s) => ({
      streamingBlocks: s.streamingBlocks.map((b) =>
        b.id === id ? { ...b, ...updates } : b,
      ),
    })),
  clearStreamingBlocks: () => set({ streamingBlocks: [] }),
  setStreamingBlocks: (streamingBlocks) => set({ streamingBlocks }),
  setStreamingUsage: (streamingUsage) => set({ streamingUsage }),
  setContextUsage: (contextUsage) => set({ contextUsage }),
  setStreamError: (streamError) => set({ streamError }),
  setTriggerSend: (content) => set((s) => ({ value: content, triggerSend: s.triggerSend + 1 })),
  setEditingMessage: (entryId, messageId, initialContent) =>
    set({ editingEntryId: entryId, editingMessageId: messageId, editingContent: initialContent }),
  setEditingContent: (content) => set({ editingContent: content }),
  clearEditingMessage: () =>
    set({ editingEntryId: null, editingMessageId: null, editingContent: '' }),
  setQueues: (steering, followUp) => set({ steeringQueue: steering, followUpQueue: followUp }),
  enqueueFollowUp: (text) => set((s) => ({ followUpQueue: [...s.followUpQueue, text] })),
  enqueueSteer: (text) => set((s) => ({ steeringQueue: [...s.steeringQueue, text] })),
  removeQueuedItem: (type, index) =>
    set((s) => {
      if (type === 'steer') {
        return { steeringQueue: s.steeringQueue.filter((_, i) => i !== index) };
      }
      return { followUpQueue: s.followUpQueue.filter((_, i) => i !== index) };
    }),
  dequeueNext: (): string | null => {
    const state = get();
    if (state.steeringQueue.length > 0) {
      const first = state.steeringQueue[0];
      set({ steeringQueue: state.steeringQueue.slice(1) });
      return first;
    }
    if (state.followUpQueue.length > 0) {
      const first = state.followUpQueue[0];
      set({ followUpQueue: state.followUpQueue.slice(1) });
      return first;
    }
    return null;
  },
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
      streamingBlocks: [],
      streamingUsage: null,
      contextUsage: null,
      sessionStats: null,
      messageTiming: null,
      toolTimings: new Map(),
      streamError: null,
      triggerSend: 0,
      editingEntryId: null,
      editingMessageId: null,
      editingContent: '',
      steeringQueue: [],
      followUpQueue: [],
    }),
}));
