import { ReactNode } from 'react';

interface RightPanelProps {
  children: ReactNode;
}

export function RightPanel({ children }: RightPanelProps) {
  return <div className="h-full overflow-hidden">{children}</div>;
}
