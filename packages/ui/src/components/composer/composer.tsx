import { useCallback, useMemo, DragEvent } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Square } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
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
import { MOCK_SLASH_COMMANDS } from '@pi/sdk-wrapper';

export function Composer() {
  const sdk = useSDK();
  const queryClient = useQueryClient();
  const activeSessionId = useUIStore((s) => s.activeSessionId);
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
    removeAttachment,
  } = useComposerStore();

  const handleFilesSelected = useCallback(
    (files: File[]) => {
      files.forEach((file) => {
        addAttachment({
          id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type.startsWith('image/') ? 'image' : 'other',
          size: file.size,
          mimeType: file.type || 'application/octet-stream',
          status: 'uploading',
          createdAt: new Date().toISOString(),
        });
      });
    },
    [addAttachment],
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
    [handleFilesSelected],
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

  const mentionItems = useMemo<MentionItem[]>(() => {
    const items: MentionItem[] = [];
    workspaces?.forEach((w) =>
      items.push({ id: `ws-${w.id}`, type: 'workspace', label: w.name, description: `${w.sessionCount} sessions` }),
    );
    sessions?.forEach((s) =>
      items.push({ id: `sess-${s.id}`, type: 'session', label: s.title, description: `${s.messageCount} messages` }),
    );
    items.push(
      { id: 'file-default', type: 'file', label: 'current file', description: 'Reference current file' },
      { id: 'folder-default', type: 'folder', label: 'project root', description: 'Reference project folder' },
      { id: 'code-default', type: 'code', label: 'selection', description: 'Current code selection' },
    );
    return items;
  }, [workspaces, sessions]);

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
      setIsStreaming(true);
      try {
        await sdk.chat.sendMessageStream(
          {
            sessionId: activeSessionId,
            content,
          },
          (chunk) => {
            // Stream handling will be implemented
          },
        );
      } finally {
        setIsStreaming(false);
      }
    },
    onSuccess: () => {
      setValue('');
      queryClient.invalidateQueries({ queryKey: ['session', activeSessionId] });
    },
  });

  const handleSubmit = useCallback(() => {
    if (!value.trim() || !activeSessionId || sendMutation.isPending) return;
    sendMutation.mutate(value);
  }, [value, activeSessionId, sendMutation]);

  const handleSlashDetect = useCallback(
    (query: string) => {
      setShowSlashMenu(true, query);
    },
    [setShowSlashMenu],
  );

  const handleSlashSelect = useCallback(
    (cmd: import('@pi/types').SlashCommand) => {
      const withoutSlash = value.replace(/\/(\w*)$/, '');
      setValue(`${withoutSlash}${cmd.name} `);
      setShowSlashMenu(false);
    },
    [value, setValue, setShowSlashMenu],
  );

  const handleMentionDetect = useCallback(
    (query: string) => {
      setShowMentionMenu(true, query);
      setShowSlashMenu(false);
    },
    [setShowMentionMenu, setShowSlashMenu],
  );

  const handleMentionSelect = useCallback(
    (item: MentionItem) => {
      const withoutMention = value.replace(/@([\w-]*)$/, '');
      setValue(`${withoutMention}@${item.label} `);
      setShowMentionMenu(false);
    },
    [value, setValue, setShowMentionMenu],
  );

  const handleSlashDismiss = useCallback(() => setShowSlashMenu(false), [setShowSlashMenu]);
  const handleMentionDismiss = useCallback(() => setShowMentionMenu(false), [setShowMentionMenu]);

  if (!activeSessionId) return null;

  return (
    <div
      className={cn(
        'relative border-t bg-background',
        isDragging && 'ring-2 ring-primary/50',
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <AttachmentPreviewBar
        attachments={pendingAttachments}
        onRemove={removeAttachment}
      />
      <div className="flex items-end gap-1 px-2 py-2">
        <FileUploadButton
          disabled={sendMutation.isPending}
          onFilesSelected={handleFilesSelected}
        />
        <div className="relative flex-1">
          {showSlashMenu && (
            <SlashCommandMenu
              commands={MOCK_SLASH_COMMANDS}
              query={slashQuery}
              onSelect={handleSlashSelect}
            />
          )}
          {showMentionMenu && (
            <MentionMenu
              items={mentionItems}
              query={mentionQuery}
              onSelect={handleMentionSelect}
            />
          )}
          <ComposerInput
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            onSlashDetected={handleSlashDetect}
            onMentionDetected={handleMentionDetect}
            onSlashDismiss={handleSlashDismiss}
            onMentionDismiss={handleMentionDismiss}
            disabled={sendMutation.isPending}
          />
        </div>
        <SendButton
          onClick={handleSubmit}
          disabled={!value.trim() || !activeSessionId}
          isLoading={sendMutation.isPending}
        />
        {isStreaming && (
          <Button
            size="icon"
            variant="destructive"
            onClick={handleStopGeneration}
            className="h-9 w-9 shrink-0"
            aria-label="Stop generation"
          >
            <Square className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
