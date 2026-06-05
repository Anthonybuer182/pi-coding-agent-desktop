import { useQuery } from '@tanstack/react-query';
import { FolderGit2 } from 'lucide-react';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

export function WorkspaceDropdown() {
  const sdk = useSDK();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useUIStore((s) => s.setActiveWorkspace);

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => sdk.workspace.list(),
  });

  if (isLoading) {
    return <Skeleton className="h-9 w-[200px]" />;
  }

  return (
    <Select
      value={activeWorkspaceId ?? undefined}
      onValueChange={(id) => setActiveWorkspace(id)}
    >
      <SelectTrigger className="w-[200px] h-9 border-0 bg-transparent hover:bg-accent" aria-label="Select workspace">
        <FolderGit2 className="mr-2 h-4 w-4 text-muted-foreground" />
        <SelectValue placeholder="Select workspace..." />
      </SelectTrigger>
      <SelectContent>
        {workspaces?.map((ws) => (
          <SelectItem key={ws.id} value={ws.id}>
            <div className="flex items-center gap-2">
              <span>{ws.name}</span>
              <span className="text-xs text-muted-foreground">
                {ws.sessionCount} sessions
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
