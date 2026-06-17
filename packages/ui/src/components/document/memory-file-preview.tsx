import { useUIStore } from '@/stores/ui-store';
import { Download, File, FileWarning } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function MemoryFilePreview() {
  const filePath = useUIStore((s) => s.activePreviewFilePath);
  const memoryPreviews = useUIStore((s) => s.memoryPreviews);
  const clearMemoryPreview = useUIStore((s) => s.clearMemoryPreview);

  if (!filePath) return null;
  const info = memoryPreviews[filePath];

  if (!info) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground p-8">
        <FileWarning className="h-10 w-10" />
        <p className="text-sm">File data no longer available in memory</p>
      </div>
    );
  }

  const { fileName, mimeType, data } = info;
  const dataUrl = `data:${mimeType};base64,${data}`;

  // Image preview
  if (mimeType.startsWith('image/')) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-sm font-medium truncate">{fileName}</span>
        </div>
        <div className="flex-1 flex items-center justify-center p-4 bg-muted/10">
          <img
            src={dataUrl}
            alt={fileName}
            className="max-w-full max-h-full object-contain rounded-md"
          />
        </div>
      </div>
    );
  }

  // Text preview
  const TEXT_MIMES = new Set([
    'text/plain', 'text/html', 'text/css', 'text/csv', 'text/xml',
    'text/javascript', 'text/typescript', 'text/markdown',
    'text/x-python', 'text/x-java', 'text/x-rust', 'text/x-go',
    'text/x-c', 'text/x-c++', 'text/x-sh',
    'application/json', 'application/javascript', 'application/typescript',
    'application/xml', 'application/x-yaml',
  ]);

  if (TEXT_MIMES.has(mimeType)) {
    let textContent: string;
    try {
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      textContent = new TextDecoder().decode(bytes);
    } catch {
      textContent = '[Binary content - cannot decode]';
    }

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30">
          <span className="text-sm font-medium truncate">{fileName}</span>
          <a
            href={dataUrl}
            download={fileName}
            className="p-1.5 rounded hover:bg-muted"
            title="Download"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>
        <div className="flex-1 overflow-auto">
          <pre className="text-xs leading-relaxed p-4 font-mono whitespace-pre-wrap break-all">
            {textContent}
          </pre>
        </div>
      </div>
    );
  }

  // PDF preview (not supported in-memory)
  if (mimeType === 'application/pdf') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
        <File className="h-12 w-12" />
        <p className="text-sm font-medium">{fileName}</p>
        <p className="text-xs text-center">PDF preview not available for directly attached files</p>
        <a href={dataUrl} download={fileName}>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </a>
      </div>
    );
  }

  // Office documents (.docx, .xlsx, .pptx)
  if (
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    mimeType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
    mimeType === 'application/msword'
  ) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
        <File className="h-12 w-12" />
        <p className="text-sm font-medium">{fileName}</p>
        <p className="text-xs text-center">Office document preview not available for directly attached files</p>
        <a href={dataUrl} download={fileName}>
          <Button variant="outline" size="sm">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Download
          </Button>
        </a>
      </div>
    );
  }

  // Default: show file info with download
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-8">
      <File className="h-12 w-12" />
      <p className="text-sm font-medium">{fileName}</p>
      <p className="text-xs">{mimeType}</p>
      <a href={dataUrl} download={fileName}>
        <Button variant="outline" size="sm">
          <Download className="h-3.5 w-3.5 mr-1.5" />
          Download
        </Button>
      </a>
    </div>
  );
}
