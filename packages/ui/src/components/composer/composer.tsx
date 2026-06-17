import { useCallback, useMemo, useState, useRef, useEffect, DragEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Square, Upload, CornerDownRight } from 'lucide-react';
import { cn, isPreviewableInRightPanel } from '@/lib/utils';
import { streamReducer, initialStreamingState } from '@/lib/stream-reducer';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { useComposerStore } from '@/stores/composer-store';
import { ComposerInput } from './composer-input';
import { SendButton } from './send-button';
import { FileUploadButton } from './file-upload-button';
import { SlashCommandMenu } from './slash-command-menu';
import { MentionMenu } from './mention-menu';
import type { MentionItem } from './mention-menu';
import { AttachmentPreviewBar } from './attachment-preview-bar';
import { QueueIndicator } from './queue-indicator';
import { ModelSelector } from '../model/model-selector';
import { ThinkLevelSelector } from '../model/think-level-selector';
import { SkillSelector } from '../model/skill-selector';
import { CompactToggle } from '../model/compact-toggle';
import { DEFAULT_SLASH_COMMANDS } from '@pi/sdk-wrapper';
import type { ContentBlock, Config, Skill } from '@pi/types';
import type { Attachment } from '@pi/types';

const DEFAULT_SKILLS: Skill[] = [
  { id: 'skill-filesystem', name: 'filesystem', description: 'Access and manage local files', category: 'filesystem', enabled: true },
  { id: 'skill-officecli', name: 'officecli', description: 'Create and edit Office documents', category: 'document', enabled: true },
  { id: 'skill-graphify', name: 'graphify', description: 'Build knowledge graphs from code', category: 'code', enabled: true },
  { id: 'skill-ui-ux-pro-max', name: 'ui-ux-pro-max', description: 'UI/UX design intelligence', category: 'code', enabled: true },
];

