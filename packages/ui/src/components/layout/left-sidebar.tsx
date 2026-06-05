import { ReactNode } from 'react';

interface LeftSidebarProps {
  children: ReactNode;
}

export function LeftSidebar({ children }: LeftSidebarProps) {
  return (
    <div className="flex h-full flex-col bg-sidebar" role="navigation" aria-label="Sidebar">
      {children}
    </div>
  );
}
