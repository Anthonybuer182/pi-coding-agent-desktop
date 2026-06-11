import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { FileSpreadsheet, FileText, Presentation } from 'lucide-react';

function getFileIcon(ext: string) {
  if (ext === 'xlsx' || ext === 'xls') return FileSpreadsheet;
  if (ext === 'pptx' || ext === 'ppt') return Presentation;
  return FileText;
}

function getFileTypeLabel(ext: string): string {
  if (ext === 'xlsx' || ext === 'xls') return 'Spreadsheet';
  if (ext === 'pptx' || ext === 'ppt') return 'Presentation';
  if (ext === 'docx' || ext === 'doc') return 'Word Document';
  return 'Office Document';
}

function formatSize(bytes: number | undefined): string {
  if (bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function OfficeDocPreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);

  const { data: file, isLoading } = useQuery({
    queryKey: ['file', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.read(activeWorkspaceId!, activePreviewFilePath!),
    enabled:
      !!activeWorkspaceId &&
      !!activePreviewFilePath &&
      /\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(activePreviewFilePath),
  });

  if (
    !activePreviewFilePath ||
    !/\.(doc|docx|xls|xlsx|ppt|pptx)$/i.test(activePreviewFilePath)
  ) {
    return null;
  }

  if (isLoading) return <LoadingSpinner message="Loading document..." />;

  const fileName = activePreviewFilePath.split('/').pop() ?? '';
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const FileIconComp = getFileIcon(ext);
  const fileType = getFileTypeLabel(ext);

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <FileIconComp className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground truncate max-w-[200px]">
            {fileName}
          </span>
          <span className="text-[10px] text-muted-foreground/60 uppercase bg-muted px-1.5 py-0.5 rounded">
            {ext}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="flex flex-col items-center gap-3 text-muted-foreground p-8 max-w-xs">
          <FileIconComp className="h-16 w-16" />
          <p className="text-sm font-medium text-center break-all">{fileName}</p>
          <span className="text-xs px-2 py-0.5 rounded bg-muted">{fileType}</span>
          {file && (
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-[11px] text-muted-foreground/70">
                {formatSize(file.size)}
              </p>
              <p className="text-[10px] text-muted-foreground/50 truncate max-w-[250px]">
                {file.path}
              </p>
            </div>
          )}
          <p className="text-[11px] text-center text-muted-foreground/60 mt-2">
            {ext === 'xlsx' || ext === 'xls'
              ? 'Open this file in Excel or another spreadsheet application to edit.'
              : ext === 'pptx' || ext === 'ppt'
                ? 'Open this file in PowerPoint or another presentation application to edit.'
                : 'Open this file in Word or another word processor to edit.'}
          </p>
        </div>
      </div>
    </div>
  );
}
