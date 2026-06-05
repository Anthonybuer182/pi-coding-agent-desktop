import { useQuery } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { SessionItem } from './session-item';
import { SessionGroupHeader } from './session-group-header';
import { SessionCreateButton } from './session-create-button';
import { LoadingSpinner } from '@/components/common/loading-spinner';
import { ErrorState } from '@/components/common/error-state';
import type { Session } from '@pi/types';
import { Virtuoso } from 'react-virtuoso';

export function SessionList() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const activeSessionId = useUIStore((s) => s.activeSessionId);
  const setActiveSession = useUIStore((s) => s.setActiveSession);

  const { data: workspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => sdk.workspace.list(),
  });

  const { data: sessions, isLoading, error, refetch } = useQuery({
    queryKey: ['sessions', activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      return sdk.session.list(activeWorkspaceId);
    },
    enabled: !!activeWorkspaceId,
  });

  const workspaceName = workspaces?.find((w) => w.id === activeWorkspaceId)?.name ?? 'Sessions';

  if (!activeWorkspaceId) {
    return (
      <div className="flex flex-1 items-center justify-center p-4 text-sm text-muted-foreground">
        Select a workspace to view sessions
      </div>
    );
  }

  if (isLoading) return <LoadingSpinner message="Loading sessions..." />;
  if (error) return <ErrorState description="Failed to load sessions" onRetry={() => refetch()} />;

  const items = sessions ?? [];

  return (
    <div className="flex flex-col gap-1 min-h-0 flex-1">
      <SessionGroupHeader workspaceName={workspaceName} count={items.length} />
      <SessionCreateButton />
      <Virtuoso
        className="flex-1"
        data={items}
        itemContent={(_index, session: Session) => (
          <SessionItem
            session={session}
            isActive={session.id === activeSessionId}
            onClick={() => setActiveSession(session.id)}
          />
        )}
      />
    </div>
  );
}
