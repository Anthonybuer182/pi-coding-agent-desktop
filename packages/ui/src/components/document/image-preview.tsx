import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Image as ImageIcon } from 'lucide-react';

export function ImagePreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);

  const { data: file, isLoading, error } = useQuery({
    queryKey: ['file', activeWorkspaceId, activePreviewFilePath],
    queryFn: () => sdk.file.read(activeWorkspaceId!, activePreviewFilePath!),
    enabled:
      !!activeWorkspaceId &&
      !!activePreviewFilePath &&
      /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(activePreviewFilePath),
  });

  if (
    !activePreviewFilePath ||
    !/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(activePreviewFilePath)
  ) {
    return null;
  }

  if (isLoading) return <LoadingSpinner message="Loading image..." />;

  // Build image src from file content
  const src = (() => {
    if (!file?.content) return undefined;
    if (file.encoding === 'base64') {
      const mimeType = file.mimeType ?? 'image/png';
      return `data:${mimeType};base64,${file.content}`;
    }
    // Legacy: check if content is already a data URL
    if (file.content.startsWith('data:')) return file.content;
    return undefined;
  })();

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b px-3 py-2 text-xs text-muted-foreground">
        <ImageIcon className="h-3.5 w-3.5" />
        <span className="truncate">{file?.path ?? activePreviewFilePath}</span>
        {file?.mimeType && <span className="text-[10px] opacity-50">{file.mimeType}</span>}
      </div>
      <div className="flex-1 flex items-center justify-center bg-muted/20 p-4">
        {src ? (
          <img
            src={src}
            alt={file?.path ?? 'Preview'}
            className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
          />
        ) : error ? (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-16 w-16" />
            <p className="text-xs text-destructive">Failed to load image</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <ImageIcon className="h-16 w-16" />
            <p className="text-xs">{file?.path ?? 'Image not available'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
