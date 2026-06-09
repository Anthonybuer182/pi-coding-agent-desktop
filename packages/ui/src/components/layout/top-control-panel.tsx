import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TopControlPanelProps {
  children?: ReactNode;
  className?: string;
}

export function TopControlPanel({ children, className }: TopControlPanelProps) {
  return (
    <div className={cn('flex items-center gap-2 px-4', className)}>
      {children}
    </div>
  );
}
