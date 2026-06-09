import { ReactNode } from 'react';

interface RightPanelProps {
  children: ReactNode;
}

export function RightPanel({ children }: RightPanelProps) {
  return <div className="flex-1 overflow-hidden">{children}</div>;
}
