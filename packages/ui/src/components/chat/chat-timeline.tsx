import { useRef, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { ArrowDown, AlertTriangle, RefreshCw, MessageSquare } from 'lucide-react';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { useComposerStore } from '@/stores/composer-store';
import { Button } from '@/components/ui/button';
import { MessageBubble } from './message-bubble';
import { EmptyChat } from './empty-chat';
import { StreamingIndicator } from './streaming-indicator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ErrorState } from '@/components/common/error-state';
import type { Message, ContentBlock, TokenUsage } from '@pi/types';
import type { AssistantMessage } from '@pi/types';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

interface DateSeparator {
  type: 'date_separator';
  id: string;
  label: string;
}

type ChatItem = DateSeparator | Message;

function isDateSeparator(item: ChatItem): item is DateSeparator {
  return 'type' in item && item.type === 'date_separator';
}

// ----------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------

/** Format a date into Today / Yesterday / locale string */
function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.round((today.getTime() - target.getTime()) / 86400000);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Insert date separators between messages that fall on different days.
 */
function addDateSeparators(messages: Message[]): ChatItem[] {
  const result: ChatItem[] = [];
  let lastDate = '';

  for (const msg of messages) {
    const msgDate = msg.createdAt.split('T')[0];
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      result.push({
        type: 'date_separator',
        id: `date_${msgDate}`,
        label: formatDateLabel(msg.createdAt),
      });
    }
    result.push(msg);
  }

  return result;
}

/**
 * Create a synthetic streaming message from live blocks and usage info.
 * Uses a stable timestamp captured at stream start.
 */
function makeStreamingMessage(
  blocks: ContentBlock[],
  usage: TokenUsage | undefined,
  createdAt: string,
): Message {
  return {
    id: '__streaming__',
    sessionId: '',
    role: 'assistant',
    status: 'streaming',
    content: blocks.filter((b) => b.type === 'text').map((b) => b.content).join(''),
    blocks,
    usage,
    createdAt,
    updatedAt: new Date().toISOString(),
  } as AssistantMessage;
}

// ----------------------------------------------------------------
// Component
// ----------------------------------------------------------------

export function ChatTimeline() {
  const sdk = useSDK();
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const isStreaming = useComposerStore((s) => s.isStreaming);
  const streamingBlocks = useComposerStore((s) => s.streamingBlocks);
  const streamingUsage = useComposerStore((s) => s.streamingUsage);
  const contextUsage = useComposerStore((s) => s.contextUsage);
  const messageTiming = useComposerStore((s) => s.messageTiming);
  const toolTimings = useComposerStore((s) => s.toolTimings);
  const streamError = useComposerStore((s) => s.streamError);
  const setTriggerSend = useComposerStore((s) => s.setTriggerSend);

  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  // Stable timestamp captured once when streaming begins
  const streamingStartRef = useRef<string>('');

  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['session', activeSessionId],
    queryFn: () => sdk.session.get(activeSessionId!),
    enabled: !!activeSessionId,
    staleTime: 0,
  });

  const storedMessages = session?.messages ?? [];

  // Stable timestamp: capture once at the start of streaming
  if (isStreaming && !streamingStartRef.current) {
    streamingStartRef.current = new Date().toISOString();
  }
  if (!isStreaming) {
    streamingStartRef.current = '';
  }

  // During streaming with live blocks, append them as a synthetic message.
  const messages = useMemo(() => {
    if (isStreaming && streamingBlocks.length > 0) {
      const createdAt = streamingStartRef.current || new Date().toISOString();
      return [...storedMessages, makeStreamingMessage(streamingBlocks, streamingUsage ?? undefined, createdAt)];
    }
    return storedMessages;
  }, [storedMessages, isStreaming, streamingBlocks]);

  const chatItems = useMemo(() => addDateSeparators(messages), [messages]);

  const lastMessage = messages[messages.length - 1];
  const showStreamingIndicator =
    isStreaming && !streamingBlocks.length && lastMessage?.role === 'user';

  // Retry: re-send the last user message
  const handleRetry = () => {
    const lastUserMsg = [...storedMessages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && activeSessionId) {
      setTriggerSend(lastUserMsg.content);
    }
  };

  // Scroll to bottom
  const scrollToBottom = () => {
    virtuosoRef.current?.scrollToIndex(messages.length - 1);
  };

  // ----- Error loading session -----
  if (!activeSessionId) return <EmptyChat />;
  if (isLoading) return <LoadingSpinner message="Loading messages..." />;
  if (error) return <ErrorState description="Failed to load messages" onRetry={() => refetch()} />;
  if (!session) return <EmptyChat />;

  // ----- Empty session guidance -----
  if (messages.length === 0 && !isStreaming) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <div className="rounded-full bg-muted p-4">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-medium">Start a conversation</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Send a message below to begin coding with the AI assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 relative">
      {/* Stream error banner */}
      {streamError && (
        <div className="flex items-center gap-3 mx-4 mt-3 px-4 py-3 rounded-lg border border-destructive/30 bg-destructive/10 text-sm">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-destructive flex-1">{streamError}</span>
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-xs border-destructive/30 hover:bg-destructive/10"
            onClick={handleRetry}
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </Button>
        </div>
      )}

      <div className="flex-1">
        <Virtuoso
          ref={virtuosoRef}
          data={chatItems}
          followOutput="smooth"
          atBottomStateChange={setIsAtBottom}
          itemContent={(_index: number, item: ChatItem) => {
            if (isDateSeparator(item)) {
              return (
                <div className="flex items-center justify-center py-3 px-4">
                  <div className="flex items-center gap-3 w-full max-w-md">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                      {item.label}
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                </div>
              );
            }

            const message = item as Message;
            const msgIndex = messages.indexOf(message);
            const isLast = msgIndex === messages.length - 1;
            const isAssistant = message.role === 'assistant';
            return (
              <MessageBubble
                message={message}
                isStreaming={isStreaming && isLast && isAssistant}
                contextUsage={isLast ? contextUsage ?? undefined : undefined}
                messageTiming={isLast && isAssistant ? messageTiming ?? undefined : undefined}
                toolTimings={isLast && isAssistant ? toolTimings : new Map()}
              />
            );
          }}
          components={{
            Footer: () =>
              showStreamingIndicator ? (
                <StreamingIndicator />
              ) : null,
          }}
        />
      </div>

      {/* Floating scroll-to-bottom button */}
      {isStreaming && !isAtBottom && (
        <button
          onClick={scrollToBottom}
          className="absolute bottom-4 right-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted transition-colors"
          aria-label="Scroll to bottom"
        >
          <ArrowDown className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
