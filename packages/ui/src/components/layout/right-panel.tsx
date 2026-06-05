import { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RightPanelProps {
  children: ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function RightPanel({ children, activeTab = 'preview', onTabChange }: RightPanelProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="flex h-full flex-col">
      <div className="border-b px-2 py-1">
        <TabsList className="w-full">
          <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
          <TabsTrigger value="diff" className="flex-1">Diff</TabsTrigger>
        </TabsList>
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </Tabs>
  );
}
