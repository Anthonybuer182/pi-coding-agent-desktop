import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ToolResultBlock } from '@pi/types';

interface ToolResultDisplayProps {
  block: ToolResultBlock;
}

export function ToolResultDisplay({ block }: ToolResultDisplayProps) {
  return (
    <div className={cn(
      'my-1 rounded-md border px-3 py-1.5 text-xs',
      block.isError ? 'border-destructive/50 bg-destructive/10 text-destructive' : 'border-muted bg-muted/30'
    )}>
      <div className="flex items-center gap-1.5 mb-1">
        {block.isError ? (
          <XCircle className="h-3 w-3" />
        ) : (
          <CheckCircle2 className="h-3 w-3 text-green-600" />
        )}
        <span className="font-medium text-muted-foreground">Result</span>
      </div>
      <pre className="whitespace-pre-wrap font-mono text-[11px] text-muted-foreground/80">
        {block.result}
      </pre>
    </div>
  );
}
