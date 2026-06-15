import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { ToolCallBlock, ToolResultBlock } from '@pi/types';
import './chat-animations.css';

interface ToolCallDisplayProps {
  block: ToolCallBlock;
  result?: ToolResultBlock;
  isStreaming?: boolean;
  durationMs?: number;
}

function formatDuration(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function getToolPreview(block: ToolCallBlock): string {
  const input = block.args;
  if (!input || typeof input !== 'object') return '';
  const keys = Object.keys(input);
  if (keys.length === 0) return '';

  if ('command' in input) return String(input.command).slice(0, 120);
  if ('path' in input) return String(input.path).slice(0, 120);
  if ('file_path' in input) return String(input.file_path).slice(0, 120);
  if ('pattern' in input) return String(input.pattern).slice(0, 120);
  if ('query' in input) return String(input.query).slice(0, 120);
  if ('url' in input) return String(input.url).slice(0, 120);

  const first = input[keys[0]];
  return String(first).slice(0, 120);
}

export function ToolCallDisplay({ block, result, isStreaming, durationMs }: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(false);
  const [userCollapsed, setUserCollapsed] = useState(false);
  const isRunning = isStreaming && !result;
  const hasError = result?.isError;
  const rawResult = result?.result;
  const resultText = rawResult == null
    ? ''
    : typeof rawResult === 'string'
      ? rawResult
      : JSON.stringify(rawResult);
  const resultIsEmpty = result ? (resultText.trim() === '' || resultText.trim() === '(empty)') : false;

  const handleToggle = () => {
    if (expanded) {
      setExpanded(false);
      setUserCollapsed(true);
    } else {
      setExpanded(true);
      setUserCollapsed(false);
    }
  };

  const preview = getToolPreview(block);

  const statusColor = hasError
    ? 'border-red-200/50 dark:border-red-800/30 bg-red-50/20 dark:bg-red-950/5'
    : 'border-emerald-200/30 dark:border-emerald-800/20 bg-emerald-50/20 dark:bg-emerald-950/5';

  return (
    <div className={cn(
      'my-1 rounded-md border overflow-hidden text-xs animate-streaming-in',
      isRunning
        ? 'border-emerald-400/40 bg-emerald-50/30 dark:bg-emerald-950/10'
        : statusColor,
    )}>
      {/* ── Header row ── */}
      <button
        className="flex w-full items-center gap-1.5 px-2.5 py-1.5 hover:bg-muted/30 text-left min-w-0"
        onClick={handleToggle}
      >
        {/* Status icon */}
        {isRunning ? (
          <Loader2 className="h-3 w-3 animate-spin text-emerald-600 dark:text-emerald-400 shrink-0" />
        ) : (
          <span className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            hasError ? 'bg-red-500' : 'bg-emerald-500',
          )} />
        )}

        {/* Tool name */}
        <span className={cn(
          'font-semibold font-mono text-[11px] shrink-0',
          hasError ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300',
        )}>
          {block.toolName}
        </span>

        {/* Args preview (always visible, like reference) */}
        {preview && (
          <span className="text-muted-foreground/60 font-mono text-[11px] truncate flex-1 min-w-0">
            {preview}
          </span>
        )}

        {/* Running indicator (only when collapsed) */}
        {isRunning && !expanded && (
          <span className="text-emerald-600/70 dark:text-emerald-400/50 animate-pulse shrink-0 ml-auto">
            running...
          </span>
        )}

        {/* Duration */}
        {durationMs != null && !isRunning && (
          <span className="ml-auto text-muted-foreground/60 tabular-nums shrink-0">
            {formatDuration(durationMs)}
          </span>
        )}

        {/* Chevron */}
        <svg
          width="10" height="10" viewBox="0 0 10 10" fill="none"
          stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
          className={cn(
            'shrink-0 text-muted-foreground/50 transition-transform duration-150',
            expanded ? 'rotate-180' : '',
          )}
        >
          <polyline points="2 3.5 5 6.5 8 3.5" />
        </svg>
      </button>

      {/* ── Expanded: args + result ── */}
      {expanded && (
        <div className="border-t border-border/40">
          {/* Input args */}
          {block.args && Object.keys(block.args).length > 0 && (
            <pre className="px-2.5 py-2 text-muted-foreground whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto">
              {JSON.stringify(block.args, null, 2)}
            </pre>
          )}

          {/* Result — only shown when available and expanded (like reference) */}
          {result && (
            <pre className={cn(
              'px-2.5 py-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed max-h-64 overflow-y-auto',
              'border-t border-border/30',
              hasError
                ? 'text-red-600 dark:text-red-400 bg-red-50/10 dark:bg-red-950/5'
                : resultIsEmpty
                  ? 'text-muted-foreground/50 italic'
                  : 'text-muted-foreground bg-muted/20',
            )}>
              {resultIsEmpty ? '(no output)' : resultText.length > 2000 ? resultText.slice(0, 2000) + '\n... (truncated)' : resultText}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
