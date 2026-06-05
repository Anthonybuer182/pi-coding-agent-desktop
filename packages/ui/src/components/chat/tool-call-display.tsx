import { Wrench, Loader2 } from 'lucide-react';
import type { ToolCallBlock } from '@pi/types';

interface ToolCallDisplayProps {
  block: ToolCallBlock;
  isStreaming?: boolean;
}

export function ToolCallDisplay({ block, isStreaming }: ToolCallDisplayProps) {
  const isRunning = isStreaming && !block.args;

  return (
    <div className="my-1 flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-1.5 text-xs">
      {isRunning ? (
        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
      ) : (
        <Wrench className="h-3 w-3 text-muted-foreground" />
      )}
      <span className="font-medium text-muted-foreground">{block.toolName}</span>
      {block.args && (
        <span className="text-muted-foreground/70 truncate">
          {JSON.stringify(block.args).slice(0, 60)}
        </span>
      )}
    </div>
  );
}
