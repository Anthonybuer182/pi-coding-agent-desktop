import { Minimize2, Maximize2 } from 'lucide-react';
import { Toggle } from '@/components/ui/toggle';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface CompactToggleProps {
  compact: boolean;
  onToggle: (compact: boolean) => void;
}

export function CompactToggle({ compact, onToggle }: CompactToggleProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Toggle
          pressed={compact}
          onPressedChange={onToggle}
          size="sm"
          aria-label="Toggle compact mode"
        >
          {compact ? (
            <Maximize2 className="h-4 w-4" />
          ) : (
            <Minimize2 className="h-4 w-4" />
          )}
        </Toggle>
      </TooltipTrigger>
      <TooltipContent>
        {compact ? 'Exit compact mode' : 'Compact mode'}
      </TooltipContent>
    </Tooltip>
  );
}
