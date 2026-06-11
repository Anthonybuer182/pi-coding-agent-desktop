import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Eye, Pencil, Save, Check, Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export function MarkdownPreview() {
  const sdk = useSDK();
  const queryClient = useQueryClient();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);

  const [isEditing, setIsEditing] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const originalContentRef = useRef('');

  const { data: file, isLoading } = useQuery({
    queryKey: ['file', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.read(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.md'),
  });

  // Sync content when file loads
  useEffect(() => {
    if (file?.content) {
      setEditorContent(file.content);
      originalContentRef.current = file.content;
      setIsDirty(false);
    }
  }, [file?.content]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!activeWorkspaceId || !activePreviewFilePath) return;
      await sdk.file.write(activeWorkspaceId, activePreviewFilePath, editorContent);
    },
    onSuccess: () => {
      originalContentRef.current = editorContent;
      setIsDirty(false);
      queryClient.invalidateQueries({ queryKey: ['files', activeWorkspaceId] });
    },
  });

  const handleSave = useCallback(() => {
    saveMutation.mutate();
  }, [saveMutation]);

  // Ctrl+S to save when editing
  useEffect(() => {
    if (!isEditing) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isEditing, handleSave]);

  if (!activePreviewFilePath || !activePreviewFilePath.endsWith('.md')) return null;
  if (isLoading) return <LoadingSpinner message="Loading preview..." />;
  if (!file) return null;

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center gap-2 border-b px-3 py-1.5 text-xs text-muted-foreground">
        <FileText className="h-3.5 w-3.5" />
        <span className="truncate flex-1">{file.path}</span>
        {isDirty && (
          <span className="h-1.5 w-1.5 rounded-full bg-orange-400" title="Unsaved changes" />
        )}
        {isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || saveMutation.isPending}
            className="h-6 gap-1 text-xs"
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : saveMutation.isSuccess && !isDirty ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            {saveMutation.isPending ? 'Saving...' : 'Save'}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(!isEditing)}
          className="h-6 gap-1 text-xs"
        >
          {isEditing ? (
            <>
              <Eye className="h-3 w-3" /> Preview
            </>
          ) : (
            <>
              <Pencil className="h-3 w-3" /> Edit
            </>
          )}
        </Button>
      </div>

      {/* Content */}
      {isEditing ? (
        <textarea
          value={editorContent}
          onChange={(e) => {
            setEditorContent(e.target.value);
            setIsDirty(e.target.value !== originalContentRef.current);
          }}
          className="flex-1 w-full resize-none border-0 bg-background p-4 font-mono text-sm outline-none focus:outline-none"
          spellCheck={false}
          placeholder="Enter markdown content..."
        />
      ) : (
        <ScrollArea className="flex-1">
          <div className="prose prose-sm dark:prose-invert max-w-none p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {editorContent || file.content}
            </ReactMarkdown>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
