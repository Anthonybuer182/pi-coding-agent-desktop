import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from 'lucide-react';

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
          <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
          {showDiffTab && (
            <TabsTrigger value="diff" className="flex-1">Diff</TabsTrigger>
          )}
          <TabsTrigger value="settings" className="flex-1">
            <Settings className="h-3 w-3 mr-1" />
            Settings
          </TabsTrigger>
        </TabsList>
      </div>
    </Tabs>
  );
}
