import { Folder } from 'lucide-react';

interface SessionGroupHeaderProps {
  workspaceName: string;
  count: number;
}

export function SessionGroupHeader({ workspaceName, count }: SessionGroupHeaderProps) {
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground">
      <Folder className="h-3.5 w-3.5" />
      <span className="flex-1 truncate">{workspaceName}</span>
      <span className="text-xs tabular-nums">{count}</span>
    </div>
  );
}
