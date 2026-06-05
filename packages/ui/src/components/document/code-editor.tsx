import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { FileCode } from 'lucide-react';
import Editor, { loader } from '@monaco-editor/react';

// Point Monaco to local node_modules CDN
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.45.0/min/vs' } });

export function CodeEditor() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);

  const { data: file, isLoading } = useQuery({
    queryKey: ['file', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.read(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath,
  });

  if (!activePreviewFilePath) return null;
  if (isLoading) return <LoadingSpinner message="Loading file..." />;
  if (!file) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <FileCode className="h-3.5 w-3.5" />
        <span className="truncate">{file.path}</span>
        {file.language && <span className="tabular-nums">{file.language}</span>}
      </div>
      <div className="flex-1">
        <Editor
          value={file.content}
          language={file.language ?? 'plaintext'}
          theme="vs-dark"
          options={{
            readOnly: true,
            minimap: { enabled: false },
            fontSize: 13,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
          }}
          loading={<LoadingSpinner message="Loading editor..." />}
        />
      </div>
    </div>
  );
}
