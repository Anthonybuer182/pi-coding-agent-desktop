import { Plus } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSDK } from '@/hooks/use-sdk';
import { useUIStore } from '@/stores/ui-store';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SessionCreateButtonProps {
  className?: string;
}

export function SessionCreateButton({ className }: SessionCreateButtonProps) {
  const sdk = useSDK();
  const queryClient = useQueryClient();
  const activeWorkspaceId = useUIStore((s) => s.activeWorkspaceId);
  const setActiveSession = useUIStore((s) => s.setActiveSession);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!activeWorkspaceId) throw new Error('No workspace selected');
      return sdk.session.create(activeWorkspaceId);
    },
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setActiveSession(session.id);
    },
  });

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn('w-full', className)}
      onClick={() => createMutation.mutate()}
      disabled={!activeWorkspaceId || createMutation.isPending}
    >
      <Plus className="mr-2 h-4 w-4" />
      New Session
    </Button>
  );
}
