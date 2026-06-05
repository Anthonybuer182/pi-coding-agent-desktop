import { GitCompare } from 'lucide-react';

export function EmptyDiff() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <GitCompare className="h-10 w-10 text-muted-foreground/40" />
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">No diff selected</h3>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Diffs from the current session will appear here.
        </p>
      </div>
    </div>
  );
}
