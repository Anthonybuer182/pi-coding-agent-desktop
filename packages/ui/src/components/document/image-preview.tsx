import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { Image as ImageIcon } from 'lucide-react';

export function ImagePreview() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activePreviewFilePath = useUIStore((s) => s.activePreviewFilePath);

  const { data: file, isLoading } = useQuery({
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

  if (!file) return null;

  // For mock: the file content may be a data URL or we show a placeholder
  const isBase64 = file.content?.startsWith('data:');
  const src = isBase64 ? file.content : undefined;

  return (
    <div className="flex h-full flex-col items-center justify-center bg-muted/20 p-4">
      {src ? (
        <img
          src={src}
          alt={file.path ?? 'Preview'}
          className="max-h-full max-w-full rounded-lg object-contain shadow-lg"
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <ImageIcon className="h-16 w-16" />
          <p className="text-xs">{file.path ?? 'Image not available'}</p>
        </div>
      )}
    </div>
  );
}
