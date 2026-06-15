import { useMemo, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createProxySDKClient, HTTPTransport } from '@pi/sdk-wrapper';
import {
  SDKProvider,
  useSDK,
  useTheme,
  useUIStore,
  TooltipProvider,
} from '@pi/ui';
import { AppShell } from '@pi/ui';
import { ThreeColumnLayout } from '@pi/ui';
import { LeftSidebar } from '@pi/ui';
import { CenterPanel } from '@pi/ui';
import { RightPanel } from '@pi/ui';
import { RightPanelTabs } from '@pi/ui';
import { WorkspaceDropdown } from '@pi/ui';
import { WorkspaceCreateDialog } from '@pi/ui';
import { SessionList } from '@pi/ui';
import { ChatTimeline } from '@pi/ui';
import { Composer } from '@pi/ui';
import { UsageBar } from '@pi/ui';
import { DocumentPreview } from '@pi/ui';
import { DiffReview } from '@pi/ui';
import { ErrorBoundary } from '@pi/ui';
import { FileTree } from '@pi/ui';
import { Separator } from '@pi/ui';
import { Button } from '@pi/ui';
import { ProviderSettings } from '@pi/ui';

const SettingsIcon = () => (
  <svg className="h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

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

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const rightPanelOpen = useUIStore((s) => s.rightPanelOpen);
  const rightPanelWidth = useUIStore((s) => s.rightPanelWidth);
  const setRightPanelWidth = useUIStore((s) => s.setRightPanelWidth);
  const rightPanelActiveTab = useUIStore((s) => s.rightPanelActiveTab);
  const setRightPanelTab = useUIStore((s) => s.setRightPanelTab);
  const toggleRightPanel = useUIStore((s) => s.toggleRightPanel);
  const connectionStatus = useUIStore((s) => s.connectionStatus);
  const setConnectionStatus = useUIStore((s) => s.setConnectionStatus);

  // Try to connect on mount
  useEffect(() => {
    sdk.connect().then(() => {
      setConnectionStatus('connected');
    }).catch(() => {
      setConnectionStatus('disconnected');
    });
  }, [sdk, setConnectionStatus]);

  return (
    <TooltipProvider delayDuration={300}>
      <AppShell>
        <ThreeColumnLayout
          sidebarOpen={sidebarOpen}
          rightPanelOpen={rightPanelOpen}
          onToggleRightPanel={toggleRightPanel}
          rightWidth={rightPanelWidth}
          onRightWidthChange={setRightPanelWidth}
          topLeftContent={
            <>
              <WorkspaceDropdown />
              <WorkspaceCreateDialog />
            </>
          }
          rightPanelHeader={
            <RightPanelTabs
              activeTab={rightPanelActiveTab}
              onTabChange={setRightPanelTab}
              showDiffTab={false}
            />
          }
          leftSidebar={
            <LeftSidebar>
              <div className="flex flex-col min-h-0 flex-1 p-2 gap-0">
                <div className="max-h-[45%] overflow-auto flex-shrink-0">
                  <FileTree />
                </div>
                <Separator className="my-1" />
                <SessionList />
              </div>
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground hover:text-foreground"
                  onClick={() => setRightPanelTab('settings')}
                >
                  <SettingsIcon />
                  设置
                </Button>
              </div>
            </LeftSidebar>
          }
          centerPanel={
            <CenterPanel>
              <ChatTimeline />
              <UsageBar />
              <Composer />
            </CenterPanel>
          }
          rightPanel={
            <RightPanel>
              {rightPanelActiveTab === 'preview' && <DocumentPreview />}
              {rightPanelActiveTab === 'diff' && <DiffReview />}
              {rightPanelActiveTab === 'settings' && <ProviderSettings />}
            </RightPanel>
          }
        />
      </AppShell>
    </TooltipProvider>
  );
}

export function App() {
  const sdkClient = useMemo(() => {
    const transport = new HTTPTransport('/api');
    return createProxySDKClient({ transport });
  }, []);

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
