import { Brain, ChevronDown, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ThinkingBlock as ThinkingBlockType } from '@pi/types';
import './chat-animations.css';

interface ThinkingBlockProps {
  block: ThinkingBlockType;
  isStreaming?: boolean;
}

export function ThinkingBlock({ block, isStreaming }: ThinkingBlockProps) {
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when new thinking content arrives during streaming
  useEffect(() => {
    if (isStreaming && block.thinking) {
      setExpanded(true);
    }
  }, [block.thinking, isStreaming]);

  const duration = block.duration
    ? block.duration >= 1000
      ? `${(block.duration / 1000).toFixed(1)}s`
      : `${block.duration}ms`
    : null;

  return (
    <div className={cn(
      'my-1 rounded-md border-l-2 bg-emerald-50/50 dark:bg-emerald-950/20',
      'animate-streaming-in',
      isStreaming ? 'border-emerald-400' : 'border-emerald-500',
    )}>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20"
        onClick={() => setExpanded(!expanded)}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        ) : (
          <ChevronRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        )}
        <Brain className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          Thinking
        </span>
        {duration && (
          <span className="text-emerald-500/70 dark:text-emerald-400/50">
            ({duration})
          </span>
        )}
        {isStreaming && !block.thinking && (
          <span className="text-emerald-500/70 dark:text-emerald-400/50 animate-pulse">
            ...
          </span>
        )}
      </button>
      {expanded && block.thinking && (
        <div className="border-t border-emerald-200 dark:border-emerald-800/50 px-3 py-2 text-xs text-muted-foreground whitespace-pre-wrap max-h-64 overflow-y-auto">
          {block.thinking}
        </div>
      )}
    </div>
  );
}
