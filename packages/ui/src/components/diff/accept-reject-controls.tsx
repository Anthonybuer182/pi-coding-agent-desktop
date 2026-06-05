import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AcceptRejectControlsProps {
  onAccept: () => void;
  onReject: () => void;
  disabled?: boolean;
}

export function AcceptRejectControls({ onAccept, onReject, disabled }: AcceptRejectControlsProps) {
  return (
    <div className="flex items-center gap-1 border-b px-2 py-1">
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onAccept}
        disabled={disabled}
        className="text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/30"
        title="Accept all changes"
        aria-label="Accept all changes"
      >
        <Check className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onReject}
        disabled={disabled}
        className="text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/30"
        title="Reject all changes"
        aria-label="Reject all changes"
      >
        <X className="h-4 w-4" />
      </Button>
      <span className="ml-auto text-xs text-muted-foreground">Click lines to select/deselect</span>
    </div>
  );
}
