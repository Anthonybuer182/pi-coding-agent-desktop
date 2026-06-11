import { X, CornerDownRight, ListEnd } from 'lucide-react';
import { useComposerStore } from '@/stores/composer-store';

/**
 * Shows queued steering and follow-up messages above the composer
 * during agent streaming. Displays as dismissible chips.
 */
export function QueueIndicator() {
  const steeringQueue = useComposerStore((s) => s.steeringQueue);
  const followUpQueue = useComposerStore((s) => s.followUpQueue);
  const isStreaming = useComposerStore((s) => s.isStreaming);
  const removeQueuedItem = useComposerStore((s) => s.removeQueuedItem);
  const total = steeringQueue.length + followUpQueue.length;

  if (!isStreaming || total === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-1.5 pt-2">
      {steeringQueue.map((msg, i) => (
        <QueueChip
          key={`steer-${i}`}
          type="steer"
          message={msg}
          onRemove={() => removeQueuedItem('steer', i)}
        />
      ))}
      {followUpQueue.map((msg, i) => (
        <QueueChip
          key={`follow-${i}`}
          type="follow-up"
          message={msg}
          onRemove={() => removeQueuedItem('followUp', i)}
        />
      ))}
    </div>
  );
}

function QueueChip({
  type,
  message,
  onRemove,
}: {
  type: 'steer' | 'follow-up';
  message: string;
  onRemove: () => void;
}) {
  const Icon = type === 'steer' ? CornerDownRight : ListEnd;
  const label = type === 'steer' ? 'Steer' : 'Follow-up';

  return (
    <div
      className="inline-flex items-center gap-1 rounded-full border bg-muted/50 pl-2.5 pr-1 py-1 text-xs"
      title={`${label}: ${message}`}
    >
      <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground max-w-[160px] truncate">{message}</span>
      <button
        type="button"
        onClick={onRemove}
        className="ml-0.5 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
        aria-label={`Remove ${label}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
