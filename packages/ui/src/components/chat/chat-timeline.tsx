import { useRef, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { useComposerStore } from '@/stores/composer-store';
import { MessageBubble } from './message-bubble';
import { EmptyChat } from './empty-chat';
import { Loader2 } from 'lucide-react';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ErrorState } from '@/components/common/error-state';
import type { Message, ContentBlock, TokenUsage } from '@pi/types';
import type { AssistantMessage } from '@pi/types';
import { Virtuoso } from 'react-virtuoso';

/**
 * Create a synthetic streaming message from live blocks and usage info.
 */
function makeStreamingMessage(blocks: ContentBlock[], usage?: TokenUsage): Message {
  return {
    id: '__streaming__',
    sessionId: '',
    role: 'assistant',
    status: 'streaming',
    content: blocks.filter((b) => b.type === 'text').map((b) => b.content).join(''),
    blocks,
    usage,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as AssistantMessage;
}

export function ChatTimeline() {
  const sdk = useSDK();
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const isStreaming = useComposerStore((s) => s.isStreaming);
  const streamingBlocks = useComposerStore((s) => s.streamingBlocks);
  const streamingUsage = useComposerStore((s) => s.streamingUsage);
  const contextUsage = useComposerStore((s) => s.contextUsage);
  const messageTiming = useComposerStore((s) => s.messageTiming);
  const virtuosoRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['session', activeSessionId],
    queryFn: () => sdk.session.get(activeSessionId!),
    enabled: !!activeSessionId,
    staleTime: 0,
  });

  const storedMessages = session?.messages ?? [];

  // During streaming with live blocks, append them as a synthetic message
  const messages = useMemo(() => {
    if (isStreaming && streamingBlocks.length > 0) {
      return [...storedMessages, makeStreamingMessage(streamingBlocks, streamingUsage ?? undefined)];
    }
    // Show streaming indicator for the gap before first block arrives
    if (isStreaming && storedMessages.length > 0 && storedMessages[storedMessages.length - 1].role === 'user') {
      return storedMessages;
    }
    return storedMessages;
  }, [storedMessages, isStreaming, streamingBlocks]);

  const lastMessage = messages[messages.length - 1];
  const showStreamingIndicator =
    isStreaming && !streamingBlocks.length && lastMessage?.role === 'user';

  const footerContent = showStreamingIndicator ? (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>AI is thinking...</span>
    </div>
  ) : null;

  if (!activeSessionId) return <EmptyChat />;
  if (isLoading) return <LoadingSpinner message="Loading messages..." />;
  if (error) return <ErrorState description="Failed to load messages" onRetry={() => refetch()} />;
  if (!session) return <EmptyChat />;

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1" ref={virtuosoRef}>
        <Virtuoso
          data={messages}
          followOutput="smooth"
          itemContent={(_index: number, message: Message) => {
            const isLast = _index === messages.length - 1;
            const isAssistant = message.role === 'assistant';
            return (
              <MessageBubble
                message={message}
                isStreaming={isStreaming && isLast && isAssistant}
                contextUsage={isLast ? contextUsage ?? undefined : undefined}
                messageTiming={isLast && isAssistant ? messageTiming ?? undefined : undefined}
                toolTimings={new Map()}
              />
            );
          }}
          components={{
            Footer: () => <>{footerContent}</>,
          }}
        />
      </div>
    </div>
  );
}
