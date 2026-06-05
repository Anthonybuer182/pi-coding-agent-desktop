import { useMemo } from 'react';
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createMockSDKClient, MOCK_SKILLS } from '@pi/sdk-wrapper';
import type { Config } from '@pi/types';
import {
  SDKProvider,
  useSDK,
  useTheme,
  useUIStore,
  TooltipProvider,
} from '@pi/ui';
import { AppShell } from '@pi/ui';
import { TopControlPanel } from '@pi/ui';
import { ThreeColumnLayout } from '@pi/ui';
import { LeftSidebar } from '@pi/ui';
import { CenterPanel } from '@pi/ui';
import { RightPanel } from '@pi/ui';
import { WorkspaceDropdown } from '@pi/ui';
import { WorkspaceCreateDialog } from '@pi/ui';
import { SessionList } from '@pi/ui';
import { ChatTimeline } from '@pi/ui';
import { Composer } from '@pi/ui';
import { DocumentPreview } from '@pi/ui';
import { DiffReview } from '@pi/ui';
import { ModelSelector } from '@pi/ui';
import { ThinkLevelSelector } from '@pi/ui';
import { CompactToggle } from '@pi/ui';
import { SkillSelector } from '@pi/ui';
import { UsageStatistics } from '@pi/ui';
import { ErrorBoundary } from '@pi/ui';
import { TabsContent } from '@pi/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

function AppContent() {
  useTheme();
  const sdk = useSDK();
  const queryClient = useQueryClient();

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const rightPanelActiveTab = useUIStore((s) => s.rightPanelActiveTab);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const compactMode = useUIStore((s) => s.compactMode);
  const setCompactMode = useUIStore((s) => s.setCompactMode);
  const selectedSkills = useUIStore((s) => s.selectedSkills);
  const toggleSkill = useUIStore((s) => s.toggleSkill);

  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => sdk.config.get(),
  });

  const updateConfigMut = useMutation({
    mutationFn: (data: Partial<Config>) => sdk.config.update(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config'] }),
  });

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell>
        <TopControlPanel>
          <WorkspaceDropdown />
          <WorkspaceCreateDialog />
          <div className="flex-1" />
          <ModelSelector
            value={config?.defaultModelId}
            onChange={(modelId) => updateConfigMut.mutate({ defaultModelId: modelId })}
          />
          <ThinkLevelSelector
            value={config?.defaultThinkLevel}
            onChange={(level) => updateConfigMut.mutate({ defaultThinkLevel: level })}
          />
          <CompactToggle compact={compactMode} onToggle={setCompactMode} />
          <SkillSelector skills={MOCK_SKILLS} selectedIds={selectedSkills} onToggle={toggleSkill} />
          <div className="h-4 w-px bg-border mx-1" />
          <UsageStatistics />
        </TopControlPanel>
        <ThreeColumnLayout
          sidebarOpen={sidebarOpen}
          rightPanelOpen={rightPanelOpen}
          leftSidebar={
            <LeftSidebar>
              <SessionList />
            </LeftSidebar>
          }
          centerPanel={
            <CenterPanel>
              <ChatTimeline />
              <Composer />
            </CenterPanel>
          }
          rightPanel={
            <RightPanel activeTab={rightPanelActiveTab} onTabChange={setRightPanelTab}>
              <TabsContent value="preview" className="h-full mt-0">
                <DocumentPreview />
              </TabsContent>
              <TabsContent value="diff" className="h-full mt-0">
                <DiffReview />
              </TabsContent>
            </RightPanel>
          }
        />
      </AppShell>
    </TooltipProvider>
  );
}

export function App() {
  const sdkClient = useMemo(() => createMockSDKClient(), []);

  return (
    <ErrorBoundary>
      <SDKProvider value={sdkClient}>
        <QueryClientProvider client={queryClient}>
          <AppContent />
        </QueryClientProvider>
      </SDKProvider>
    </ErrorBoundary>
  );
}
