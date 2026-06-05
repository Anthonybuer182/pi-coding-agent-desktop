import { Eye } from 'lucide-react';

export function EmptyPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
      <Eye className="h-10 w-10 text-muted-foreground/40" />
      <div>
        <h3 className="text-sm font-medium text-muted-foreground">No file selected</h3>
        <p className="mt-1 text-xs text-muted-foreground/60">
          Select a file from the workspace to preview it here.
        </p>
      </div>
    </div>
  );
}
