import { Brain } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ThinkLevel } from '@pi/types';

interface ThinkLevelSelectorProps {
  value?: ThinkLevel;
  onChange?: (level: ThinkLevel) => void;
  supportedLevels?: ThinkLevel[];
}

const levelLabels: Record<ThinkLevel, string> = {
  off: 'Off',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export function ThinkLevelSelector({ value, onChange, supportedLevels }: ThinkLevelSelectorProps) {
  const levels = supportedLevels ?? ['off', 'low', 'medium', 'high'];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-8 w-[100px] border-0 bg-transparent hover:bg-accent text-xs" aria-label="Thinking level">
        <Brain className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
        <SelectValue placeholder="Think" />
      </SelectTrigger>
      <SelectContent>
        {levels.map((level) => (
          <SelectItem key={level} value={level}>
            {levelLabels[level]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
