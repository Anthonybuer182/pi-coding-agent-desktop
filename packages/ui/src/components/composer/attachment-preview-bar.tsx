import { X, File, Image as ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Attachment } from '@pi/types';

interface AttachmentPreviewBarProps {
  attachments: Attachment[];
  onRemove: (id: string) => void;
}

export function AttachmentPreviewBar({ attachments, onRemove }: AttachmentPreviewBarProps) {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 border-t px-3 py-2">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="group relative flex items-center gap-2 rounded-md border bg-muted/50 px-2 py-1 text-xs"
        >
          {att.type === 'image' ? (
            <ImageIcon className="h-3 w-3" />
          ) : (
            <File className="h-3 w-3" />
          )}
          <span className="max-w-[120px] truncate">{att.name}</span>
          <Button
            variant="ghost"
            size="icon-sm"
            className="h-4 w-4 opacity-0 group-hover:opacity-100"
            onClick={() => onRemove(att.id)}
            aria-label={`Remove ${att.name}`}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}
