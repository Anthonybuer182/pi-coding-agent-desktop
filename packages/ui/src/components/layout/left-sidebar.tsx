import { ReactNode } from 'react';

interface LeftSidebarProps {
  children: ReactNode;
}

export function LeftSidebar({ children }: LeftSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar" role="navigation" aria-label="Session list">
      <div className="flex flex-col gap-1 p-2 min-h-0 flex-1">{children}</div>
    </div>
  );
}
