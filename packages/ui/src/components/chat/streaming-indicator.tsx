import { Loader2 } from 'lucide-react';

export function StreamingIndicator() {
  return (
    <div className="flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>AI is thinking...</span>
      <span className="inline-flex gap-1">
        <span className="animate-bounce delay-0">.</span>
        <span className="animate-bounce delay-100">.</span>
        <span className="animate-bounce delay-200">.</span>
      </span>
    </div>
  );
}
