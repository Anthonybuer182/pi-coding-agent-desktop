import { Wrench, Loader2, ChevronDown, ChevronRight, Play, CheckCircle2, XCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import type { ToolCallBlock, ToolResultBlock } from '@pi/types';
import './chat-animations.css';

interface ToolCallDisplayProps {
  block: ToolCallBlock;
  result?: ToolResultBlock;
  isStreaming?: boolean;
  durationMs?: number;
}

function formatArgs(args: Record<string, unknown> | undefined): string {
  if (!args) return '';
  try {
    return JSON.stringify(args, null, 2);
  } catch {
    return String(args);
  }
}

function formatPreview(args: Record<string, unknown> | undefined): string {
  if (!args) return '';
  // Show first meaningful key-value
  const entries = Object.entries(args);
  if (entries.length === 0) return '';
  const [key, val] = entries[0];
  const valStr = typeof val === 'string' && val.length > 40
    ? val.slice(0, 40) + '...'
    : String(val).slice(0, 40);
  return `${key}=${valStr}`;
}

export function ToolCallDisplay({ block, result, isStreaming, durationMs }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const isRunning = isStreaming && !result;
  const hasError = result?.isError;

  // Auto-expand during streaming, but only if user hasn't manually collapsed
  useEffect(() => {
    if (isStreaming && block.args && !userCollapsed) {
      setExpanded(true);
    }
  }, [isStreaming, block.args, userCollapsed]);

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false);
      setUserCollapsed(true);
    } else {
      setExpanded(true);
      setUserCollapsed(false);
    }
  };

  return (
    <div className={cn(
      'my-1 rounded-md border-l-2 bg-emerald-50/50 dark:bg-emerald-950/20',
      'animate-streaming-in',
      isRunning
        ? 'border-emerald-400'
        : hasError
          ? 'border-red-500'
          : 'border-emerald-500',
    )}>
      <button
        className="flex w-full items-center gap-2 px-3 py-1.5 text-xs hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20"
        onClick={handleToggle}
      >
        {expanded ? (
          <ChevronDown className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <ChevronRight className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        {isRunning ? (
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : result ? (
          hasError ? (
            <XCircle className="h-3 w-3 text-red-500 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
          )
        ) : (
          <Wrench className="h-3 w-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
        )}
        <Play className="h-3 w-3 text-emerald-600/70 dark:text-emerald-400/70 shrink-0" />
        <span className="font-medium text-emerald-700 dark:text-emerald-300">
          {block.toolName}
        </span>
        {!expanded && block.args && (
          <span className="text-muted-foreground/60 truncate">
            {formatPreview(block.args)}
          </span>
        )}
        {isRunning && (
          <span className="ml-auto text-emerald-500/70 dark:text-emerald-400/50 animate-pulse shrink-0">
            running...
          </span>
        )}
        {durationMs != null && !isRunning && (
          <span className="ml-auto text-emerald-500/70 dark:text-emerald-400/50 shrink-0">
            {durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`}
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-emerald-200 dark:border-emerald-800/50">
          {block.args && (
            <div className="px-3 py-2">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/60">
                Input
              </div>
              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono max-h-48 overflow-y-auto">
                {formatArgs(block.args)}
              </pre>
            </div>
          )}
          {result && (
            <div className="px-3 py-2 border-t border-emerald-200/50 dark:border-emerald-800/30">
              <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/60">
                Output
              </div>
              <pre className={cn(
                'text-xs whitespace-pre-wrap font-mono max-h-64 overflow-y-auto',
                hasError ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground',
              )}>
                {result.result
                  ? result.result.length > 2000
                    ? result.result.slice(0, 2000) + '\n... (truncated)'
                    : result.result
                  : '(empty)'}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
