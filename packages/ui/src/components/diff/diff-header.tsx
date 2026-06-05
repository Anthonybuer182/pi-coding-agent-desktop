import { FileDiff } from 'lucide-react';
import type { Diff } from '@pi/types';

interface DiffHeaderProps {
  diff: Diff;
}

const statusColors = {
  pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-950/30',
  accepted: 'text-green-600 bg-green-50 dark:bg-green-950/30',
  rejected: 'text-red-600 bg-red-50 dark:bg-red-950/30',
  partial: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30',
};

export function DiffHeader({ diff }: DiffHeaderProps) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2 text-xs">
      <FileDiff className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="flex-1 truncate font-medium">{diff.fileName}</span>
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusColors[diff.status]}`}>
        {diff.status}
      </span>
    </div>
  );
}
