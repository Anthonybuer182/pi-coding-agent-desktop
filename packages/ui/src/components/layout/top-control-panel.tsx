import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TopControlPanelProps {
  children?: ReactNode;
  className?: string;
}

export function TopControlPanel({ children, className }: TopControlPanelProps) {
  return (
    <div
      className={cn(
        'flex h-12 items-center gap-2 border-b bg-background px-4 shrink-0',
        className,
      )}
    >
      {children}
    </div>
  );
}
