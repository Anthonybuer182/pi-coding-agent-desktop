import { useRef, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { useComposerStore } from '@/stores/composer-store';
import { MessageBubble } from './message-bubble';
import { EmptyChat } from './empty-chat';
import { StreamingIndicator } from './streaming-indicator';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ErrorState } from '@/components/common/error-state';
import type { Message } from '@pi/types';
import { Virtuoso } from 'react-virtuoso';

export function ChatTimeline() {
  const sdk = useSDK();
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const isStreaming = useComposerStore((s) => s.isStreaming);
  const virtuosoRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading, error, refetch } = useQuery({
    queryKey: ['session', activeSessionId],
    queryFn: () => sdk.session.get(activeSessionId!),
    enabled: !!activeSessionId,
  });

  const messages = session?.messages ?? [];
  const footerContent = isStreaming ? <StreamingIndicator /> : null;

  if (!activeSessionId) return <EmptyChat />;
  if (isLoading) return <LoadingSpinner message="Loading messages..." />;
  if (error) return <ErrorState description="Failed to load messages" onRetry={() => refetch()} />;
  if (!session) return <EmptyChat />;

  return (
    <div className="flex-1" ref={virtuosoRef}>
      <Virtuoso
        data={messages}
        followOutput="smooth"
        itemContent={(_index: number, message: Message) => (
          <MessageBubble message={message} />
        )}
        components={{
          Footer: () => <>{footerContent}</>,
        }}
      />
    </div>
  );
}
