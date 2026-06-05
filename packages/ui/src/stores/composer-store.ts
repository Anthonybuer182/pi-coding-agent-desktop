import { create } from 'zustand';
import type { Attachment, SlashCommand } from '@pi/types';

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

  setValue: (value: string) => void;
  setCursorPosition: (pos: number) => void;
  setIsStreaming: (streaming: boolean) => void;
  setIsDragging: (dragging: boolean) => void;
  setShowSlashMenu: (show: boolean, query?: string) => void;
  setShowMentionMenu: (show: boolean, query?: string) => void;
  addAttachment: (attachment: Attachment) => void;
  removeAttachment: (id: string) => void;
  setUploadProgress: (id: string, progress: number) => void;
  clearUploadProgress: () => void;
  setAbortController: (controller: AbortController | null) => void;
  clearAttachments: () => void;
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

  setValue: (value) => set({ value }),
  setCursorPosition: (cursorPosition) => set({ cursorPosition }),
  setIsStreaming: (isStreaming) => set({ isStreaming }),
  setIsDragging: (isDragging) => set({ isDragging }),
  setShowSlashMenu: (show, query = '') => set({ showSlashMenu: show, slashQuery: query }),
  setShowMentionMenu: (show, query = '') => set({ showMentionMenu: show, mentionQuery: query }),
  addAttachment: (attachment) =>
    set((s) => ({ pendingAttachments: [...s.pendingAttachments, attachment] })),
  removeAttachment: (id) =>
    set((s) => ({ pendingAttachments: s.pendingAttachments.filter((a) => a.id !== id) })),
  setUploadProgress: (id, progress) =>
    set((s) => ({ uploadProgress: { ...s.uploadProgress, [id]: progress } })),
  clearUploadProgress: () => set({ uploadProgress: {} }),
  setAbortController: (abortController) => set({ abortController }),
  clearAttachments: () => set({ pendingAttachments: [], uploadProgress: {} }),
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
    }),
}));
