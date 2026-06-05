import { cn } from '@/lib/utils';
import type { DiffLine as DiffLineType } from '@pi/types';

interface DiffLineProps {
  line: DiffLineType;
  isSelected?: boolean;
  onToggleSelect?: () => void;
}

export function DiffLine({ line, isSelected, onToggleSelect }: DiffLineProps) {
  return (
    <div
      onClick={onToggleSelect}
      className={cn(
        'flex cursor-pointer font-mono text-xs leading-5',
        line.type === 'add' && 'bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300',
        line.type === 'remove' && 'bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-300',
        line.type === 'context' && 'text-muted-foreground',
        isSelected && 'ring-1 ring-primary',
      )}
    >
      <span className="inline-flex w-12 select-none justify-end px-2 text-muted-foreground">
        {line.oldLineNumber ?? ' '}
      </span>
      <span className="inline-flex w-12 select-none justify-end px-2 text-muted-foreground border-r">
        {line.newLineNumber ?? ' '}
      </span>
      <span className="flex-1 px-2 whitespace-pre">
        <span className="mr-2 select-none">
          {line.type === 'add' ? '+' : line.type === 'remove' ? '-' : ' '}
        </span>
        {line.content}
      </span>
    </div>
  );
}
