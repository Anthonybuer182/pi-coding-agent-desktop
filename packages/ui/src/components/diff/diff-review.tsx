import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ErrorState } from '@/components/common/error-state';
import { DiffHeader } from './diff-header';
import { DiffHunk } from './diff-hunk';
import { AcceptRejectControls } from './accept-reject-controls';
import { EmptyDiff } from './empty-diff';

export function DiffReview() {
  const sdk = useSDK();
  const queryClient = useQueryClient();
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const activeDiffId = useUIStore((s) => s.activeDiffId);

  const { data: diffs, isLoading, error, refetch } = useQuery({
    queryKey: ['diffs', activeSessionId],
    queryFn: () => sdk.diff.list(activeSessionId!),
    enabled: !!activeSessionId,
  });

  const { data: activeDiff } = useQuery({
    queryKey: ['diff', activeDiffId],
    queryFn: () => sdk.diff.get(activeDiffId!),
    enabled: !!activeDiffId,
  });

  const acceptMutation = useMutation({
    mutationFn: () => sdk.diff.accept(activeDiffId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diffs'] }),
  });

  const rejectMutation = useMutation({
    mutationFn: () => sdk.diff.reject(activeDiffId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['diffs'] }),
  });

  if (!activeSessionId) return <EmptyDiff />;
  if (isLoading) return <LoadingSpinner message="Loading diffs..." />;
  if (error) return <ErrorState description="Failed to load diffs" onRetry={() => refetch()} />;
  if (!activeDiff || !activeDiffId) return <EmptyDiff />;

  return (
    <div className="flex h-full flex-col">
      <DiffHeader diff={activeDiff} />
      <AcceptRejectControls
        onAccept={() => acceptMutation.mutate()}
        onReject={() => rejectMutation.mutate()}
        disabled={acceptMutation.isPending || rejectMutation.isPending}
      />
      <ScrollArea className="flex-1">
        {activeDiff.hunks.map((hunk) => (
          <DiffHunk key={hunk.id} hunk={hunk} />
        ))}
      </ScrollArea>
    </div>
  );
}
