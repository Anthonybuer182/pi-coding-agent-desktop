import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { Code, Eye, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CodeEditor } from './code-editor';
import { LoadingSpinner } from '@/components/common/loading-spinner';

export function HTMLPreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);
  const [mode, setMode] = useState<'preview' | 'source'>('preview');
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const { data: file, isLoading } = useQuery({
    queryKey: ['file', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.read(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.html'),
  });

  useEffect(() => {
    if (mode === 'preview' && file?.content && iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(file.content);
        doc.close();
      }
    }
  }, [file?.content, mode]);

  if (!activePreviewFilePath) return null;
  if (isLoading) return <LoadingSpinner message="Loading HTML..." />;

  const fileName = activePreviewFilePath.split('/').pop() ?? 'HTML Page';

  if (mode === 'source') {
    return (
      <CodeEditor
        headerActions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMode('preview')}
            className="h-6 gap-1 text-xs"
          >
            <Eye className="h-3 w-3" />
            Preview
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {fileName}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setMode('source')}
          className="h-7 text-xs gap-1.5"
        >
          <Code className="h-3 w-3" />
          View Source
        </Button>
      </div>
      <div className="flex-1 bg-white">
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          title="HTML Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}