export function Composer() {
  const sdk = useSDK();
  const queryClient = useQueryClient();
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const compactMode = useUIStore((s) => s.compactMode);
  const setCompactMode = useUIStore((s) => s.setCompactMode);
  const selectedSkills = useUIStore((s) => s.selectedSkills);
  const toggleSkill = useUIStore((s) => s.toggleSkill);
  const setActivePreviewFile = useUIStore((s) => s.setActivePreviewFile);
  const setMemoryPreview = useUIStore((s) => s.setMemoryPreview);
  const setActiveSession = useUIStore((s) => s.setActiveSession);
  const {
    value,
    setValue,
    isStreaming,
    isDragging,
    setIsStreaming,
    setIsDragging,
    showSlashMenu,
    slashQuery,
    setShowSlashMenu,
    showMentionMenu,
    mentionQuery,
    setShowMentionMenu,
    pendingAttachments,
    addAttachment,
    updateAttachmentData,
    removeAttachment,
    clearAttachments,
    clearStreamingBlocks,
    setStreamingBlocks,
    setStreamingUsage,
    setContextUsage,
    setSessionStats,
    setMessageTiming,
    setToolTiming,
    setStreamError,
    triggerSend,
    clearEditingMessage,
    steeringQueue,
    followUpQueue,
    setQueues,
    enqueueFollowUp,
    enqueueSteer,
    dequeueNext,
    triggerScrollToBottom,
  } = useComposerStore();

  // Highlighted index for keyboard navigation in popup menus
  const [highlightedSlashIndex, setHighlightedSlashIndex] = useState(0);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);

  // Pending token insert signal for ComposerInput contentEditable
  const pendingTokenInsert = useRef<{ text: string; type: 'slash' | 'mention' } | null>(null);

  // Version counter to force ComposerInput useEffect re-run when a token is selected
  const [tokenInsertVersion, setTokenInsertVersion] = useState(0);

  // Version counter to force ComposerInput refocus after file picker closes
  const [focusVersion, setFocusVersion] = useState(0);

  // Config for model/think level
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => sdk.config.get(),
  });

  const updateConfigMut = useMutation({
    mutationFn: (data: Partial<Config>) => sdk.config.update(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config'] }),
  });

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      files.forEach((file) => {
        const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        let attType: Attachment['type'] = 'other';
        const mime = file.type || '';

        if (/^image\/(jpeg|png|gif|webp|svg\+xml)$/i.test(mime)) {
          attType = 'image';
        } else if (mime === 'application/pdf') {
          attType = 'pdf';
        } else if (
          /^application\/vnd\.openxmlformats-officedocument\./.test(mime) ||
          mime === 'application/msword'
        ) {
          attType = 'office';
        } else if (
          /^text\/(x-|plain|html|css|csv|xml|javascript|typescript)/.test(mime) ||
          mime === 'application/json' ||
          mime === 'application/javascript'
        ) {
          attType = 'code';
        } else if (/^audio\//.test(mime)) {
          attType = 'audio';
        } else if (/^video\//.test(mime)) {
          attType = 'video';
        }

        addAttachment({
          id,
          name: file.name,
          type: attType,
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          status: 'uploading',
          createdAt: new Date().toISOString(),
        });
        // Read file content as base64 for sending to vision models
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Strip "data:image/png;base64," prefix to get raw base64
          const base64 = result.split(',')[1] || result;
          updateAttachmentData(id, base64);
        };
        reader.onerror = () => {
          updateAttachmentData(id, '');
        };
        reader.readAsDataURL(file);
      });
      // Restore focus to the input after the native file picker closes
      setFocusVersion((v) => v + 1);
    },
    [addAttachment, updateAttachmentData],
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, [setIsDragging]);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, [setIsDragging]);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFilesSelected(files);
      }
    },
    [handleFilesSelected, setIsDragging],
  );

  const handlePreviewAttachment = useCallback(
    (attachment: Attachment) => {
      if (attachment.url) {
        setActivePreviewFile(attachment.url);
      }
    },
    [setActivePreviewFile],
  );

  // Build dynamic mention items from active workspace/session context
  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => sdk.workspace.list(),
  });

  const { data: sessions } = useQuery({
    queryKey: ['sessions', activeSessionId],
    queryFn: () => (activeSessionId ? sdk.session.list(activeSessionId) : []),
    enabled: !!activeSessionId,
  });

  // Fetch workspace files for @ mention autocomplete
  const { data: workspaceFiles } = useQuery({
    queryKey: ['files', activeWorkspaceId, showMentionMenu],
    queryFn: () => (activeWorkspaceId ? sdk.file.list(activeWorkspaceId) : []),
    enabled: !!activeWorkspaceId && showMentionMenu,
    staleTime: 30_000,
  });

  const mentionItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];
    workspaces?.forEach((w) =>
      items.push({ id: `ws-${w.id}`, type: 'workspace', label: w.name, description: `${w.sessionCount} sessions` }),
    );
    sessions?.forEach((s) =>
      items.push({ id: `sess-${s.id}`, type: 'session', label: s.title, description: `${s.messageCount} messages` }),
    );
    // Include workspace files in autocomplete
    if (workspaceFiles && workspaceFiles.length > 0) {
      workspaceFiles.forEach((f) =>
        items.push({
          id: `file-${f.path}`,
          type: f.type === 'directory' ? 'folder' : 'file',
          label: f.name,
          description: f.type === 'directory' ? 'Directory' : f.size ? `${Math.round(f.size / 1024)} KB` : undefined,
        }),
      );
    } else {
      // Fallback placeholders when no workspace or no files loaded
      items.push(
        { id: 'file-default', type: 'file', label: 'current file', description: 'Reference current file' },
        { id: 'folder-default', type: 'folder', label: 'project root', description: 'Reference project folder' },
        { id: 'code-default', type: 'code', label: 'selection', description: 'Current code selection' },
      );
    }
    return items;
  }, [workspaces, sessions, workspaceFiles]);

  const handleStopGeneration = useCallback(async () => {
    if (!activeSessionId) return;
    try {
      await sdk.chat.stopGeneration(activeSessionId);
    } finally {
      setIsStreaming(false);
    }
  }, [sdk, activeSessionId, setIsStreaming]);

  /** Send the current composer text as a steering message — queued locally, sent later */
  const handleSteerSubmit = useCallback(() => {
    if (!value.trim() || !activeSessionId || !isStreaming) return;
    enqueueSteer(value);
    setValue('');
  }, [value, activeSessionId, isStreaming, enqueueSteer, setValue]);

  /** Send the current composer text as a follow-up message — queued locally, sent later */
  const handleFollowUpSubmit = useCallback(() => {
    if (!value.trim() || !activeSessionId || !isStreaming) return;
    enqueueFollowUp(value);
    setValue('');
  }, [value, activeSessionId, isStreaming, enqueueFollowUp, setValue]);

  // Watch for retry trigger from ChatTimeline
  useEffect(() => {
    if (triggerSend > 0 && activeSessionId) {
      const currentValue = useComposerStore.getState().value;
      if (currentValue.trim()) {
        sendMutation.mutate(currentValue);
        setValue('');
      }
    }
  }, [triggerSend]);

  // Store last user message for potential retry
  const lastUserMessageRef = useRef<string>('');

  const sendMutation = useMutation({
    onMutate: async (content: string) => {
      // Capture attachments BEFORE the await, since handleSubmit calls
      // clearAttachments() synchronously after mutate(), and the await
      // in cancelQueries yields control allowing clearAttachments to run.
      const currentAttachments = useComposerStore.getState().pendingAttachments;

      // Cancel outgoing refetches so they don't overwrite our optimistic update
      await queryClient.cancelQueries({ queryKey: ['session', activeSessionId] });
      const previousSession = queryClient.getQueryData(['session', activeSessionId]);

      // Build user message blocks from attachments for inline preview
      const userBlocks: ContentBlock[] = [];
      if (currentAttachments.length > 0) {
        // Text content block
        if (content) {
          userBlocks.push({
            id: `b-text-opt-${Date.now()}`,
            type: 'text',
            content,
          });
        }
        for (const att of currentAttachments) {
          if (att.type === 'image' && att.data) {
            userBlocks.push({
              id: `b-img-opt-${att.id}`,
              type: 'image',
              content: att.name,
              mimeType: att.mimeType,
              data: att.data,
            });
          } else if (att.data) {
            userBlocks.push({
              id: `b-file-opt-${att.id}`,
              type: 'file',
              content: att.name,
              mimeType: att.mimeType,
              data: att.data,
              fileName: att.name,
              fileSize: att.size,
            });
          }
        }
      }

      // Register attachment data in memoryPreviews so file blocks remain
      // clickable even after cache invalidation removes optimistic blocks
      for (const att of currentAttachments) {
        if (att.data) {
          const virtualPath = `__memory__/${att.name}`;
          useUIStore.getState().setMemoryPreview(virtualPath, {
            fileName: att.name,
            mimeType: att.mimeType,
            data: att.data,
          });
        }
      }

      // Append text references for non-image attachments to the prompt content.
      // For text-based files, decode and include the actual file content so the
      // AI can analyze it directly.
      let promptContent = content;
      const nonImageAtts = currentAttachments.filter((a) => a.type !== 'image' && a.name);
      if (nonImageAtts.length > 0) {
        const TEXT_MIMES = new Set([
          'text/plain', 'text/html', 'text/css', 'text/csv', 'text/xml',
          'text/javascript', 'text/typescript', 'text/markdown',
          'text/x-python', 'text/x-java', 'text/x-rust', 'text/x-go',
          'text/x-c', 'text/x-c++', 'text/x-sh',
          'application/json', 'application/javascript', 'application/typescript',
          'application/xml', 'application/x-yaml',
        ]);

        const fileSections: string[] = [];
        for (const att of nonImageAtts) {
          if (att.data && TEXT_MIMES.has(att.mimeType)) {
            try {
              // atob returns a binary string; decode UTF-8 bytes properly
              const binary = atob(att.data);
              const bytes = new Uint8Array(binary.length);
              for (let j = 0; j < binary.length; j++) {
                bytes[j] = binary.charCodeAt(j);
              }
              const text = new TextDecoder().decode(bytes);
              // Wrap in markdown code fences with language hint from extension
              const ext = (att.name || '').split('.').pop() || '';
              const fenceExt = ext === 'tsx' ? 'tsx' : ext === 'jsx' ? 'jsx' : ext === 'md' ? 'md' : ext;
              fileSections.push(`File: ${att.name}\n\`\`\`${fenceExt}\n${text}\n\`\`\``);
            } catch {
              fileSections.push(`[Attached: ${att.name} (${att.type}) - could not decode]`);
            }
          } else {
            fileSections.push(`[Attached: ${att.name} (${att.type})]`);
          }
        }
        promptContent = `${content}\n\n${fileSections.join('\n\n')}`;
      }

      // Optimistically show the user message immediately
      queryClient.setQueryData(['session', activeSessionId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [
            ...(old.messages || []),
            {
              id: `optimistic-${Date.now()}`,
              sessionId: activeSessionId,
              role: 'user',
              status: 'complete',
              content,
              blocks: userBlocks.length > 0 ? userBlocks : [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            },
          ],
        };
      });
      return { previousSession, promptContent };
    },
    mutationFn: async (content: string) => {
      if (!activeSessionId) return;
      lastUserMessageRef.current = content;
      clearStreamingBlocks();
      setMessageTiming(null);
      setSessionStats(null);
      setStreamError(null);
      setIsStreaming(true);

      // If editing a message, navigate the tree first to branch from the edited entry
      const editEntryId = useComposerStore.getState().editingEntryId;
      if (editEntryId) {
        try {
          await sdk.chat.navigateTree(activeSessionId, editEntryId);
        } catch (err) {
          setStreamError(err instanceof Error ? err.message : 'Failed to navigate tree');
          setIsStreaming(false);
          throw err;
        }
      }

      // Build prompt text: decode and include text-based file contents,
      // append references for binary files
      const currentAttachments = useComposerStore.getState().pendingAttachments;
      const nonImageAtts = currentAttachments.filter((a) => a.type !== 'image' && a.name);
      let promptContent = content;
      if (nonImageAtts.length > 0) {
        const TEXT_MIMES = new Set([
          'text/plain', 'text/html', 'text/css', 'text/csv', 'text/xml',
          'text/javascript', 'text/typescript', 'text/markdown',
          'text/x-python', 'text/x-java', 'text/x-rust', 'text/x-go',
          'text/x-c', 'text/x-c++', 'text/x-sh',
          'application/json', 'application/javascript', 'application/typescript',
          'application/xml', 'application/x-yaml',
        ]);

        const fileSections: string[] = [];
        for (const att of nonImageAtts) {
          if (att.data && TEXT_MIMES.has(att.mimeType)) {
            try {
              // atob returns binary string; decode UTF-8 bytes properly
              const binary = atob(att.data);
              const bytes = new Uint8Array(binary.length);
              for (let j = 0; j < binary.length; j++) {
                bytes[j] = binary.charCodeAt(j);
              }
              const text = new TextDecoder().decode(bytes);
              const ext = (att.name || '').split('.').pop() || '';
              const fenceExt = ext === 'tsx' ? 'tsx' : ext === 'jsx' ? 'jsx' : ext === 'md' ? 'md' : ext;
              fileSections.push(`File: ${att.name}\n\`\`\`${fenceExt}\n${text}\n\`\`\``);
            } catch {
              fileSections.push(`[Attached: ${att.name} (${att.type}) - could not decode]`);
            }
          } else {
            fileSections.push(`[Attached: ${att.name} (${att.type})]`);
          }
        }
        promptContent = `${content}\n\n${fileSections.join('\n\n')}`;
      }

      // Collect image attachments with base64 data read
      const imageAttachments = currentAttachments
        .filter((a) => a.type === 'image' && a.data)
        .map((a) => ({ name: a.name, mimeType: a.mimeType, data: a.data! }));

      // Streaming state managed by reducer for consistent block ordering/dedup
      let streamState = initialStreamingState();

      await sdk.chat.sendMessageStream(
        {
          sessionId: activeSessionId,
          content: promptContent,
          workspaceCwd: activeWorkspaceId ?? undefined,
          modelId: config?.defaultModelId,
          attachments: imageAttachments.length > 0 ? imageAttachments : undefined,
        },
        (chunk) => {
          if (chunk.type === 'message_start') {
            streamState = streamReducer(streamState, { type: 'message_start' });
            setStreamingBlocks(streamState.blocks);
          } else if (chunk.type === 'block' && chunk.block) {
            streamState = streamReducer(streamState, { type: 'block', block: chunk.block as ContentBlock });
            setStreamingBlocks(streamState.blocks);
          } else if (chunk.type === 'text' && chunk.content) {
            streamState = streamReducer(streamState, { type: 'text_delta', content: chunk.content });
            setStreamingBlocks(streamState.blocks);
          } else if (chunk.type === 'usage' && chunk.usage) {
            setStreamingUsage(chunk.usage);
          } else if (chunk.type === 'context' && chunk.contextUsage) {
            setContextUsage(chunk.contextUsage);
          } else if (chunk.type === 'stats' && chunk.sessionStats) {
            setSessionStats(chunk.sessionStats);
          } else if (chunk.type === 'message_timing' && chunk.messageTiming) {
            setMessageTiming(chunk.messageTiming);
          } else if (chunk.type === 'tool_timing' && chunk.toolTiming) {
            setToolTiming(chunk.toolTiming);
          } else if (chunk.type === 'queue_update' && chunk.queueState) {
            setQueues(chunk.queueState.steering, chunk.queueState.followUp);
          } else if (chunk.type === 'error') {
            setStreamError(chunk.error || 'An unknown error occurred');
          }
        },
      );
    },
    onSuccess: () => {
      const state = useComposerStore.getState();

      // Clear editing state if in edit mode
      if (state.editingEntryId) {
        clearEditingMessage();
      }

      // Promote the streaming data into the query cache as a single assistant message.
      // Each stream produces exactly one assistant response, since follow-ups/steers
      // are now sent via separate sendMutation.mutate() calls.
      // Note: file blocks are rendered at the end by renderBlocks() in message-bubble,
      // so no manual reordering is needed here.
      const blocks = state.streamingBlocks.map((b) => {
        if (b.type === 'tool_call' && b.toolCallId) {
          const ms = state.toolTimings.get(b.toolCallId);
          if (ms != null) return { ...b, durationMs: ms };
        }
        return b;
      });

      const content = blocks
        .filter((b) => b.type === 'text')
        .map((b) => b.content)
        .join('');

      const now = new Date().toISOString();
      const assistantMsg = {
        id: `msg-${activeSessionId}-${Date.now()}`,
        sessionId: activeSessionId,
        role: 'assistant' as const,
        status: 'complete' as const,
        modelId: config?.defaultModelId ?? 'unknown',
        content,
        blocks,
        usage: state.streamingUsage ?? undefined,
        createdAt: now,
        updatedAt: now,
      };

      queryClient.setQueryData(['session', activeSessionId], (old: any) => {
        if (!old) return old;
        return {
          ...old,
          messages: [...(old.messages || []), assistantMsg],
        };
      });

      clearStreamingBlocks();
      setIsStreaming(false);
      queryClient.invalidateQueries({ queryKey: ['files'] });

      // Auto-preview the last generated file in the right panel
      const fileBlocks = blocks.filter((b) => b.type === 'file');
      if (fileBlocks.length > 0) {
        const lastFile = fileBlocks[fileBlocks.length - 1];
        if (lastFile.workspacePath && isPreviewableInRightPanel(lastFile.workspacePath)) {
          setActivePreviewFile(lastFile.workspacePath);
        }
      }

      // Register user file blocks with data in memoryPreviews so they
      // can be opened in the right panel even without workspacePath
      const session = queryClient.getQueryData(['session', activeSessionId]) as any;
      if (session?.messages) {
        for (const msg of session.messages) {
          if (msg.role === 'user' && msg.blocks) {
            for (const b of msg.blocks) {
              if (b.type === 'file' && b.data && !b.workspacePath && b.fileName) {
                const virtualPath = `__memory__/${b.fileName}`;
                useUIStore.getState().setMemoryPreview(virtualPath, {
                  fileName: b.fileName,
                  mimeType: b.mimeType,
                  data: b.data,
                });
              }
            }
          }
        }
      }

      // Drain queue: send next queued item as a new message
      const nextText = useComposerStore.getState().dequeueNext();
      if (nextText) {
        sendMutateRef.current(nextText);
      }
    },
    onError: (error: Error, _content: string, context: any) => {
      // Rollback optimistic user message
      if (context?.previousSession) {
        queryClient.setQueryData(['session', activeSessionId], context.previousSession);
      }
      setStreamError(error.message || 'Failed to send message');
      clearStreamingBlocks();
      setIsStreaming(false);

      // Drain queue for non-fatal errors
      const isFatal = error.message?.toLowerCase().includes('session') &&
                      error.message?.toLowerCase().includes('not found');
      if (!isFatal) {
        const nextText = useComposerStore.getState().dequeueNext();
        if (nextText) {
          sendMutateRef.current(nextText);
        }
      }
    },
  });

  // Stable ref for sendMutation.mutate to avoid stale closure issues in callbacks
  const sendMutateRef = useRef(sendMutation.mutate);
  sendMutateRef.current = sendMutation.mutate;

  /** Handle built-in slash commands locally without sending to LLM */
  const handleSlashCommand = useCallback(
    (text: string): boolean => {
      const trimmed = text.trim();
      const knownCommands = new Set(DEFAULT_SLASH_COMMANDS.map((c) => c.name));

      // Strip arguments: /bash ls -la → /bash
      const cmdName = trimmed.split(/\s+/)[0];
      if (!knownCommands.has(cmdName)) return false;

      const now = new Date().toISOString();
      const insertPair = (assistantMsg: Record<string, unknown>) => {
        const userMsg = {
          id: `user-${Date.now()}`,
          sessionId: activeSessionId,
          role: 'user' as const,
          status: 'complete' as const,
          content: trimmed,
          blocks: [],
          createdAt: now,
          updatedAt: now,
        };
        queryClient.setQueryData(['session', activeSessionId], (old: any) => {
          if (!old) return old;
          return {
            ...old,
            messages: [...(old.messages || []), userMsg, assistantMsg],
          };
        });
        triggerScrollToBottom();
      };

      if (cmdName === '/help') {
        const helpContent = [
          '# Pi Coding Agent',
          '',
          'I\'m your AI coding assistant. Here\'s what I can do:',
          '',
          '## Available Commands',
          ...DEFAULT_SLASH_COMMANDS.map((c) => `- **${c.name}** — ${c.description}`),
          '',
          '## Skills',
          ...DEFAULT_SKILLS.map((s) =>
            `- **${s.name}** — ${s.description} (${s.enabled ? 'enabled' : 'disabled'})`,
          ),
          '',
          '## Keyboard Shortcuts',
          '- **Enter** — Send message',
          '- **Shift+Enter** — New line',
          '- **Ctrl+Enter** — Steer agent during streaming',
          "- **/** — Open command menu for quick actions",
          '- **@** — Mention files, workspaces, or sessions',
          '',
          '## Capabilities',
          '- Read, write, and edit files in your workspace',
          '- Execute shell commands via bash tool',
          '- Search codebases with regex and glob patterns',
          '- Manage multiple workspaces and sessions',
          '- Attach images and files for AI analysis',
          '- Stream responses with live progress updates',
          '- Create and edit Office documents (.docx, .xlsx, .pptx)',
          '- Build knowledge graphs from code',
          '- UI/UX design intelligence for web and mobile apps',
        ].join('\n');

        insertPair({
          id: `help-${Date.now()}`,
          sessionId: activeSessionId,
          role: 'assistant',
          status: 'complete',
          modelId: config?.defaultModelId ?? 'system',
          content: helpContent,
          blocks: [],
          createdAt: now,
          updatedAt: now,
        });
        return true;
      }

      if (cmdName === '/clear') {
        if (!activeWorkspaceId) return false;
        // Create a new session and switch to it
        sdk.session.create(activeWorkspaceId).then((session) => {
          queryClient.invalidateQueries({ queryKey: ['sessions'] });
          queryClient.invalidateQueries({ queryKey: ['workspaces'] });
          setActiveSession(session.id);
        });
        return true;
      }

      if (cmdName === '/config') {
        const skills = DEFAULT_SKILLS
          .filter((s) => selectedSkills.includes(s.id))
          .map((s) => s.name)
          .join(', ') || 'none';
        const configContent = [
          '## Current Configuration',
          '',
          `- **Model**: ${config?.defaultModelId ?? 'Not set'}`,
          `- **Think Level**: ${config?.defaultThinkLevel ?? 'medium'}`,
          `- **Skills**: ${skills}`,
          `- **Compact Mode**: ${compactMode ? 'On' : 'Off'}`,
          `- **Workspace**: ${activeWorkspaceId ?? 'None'}`,
        ].join('\n');

        insertPair({
          id: `config-${Date.now()}`,
          sessionId: activeSessionId,
          role: 'assistant',
          status: 'complete',
          modelId: config?.defaultModelId ?? 'system',
          content: configContent,
          blocks: [],
          createdAt: now,
          updatedAt: now,
        });
        return true;
      }

      // /bash, /file, /compact, /model — pass through to LLM
      return false;
    },
    [
      sdk,
      activeSessionId,
      activeWorkspaceId,
      config,
      compactMode,
      selectedSkills,
      queryClient,
      setActiveSession,
      triggerScrollToBottom,
    ],
  );

  const handleSubmit = useCallback(() => {
    if (!value.trim() || !activeSessionId || sendMutation.isPending) return;

    // Intercept built-in slash commands before sending to LLM
    const slashHandled = handleSlashCommand(value);
    if (slashHandled) {
      setValue('');
      clearAttachments();
      return;
    }

    sendMutation.mutate(value);
    setValue('');
    clearAttachments();
  }, [value, activeSessionId, sendMutation, setValue, clearAttachments, handleSlashCommand]);

  const handleSlashDetect = useCallback(
    (query: string) => {
      setHighlightedSlashIndex(0);
      setShowSlashMenu(true, query);
    },
    [setShowSlashMenu],
  );

  const handleMentionDetect = useCallback(
    (query: string) => {
      setHighlightedMentionIndex(0);
      setShowMentionMenu(true, query);
      setShowSlashMenu(false);
    },
    [setShowMentionMenu, setShowSlashMenu],
  );

  const handleSlashDismiss = useCallback(() => {
    setShowSlashMenu(false);
    setHighlightedSlashIndex(0);
  }, [setShowSlashMenu]);
  const handleMentionDismiss = useCallback(() => {
    setShowMentionMenu(false);
    setHighlightedMentionIndex(0);
  }, [setShowMentionMenu]);

  // Compute total filtered items for both menus (for index clamping)
  const totalSlashItems = useMemo(() => {
    if (!showSlashMenu) return 0;
    return DEFAULT_SLASH_COMMANDS.filter(
      (c) => !slashQuery || c.name.toLowerCase().includes(slashQuery.toLowerCase()),
    ).length;
  }, [showSlashMenu, slashQuery]);

  const totalMentionItems = useMemo(() => {
    if (!showMentionMenu) return 0;
    return mentionItems.filter(
      (i) => !mentionQuery || i.label.toLowerCase().includes(mentionQuery.toLowerCase()),
    ).length;
  }, [showMentionMenu, mentionQuery, mentionItems]);

  // Keyboard navigation handlers for popup menus
  const handleSlashNavigate = useCallback(
    (direction: 'up' | 'down') => {
      setHighlightedSlashIndex((prev) => {
        if (totalSlashItems === 0) return 0;
        if (direction === 'down') return (prev + 1) % totalSlashItems;
        return (prev - 1 + totalSlashItems) % totalSlashItems;
      });
    },
    [totalSlashItems],
  );

  const handleSlashSelect = useCallback(
    (cmd?: import('@pi/types').SlashCommand) => {
      // If called without args (Enter key), select highlighted item
      if (!cmd) {
        const filtered = DEFAULT_SLASH_COMMANDS.filter(
          (c) => !slashQuery || c.name.toLowerCase().includes(slashQuery.toLowerCase()),
        );
        cmd = filtered[highlightedSlashIndex];
        if (!cmd) return;
      }
      // cmd.name already includes the / prefix (e.g. "/help")
      const tokenText = cmd.name;
      const withoutSlash = value.replace(/\/(\w*)$/, '');
      setValue(`${withoutSlash}${tokenText}`);
      pendingTokenInsert.current = { text: tokenText, type: 'slash' };
      setShowSlashMenu(false);
      setHighlightedSlashIndex(0);
      setTokenInsertVersion((v) => v + 1);
    },
    [value, setValue, setShowSlashMenu, slashQuery, highlightedSlashIndex],
  );

  const handleMentionNavigate = useCallback(
    (direction: 'up' | 'down') => {
      setHighlightedMentionIndex((prev) => {
        if (totalMentionItems === 0) return 0;
        if (direction === 'down') return (prev + 1) % totalMentionItems;
        return (prev - 1 + totalMentionItems) % totalMentionItems;
      });
    },
    [totalMentionItems],
  );

  const handleMentionSelect = useCallback(
    (item?: MentionItem) => {
      if (!item) {
        const filtered = mentionItems.filter(
          (i) => !mentionQuery || i.label.toLowerCase().includes(mentionQuery.toLowerCase()),
        );
        item = filtered[highlightedMentionIndex];
        if (!item) return;
      }
      const withoutMention = value.replace(/@([^\s]*)$/, '');
      const tokenText = `@${item.label}`;
      setValue(`${withoutMention}${tokenText}`);
      pendingTokenInsert.current = { text: tokenText, type: 'mention' };
      setShowMentionMenu(false);
      setHighlightedMentionIndex(0);
      setTokenInsertVersion((v) => v + 1);
    },
    [value, setValue, setShowMentionMenu, mentionQuery, highlightedMentionIndex, mentionItems],
  );

  // Menu navigation handler (delegates to correct menu based on which is open)
  const handleMenuNavigate = useCallback(
    (direction: 'up' | 'down') => {
      if (showSlashMenu) handleSlashNavigate(direction);
      else if (showMentionMenu) handleMentionNavigate(direction);
    },
    [showSlashMenu, showMentionMenu, handleSlashNavigate, handleMentionNavigate],
  );

  const handleMenuSelect = useCallback(() => {
    if (showSlashMenu) handleSlashSelect();
    else if (showMentionMenu) handleMentionSelect();
  }, [showSlashMenu, showMentionMenu, handleSlashSelect, handleMentionSelect]);

  if (!activeSessionId) return null;

  return (
    <div
      className={cn(
        'rounded-xl border bg-card shadow-lg mx-4 mb-4 overflow-visible',
        isDragging && 'ring-2 ring-primary/50 border-primary',
      )}
    >
      {/* Attachment previews */}
      {pendingAttachments.length > 0 && (
        <div className="px-3 pt-3">
          <AttachmentPreviewBar
            attachments={pendingAttachments}
            onRemove={removeAttachment}
            onPreview={handlePreviewAttachment}
          />
        </div>
      )}

      {/* Input area with drag-drop */}
      <div
        className="relative mx-3 mt-3"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Slash Command / Mention Menus */}
        {showSlashMenu && (
          <SlashCommandMenu
            commands={DEFAULT_SLASH_COMMANDS}
            query={slashQuery}
            highlightedIndex={highlightedSlashIndex}
            onSelect={handleSlashSelect}
          />
        )}
        {showMentionMenu && (
          <MentionMenu
            items={mentionItems}
            query={mentionQuery}
            highlightedIndex={highlightedMentionIndex}
            onSelect={handleMentionSelect}
          />
        )}

        {/* Textarea */}
        <ComposerInput
          value={value}
          onChange={setValue}
          onSubmit={handleSubmit}
          onSlashDetected={handleSlashDetect}
          onMentionDetected={handleMentionDetect}
          onSlashDismiss={handleSlashDismiss}
          onMentionDismiss={handleMentionDismiss}
          disabled={!activeSessionId}
          placeholder={isStreaming ? 'Press Enter to follow-up, or click Steer to redirect...' : undefined}
          showMenu={showSlashMenu || showMentionMenu}
          onMenuNavigate={handleMenuNavigate}
          onMenuSelect={handleMenuSelect}
          isStreaming={isStreaming}
          onSteerSubmit={handleSteerSubmit}
          onFollowUpSubmit={handleFollowUpSubmit}
          pendingTokenInsert={pendingTokenInsert}
          tokenInsertVersion={tokenInsertVersion}
          focusVersion={focusVersion}
        />

        {/* Drag overlay */}
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-primary/5 rounded-lg border-2 border-dashed border-primary/50 z-10 pointer-events-none">
            <div className="flex flex-col items-center gap-1 text-primary/70">
              <Upload className="h-6 w-6" />
              <span className="text-xs font-medium">Drop files to attach</span>
            </div>
          </div>
        )}
      </div>

      {/* Queued steer / follow-up messages indicator */}
      <QueueIndicator />

      {/* Divider */}
      <Separator className="mt-3" />

      {/* Bottom tools row */}
      <div className="flex items-center gap-1 px-3 py-2">
        <FileUploadButton
          disabled={isStreaming}
          onFilesSelected={handleFilesSelected}
        />
        <div className="h-4 w-px bg-border mx-1" />
        <ModelSelector
          value={config?.defaultModelId ?? ''}
          onChange={(modelId) => updateConfigMut.mutate({ defaultModelId: modelId })}
        />
        <ThinkLevelSelector
          value={config?.defaultThinkLevel ?? 'medium'}
          onChange={(level) => updateConfigMut.mutate({ defaultThinkLevel: level })}
        />
        <div className="h-4 w-px bg-border mx-1" />
        <SkillSelector
          skills={DEFAULT_SKILLS}
          selectedIds={selectedSkills}
          onToggle={toggleSkill}
        />
        <CompactToggle compact={compactMode} onToggle={setCompactMode} />
        <div className="flex-1" />
        {isStreaming ? (
          <>
            <Button
              size="sm"
              variant="outline"
              onClick={handleSteerSubmit}
              disabled={!value.trim()}
              className="h-8 gap-1.5 text-xs"
              aria-label="Steer (Ctrl+Enter)"
            >
              <CornerDownRight className="h-3.5 w-3.5" />
              Steer
              <kbd className="ml-0.5 text-[10px] opacity-60 hidden sm:inline">⌃↵</kbd>
            </Button>
            <Button
              size="icon"
              variant="destructive"
              onClick={handleStopGeneration}
              className="h-8 w-8 shrink-0"
              aria-label="Stop generation"
            >
              <Square className="h-3.5 w-3.5" />
            </Button>
          </>
        ) : (
          <SendButton
            onClick={handleSubmit}
            disabled={!value.trim() || !activeSessionId}
            isLoading={sendMutation.isPending}
          />
        )}
      </div>
    </div>
  );
}
