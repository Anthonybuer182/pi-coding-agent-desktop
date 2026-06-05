import { ReactNode } from 'react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';

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
          <TabsTrigger value="preview" className="flex-1">预览</TabsTrigger>
          <TabsTrigger value="diff" className="flex-1">差异</TabsTrigger>
          <TabsTrigger value="settings" className="flex-1">
            <Settings className="h-3 w-3 mr-1" />
            设置
          </TabsTrigger>
        </TabsList>
      </div>
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </Tabs>
  );
}
