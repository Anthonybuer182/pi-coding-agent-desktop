import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface CenterPanelProps {
  children: ReactNode;
  className?: string;
}

export function CenterPanel({ children, className }: CenterPanelProps) {
  return (
    <div className={cn('flex h-full flex-col', className)}>
      {children}
    </div>
  );
}
