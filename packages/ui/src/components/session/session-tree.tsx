'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  User,
  Bot,
  Wrench,
  Brain,
  ChevronRight,
  ChevronDown,
  Loader2,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { useComposerStore } from '@/stores/composer-store';
import type { SessionTreeNode as SessionTreeNodeType, TreeNodeToolCall } from '@pi/types';

// === Helpers ===

function formatTime(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    const h = d.getHours().toString().padStart(2, '0');
    const m = d.getMinutes().toString().padStart(2, '0');
    return `${h}:${m}`;
  } catch {
    return '';
  }
}

function truncate(str: string | undefined, maxLen: number): string {
  if (!str) return '';
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str;
}

function formatDuration(ms: number | undefined): string {
  if (ms === undefined) return '';
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// === Message Row Component ===

function MessageRow({
  node,
  onMessageClick,
}: {
  node: SessionTreeNodeType;
  onMessageClick?: (node: SessionTreeNodeType) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isAssistant = node.role === 'assistant';
  const hasToolDetails = isAssistant && node.toolCalls && node.toolCalls.length > 0;

  return (
    <div>
      {/* Message row */}
      <div
        className="group cursor-pointer border-b border-border/50 hover:bg-muted/30 transition-colors"
        onClick={() => onMessageClick?.(node)}
      >
        {/* Tool/thinking summary row for assistant */}
        {isAssistant && (node.toolCount || node.hasThinking) && (
          <div className="flex items-center gap-1.5 px-3 pt-1.5 text-[10px] text-muted-foreground/70">
            {node.toolCount ? (
              <span className="flex items-center gap-1">
                <Wrench className="h-3 w-3" />
                {node.toolCount} tool{node.toolCount !== 1 ? 's' : ''}
              </span>
            ) : null}
            {node.toolCount && node.hasThinking ? (
              <span className="text-muted-foreground/40">·</span>
            ) : null}
            {node.hasThinking ? (
              <span className="flex items-center gap-1">
                <Brain className="h-3 w-3" />
                {node.thinkingDuration !== undefined
                  ? formatDuration(node.thinkingDuration)
                  : '--'}
              </span>
            ) : null}
          </div>
        )}

        {/* Main content row */}
        <div className="flex items-start gap-2 px-3 py-2">
          {/* Role icon */}
          <span className="shrink-0 mt-0.5">
            {node.role === 'user' ? (
              <User className="h-3.5 w-3.5 text-blue-400" />
            ) : (
              <Bot className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </span>

          {/* Preview text */}
          <span className="flex-1 min-w-0 text-xs text-muted-foreground leading-relaxed line-clamp-2">
            {node.preview || '(empty)'}
          </span>

          {/* Timestamp */}
          <span className="shrink-0 text-[10px] text-muted-foreground/50 tabular-nums">
            {formatTime(node.timestamp)}
          </span>
        </div>
      </div>

      {/* Expandable tool call details */}
      {hasToolDetails && (
        <div className="bg-muted/20 border-b border-border/50">
          <button
            className="flex items-center gap-1 px-3 py-1 text-[10px] text-muted-foreground/60 hover:text-muted-foreground w-full"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            <span>工具调用详情</span>
          </button>
          {expanded && (
            <div className="px-3 pb-2 space-y-1">
              {node.toolCalls!.map((tc: TreeNodeToolCall) => (
                <ToolCallItem key={tc.toolCallId} toolCall={tc} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// === Tool Call Item ===

function ToolCallItem({ toolCall }: { toolCall: TreeNodeToolCall }) {
  return (
    <div className="flex flex-col gap-0.5 text-[10px] pl-5 py-1 rounded bg-background/50">
      <div className="flex items-center gap-1.5">
        {toolCall.isError ? (
          <XCircle className="h-3 w-3 text-red-400" />
        ) : toolCall.resultPreview ? (
          <CheckCircle2 className="h-3 w-3 text-emerald-400" />
        ) : (
          <Clock className="h-3 w-3 text-amber-400" />
        )}
        <span className="font-medium text-foreground/80">{toolCall.toolName}</span>
        {toolCall.duration !== undefined && (
          <span className="text-muted-foreground/50 ml-auto">
            {formatDuration(toolCall.duration)}
          </span>
        )}
      </div>
      {toolCall.argsPreview && (
        <div className="text-muted-foreground/60 truncate">
          {truncate(toolCall.argsPreview, 60)}
        </div>
      )}
      {toolCall.resultPreview && (
        <div className="text-muted-foreground/50 truncate">
          {truncate(toolCall.resultPreview, 80)}
        </div>
      )}
    </div>
  );
}

// === Main Component ===

/**
 * Custom event dispatched when user clicks a message in the session tree.
 * ChatTimeline (or parent) can listen for 'session-tree-message-click' on document.
 */
export const SESSION_TREE_MESSAGE_CLICK = 'session-tree-message-click';

export function SessionTree() {
  const sdk = useSDK();
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const isStreaming = useComposerStore((s) => s.isStreaming);

  // Apply faster refresh when streaming is in progress
  const streamingInCurrentSession = isStreaming && !!activeSessionId;

  const { data, isLoading, error } = useQuery({
    queryKey: ['session-tree', activeSessionId],
    queryFn: () => sdk.session.getTree(activeSessionId!),
    enabled: !!activeSessionId,
    staleTime: 2000,
    refetchInterval: streamingInCurrentSession ? 1000 : 3000,
  });

  const tree = data;

  // Filter to message entries, sorted by time descending (newest first)
  const messageNodes = useMemo(() => {
    if (!tree?.nodes) return [];
    const collect = (nodes: SessionTreeNodeType[]): SessionTreeNodeType[] => {
      const result: SessionTreeNodeType[] = [];
      for (const node of nodes) {
        if (node.type === 'message') {
          result.push(node);
        }
        if (node.children.length > 0) {
          result.push(...collect(node.children));
        }
      }
      return result;
    };
    const allMessages = collect(tree.nodes);
    // Sort by timestamp descending (newest first)
    allMessages.sort((a, b) => {
      const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tb - ta;
    });
    return allMessages;
  }, [tree?.nodes]);

  const handleMessageClick = useCallback((node: SessionTreeNodeType) => {
    // Dispatch custom event so ChatTimeline can scroll to the corresponding message
    document.dispatchEvent(
      new CustomEvent(SESSION_TREE_MESSAGE_CLICK, {
        detail: { nodeId: node.id, timestamp: node.timestamp, role: node.role },
      })
    );
  }, []);

  // === Empty / Loading / Error states ===

  if (!activeSessionId) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-4">
        <GitBranch className="h-8 w-8 opacity-30" />
        <p>请先选择一个会话</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>加载会话树...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm gap-2 p-4">
        <p className="text-red-400">加载失败</p>
        <p className="text-[11px]">{(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b text-xs text-muted-foreground shrink-0">
        <GitBranch className="h-3.5 w-3.5" />
        <span className="font-medium">会话树</span>
        {streamingInCurrentSession && (
          <span className="flex items-center gap-1 text-emerald-400">
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span className="text-[10px]">自动刷新</span>
          </span>
        )}
        {messageNodes.length > 0 && !streamingInCurrentSession && (
          <span className="text-[10px] text-muted-foreground/60 ml-auto">
            {messageNodes.length} 条消息
          </span>
        )}
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-auto">
        {messageNodes.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
            暂无消息
          </div>
        ) : (
          messageNodes.map((node) => (
            <MessageRow
              key={node.id}
              node={node}
              onMessageClick={handleMessageClick}
            />
          ))
        )}
      </div>
    </div>
  );
}
