import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { Eye, FileText, AlignLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/common/loading-spinner';

export function DocxPreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);
  const [mode, setMode] = useState<'preview' | 'text'>('preview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['office', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.readOffice(activeWorkspaceId!, activePreviewFilePath!),
    enabled: !!activeWorkspaceId && !!activePreviewFilePath && activePreviewFilePath.endsWith('.docx'),
  });

  if (!activePreviewFilePath) return null;
  if (isLoading) return <LoadingSpinner message="Loading document..." />;

  const fileName = activePreviewFilePath.split('/').pop() ?? 'Document.docx';

  if (error || !data || data.doc.type !== 'docx') {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
        <div className="flex flex-col items-center gap-2">
          <FileText className="h-8 w-8" />
          <span>{error ? 'Failed to load document' : 'Unsupported document'}</span>
        </div>
      </div>
    );
  }

  const doc = data.doc;

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <span className="text-xs text-muted-foreground truncate flex-1 mr-2">
          {fileName}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant={mode === 'preview' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('preview')}
            className="h-7 text-xs gap-1.5"
          >
            <Eye className="h-3 w-3" />
            Preview
          </Button>
          <Button
            variant={mode === 'text' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('text')}
            className="h-7 text-xs gap-1.5"
          >
            <AlignLeft className="h-3 w-3" />
            Text
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {mode === 'preview' ? (
          <iframe
            className="w-full h-full border-0 bg-white rounded"
            srcDoc={wrapContentHtml(doc.html, fileName)}
            title="Document Preview"
            sandbox="allow-scripts"
          />
        ) : (
          <pre className="text-sm whitespace-pre-wrap font-sans text-foreground leading-relaxed">
            {doc.text}
          </pre>
        )}
      </div>
    </div>
  );
}

function wrapContentHtml(html: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:800px;margin:0 auto;padding:20px;line-height:1.6;color:#1a1a1a}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ddd;padding:8px}img{max-width:100%}</style>
</head><body>${html}</body></html>`;
}
