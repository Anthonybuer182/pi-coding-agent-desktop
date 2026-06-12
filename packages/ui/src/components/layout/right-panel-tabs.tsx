import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, GitBranch } from 'lucide-react';

interface RightPanelTabsProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  showDiffTab?: boolean;
}

export function RightPanelTabs({ activeTab = 'preview', onTabChange, showDiffTab = true }: RightPanelTabsProps) {
  return (
    <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
      <div className="border-b px-2 py-1">
        <TabsList className="w-full">
          <TabsTrigger value="session-tree" className="flex-1">
            <GitBranch className="h-3 w-3 mr-1" />
            会话树
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex-1">预览</TabsTrigger>
          {showDiffTab && (
            <TabsTrigger value="diff" className="flex-1">差异</TabsTrigger>
          )}
          <TabsTrigger value="settings" className="flex-1">
            <Settings className="h-3 w-3 mr-1" />
            设置
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}
