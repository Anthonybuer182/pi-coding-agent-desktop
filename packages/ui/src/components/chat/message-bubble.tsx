import type { Message, ContentBlock, ThinkingBlock as ThinkingBlockType, ToolCallBlock, ToolResultBlock, AssistantMessage, TokenUsage, ContextUsageInfo, MessageTiming } from '@pi/types';
import { cn } from '@/lib/utils';
import { UserIcon, Bot, Clock, Zap, FileText } from 'lucide-react';
import { ThinkingBlock } from './thinking-block';
import { ToolCallDisplay } from './tool-call-display';
import { MarkdownContent } from './markdown-content';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  contextUsage?: ContextUsageInfo;
  messageTiming?: MessageTiming;
  toolTimings?: Map<string, number>;
}

/**
 * Pair tool_call blocks with their corresponding tool_result blocks.
 * Returns an array of rendered elements, where tool_call + result are grouped.
 */
function renderBlocks(blocks: ContentBlock[], isStreaming: boolean, toolTimings: Map<string, number>) {
  const resultMap = new Map<string, ToolResultBlock>();
  const elements: React.ReactNode[] = [];

  // First pass: collect all tool_results by toolCallId
  for (const block of blocks) {
    if (block.type === 'tool_result') {
      const resultBlock = block as ToolResultBlock;
      resultMap.set(resultBlock.toolCallId, resultBlock);
    }
  }

  // Second pass: render blocks, pairing tool_calls with results
  for (const block of blocks) {
    switch (block.type) {
      case 'text':
        elements.push(
          <MarkdownContent key={block.id} content={block.content} isStreaming={isStreaming} />,
        );
        break;
      case 'thinking':
        elements.push(
          <ThinkingBlock key={block.id} block={block as ThinkingBlockType} isStreaming={isStreaming} />,
        );
        break;
      case 'tool_call': {
        const tcBlock = block as ToolCallBlock;
        const result = resultMap.get(tcBlock.toolCallId);
        const toolMs = toolTimings.get(tcBlock.toolCallId) ?? tcBlock.durationMs;
        elements.push(
          <ToolCallDisplay
            key={tcBlock.id}
            block={tcBlock}
            result={result}
            isStreaming={isStreaming && !result}
            durationMs={toolMs}
          />,
        );
        break;
      }
      case 'tool_result':
        // Skip - already rendered with their tool_call parent
        break;
      default:
        break;
    }
  }

  return elements;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/** Per-message metrics bar shown at bottom of assistant messages */
function MessageMetrics({ timing, contentLength, isStreaming }: { timing?: MessageTiming; contentLength: number; isStreaming: boolean }) {
  const estTokens = timing?.estTokens ?? Math.ceil(contentLength / 4);

  // Only show real metrics if we have timing data; otherwise just est
  if (!timing && isStreaming) return null;

  return (
    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground/50">
      {/* Estimated tokens */}
      <span className="flex items-center gap-0.5" title="Estimated output tokens (chars / 4)">
        <FileText className="h-2.5 w-2.5" />
        ~{estTokens.toLocaleString()} t
      </span>
      {/* TPS */}
      {timing && timing.tps > 0 && (
        <span className="flex items-center gap-0.5" title={`Tokens per second: ${timing.tps.toFixed(1)}`}>
          <Zap className="h-2.5 w-2.5" />
          {timing.tps.toFixed(1)} t/s
        </span>
      )}
      {/* Thinking time */}
      {timing && timing.thinkingTimeMs > 0 && (
        <span className="flex items-center gap-0.5" title={`Thinking time: ${formatDuration(timing.thinkingTimeMs)}`}>
          <Clock className="h-2.5 w-2.5" />
          {formatDuration(timing.thinkingTimeMs)}
        </span>
      )}
      {/* Generation time */}
      {timing && timing.generationTimeMs > 0 && (
        <span className="flex items-center gap-0.5" title={`Generation time: ${formatDuration(timing.generationTimeMs)}`}>
          <span className="text-[8px] leading-none">▸</span>
          {formatDuration(timing.generationTimeMs)}
        </span>
      )}
    </div>
  );
}

export function MessageBubble({ message, isStreaming, contextUsage, messageTiming, toolTimings = new Map() }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const hasBlocks = message.blocks && message.blocks.length > 0;
  const isAssistant = message.role === 'assistant';
  const usage = isAssistant ? (message as AssistantMessage).usage : undefined;

  // Only show per-message metrics for assistant messages
  const showMessageMetrics = isAssistant && (hasBlocks || message.content);

  return (
    <div className={cn('flex gap-3 px-4 py-3', isUser ? 'flex-row-reverse' : '')}>
      <div className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
        isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
      )}>
        {isUser ? <UserIcon className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('flex max-w-[85%] flex-col gap-0.5', isUser && 'items-end')}>
        {isUser || !hasBlocks ? (
          <div className={cn(
            'rounded-lg px-4 py-2 text-sm',
            isUser ? 'bg-primary text-primary-foreground' : 'bg-muted',
          )}>
            <p className="whitespace-pre-wrap">{message.content}</p>
          </div>
        ) : (
          <div className="flex flex-col">
            {renderBlocks(message.blocks, !!isStreaming, toolTimings)}
          </div>
        )}
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground/50">
            {new Date(message.createdAt).toLocaleTimeString()}
          </span>
          {showMessageMetrics && (
            <MessageMetrics
              timing={messageTiming}
              contentLength={message.content.length}
              isStreaming={!!isStreaming}
            />
          )}
        </div>
      </div>
    </div>
  );
}
