import { useCallback, useMemo, useState, DragEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Square, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
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
    addStreamingBlock,
    updateStreamingBlock,
    clearStreamingBlocks,
    setStreamingUsage,
    setContextUsage,
    setSessionStats,
    setMessageTiming,
    setToolTiming,
  } = useComposerStore();

  // Highlighted index for keyboard navigation in popup menus
  const [highlightedSlashIndex, setHighlightedSlashIndex] = useState(0);
  const [highlightedMentionIndex, setHighlightedMentionIndex] = useState(0);

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
        const isImage = file.type.startsWith('image/');
        addAttachment({
          id,
          name: file.name,
          type: isImage ? 'image' : 'other',
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

  const sendMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!activeSessionId) return;
      clearStreamingBlocks();
      setMessageTiming(null);
      setSessionStats(null);
      setIsStreaming(true);

      // Collect image attachments with base64 data read
      const currentAttachments = useComposerStore.getState().pendingAttachments;
      const imageAttachments = currentAttachments
        .filter((a) => a.type === 'image' && a.data)
        .map((a) => ({ name: a.name, mimeType: a.mimeType, data: a.data! }));

      try {
        await sdk.chat.sendMessageStream(
          {
            sessionId: activeSessionId,
            content,
            workspaceCwd: activeWorkspaceId ?? undefined,
            modelId: config?.defaultModelId,
            attachments: imageAttachments.length > 0 ? imageAttachments : undefined,
          },
          (chunk) => {
            if (chunk.type === 'block' && chunk.block) {
              addStreamingBlock(chunk.block as ContentBlock);
            } else if (chunk.type === 'text' && chunk.content) {
              const blocks = useComposerStore.getState().streamingBlocks;
              const lastBlock = blocks[blocks.length - 1];
              if (lastBlock && lastBlock.type === 'text') {
                updateStreamingBlock(lastBlock.id, {
                  content: lastBlock.content + chunk.content,
                });
              } else {
                addStreamingBlock({
                  id: `text_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                  type: 'text',
                  content: chunk.content,
                });
              }
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
            } else if (chunk.type === 'error') {
              addStreamingBlock({
                id: `err_${Date.now()}`,
                type: 'text',
                content: `[错误] ${chunk.error || '未知错误'}`,
              });
            }
          },
        );
      } finally {
        setIsStreaming(false);
        clearStreamingBlocks();
      }
    },
    onSuccess: () => {
      setValue('');
      clearAttachments();
      queryClient.refetchQueries({ queryKey: ['session', activeSessionId] });
      queryClient.invalidateQueries({ queryKey: ['files'] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!value.trim() || !activeSessionId || sendMutation.isPending) return;
    sendMutation.mutate(value);
  }, [value, activeSessionId, sendMutation]);

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
      const withoutSlash = value.replace(/\/(\w*)$/, '');
      setValue(`${withoutSlash}${cmd.name} `);
      setShowSlashMenu(false);
      setHighlightedSlashIndex(0);
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
      const withoutMention = value.replace(/@([\w-]*)$/, '');
      setValue(`${withoutMention}@${item.label} `);
      setShowMentionMenu(false);
      setHighlightedMentionIndex(0);
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
          disabled={sendMutation.isPending}
          showMenu={showSlashMenu || showMentionMenu}
          onMenuNavigate={handleMenuNavigate}
          onMenuSelect={handleMenuSelect}
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

      {/* Divider */}
      <Separator className="mt-3" />

      {/* Bottom tools row */}
      <div className="flex items-center gap-1 px-3 py-2">
        <FileUploadButton
          disabled={sendMutation.isPending}
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
          <Button
            size="icon"
            variant="destructive"
            onClick={handleStopGeneration}
            className="h-9 w-9 shrink-0"
            aria-label="Stop generation"
          >
            <Square className="h-4 w-4" />
          </Button>
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
