import { cn } from '@/lib/utils';

interface AppShellProps {
  children: React.ReactNode;
  className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
  return (
    <div className={cn('flex h-screen flex-col overflow-hidden bg-background', className)}>
      {children}
    </div>
  );
}
