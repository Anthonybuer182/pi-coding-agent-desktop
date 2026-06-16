import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderGit2, Trash2 } from 'lucide-react';
import { useState } from 'react';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Workspace } from '@pi/types';

export function WorkspaceDropdown() {
  const sdk = useSDK();
  const queryClient = useQueryClient();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const setActiveWorkspace = useUIStore((s) => s.setActiveWorkspace);
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: () => sdk.workspace.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sdk.workspace.delete(id),
    onSuccess: () => {
      if (deleteTarget && deleteTarget.id === activeWorkspaceId) {
        // Switch to the next available workspace
        const remaining = queryClient
          .getQueryData<Workspace[]>(['workspaces'])
          ?.filter((w) => w.id !== deleteTarget.id);
        if (remaining && remaining.length > 0) {
          setActiveWorkspace(remaining[0].id);
        } else {
          setActiveWorkspace('');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      setDeleteTarget(null);
    },
  });

  if (isLoading) {
    return <Skeleton className="h-9 w-[200px]" />;
  }

  return (
    <>
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
            <div key={ws.id} className="flex items-center w-full">
              <SelectItem value={ws.id} className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate">{ws.name}</span>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {ws.sessionCount} sessions
                  </span>
                </div>
              </SelectItem>
              <button
                className="shrink-0 p-1 mr-1 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"
                aria-label={`Delete workspace ${ws.name}`}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  setDeleteTarget(ws);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </SelectContent>
      </Select>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workspace</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>
              {deleteTarget && deleteTarget.sessionCount > 0
                ? ` and all ${deleteTarget.sessionCount} sessions within it`
                : ''}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
