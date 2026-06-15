import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface UIState {
  activeWorkspaceId: string | null;
  activeSessionId: string | null;
  activePreviewFilePath: string | null;
  activeDiffId: string | null;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
  rightPanelWidth: number;
  rightPanelActiveTab: 'preview' | 'diff' | 'settings';
  compactMode: boolean;
  selectedSkills: string[];
  connectionStatus: ConnectionStatus;
  searchQuery: string;

  setActiveWorkspace: (id: string | null) => void;
  setActiveSession: (id: string | null) => void;
  setActivePreviewFile: (path: string | null) => void;
  setActiveDiff: (id: string | null) => void;
  toggleSidebar: () => void;
  toggleRightPanel: () => void;
  setRightPanelWidth: (width: number) => void;
  setRightPanelTab: (tab: string) => void;
  setCompactMode: (compact: boolean) => void;
  toggleSkill: (skillId: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      activeSessionId: null,
      activePreviewFilePath: null,
      activeDiffId: null,
      sidebarOpen: true,
      rightPanelOpen: true,
      rightPanelWidth: 600,
      rightPanelActiveTab: 'preview',
      compactMode: false,
      selectedSkills: ['skill-officecli', 'skill-filesystem'],
      connectionStatus: 'connecting',
      searchQuery: '',

      setActiveWorkspace: (id) => set({ activeWorkspaceId: id, activeSessionId: null }),
      setActiveSession: (id) => set({ activeSessionId: id }),
      setActivePreviewFile: (path) => set({ activePreviewFilePath: path, rightPanelActiveTab: 'preview', rightPanelOpen: true }),
      setActiveDiff: (id) => set({ activeDiffId: id, rightPanelActiveTab: 'diff' }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
      setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
      setRightPanelTab: (tab) => set({ rightPanelActiveTab: tab as 'preview' | 'diff' | 'settings' }),
      setCompactMode: (compact) => set({ compactMode: compact }),
      toggleSkill: (skillId) =>
        set((s) => ({
          selectedSkills: s.selectedSkills.includes(skillId)
            ? s.selectedSkills.filter((id) => id !== skillId)
            : [...s.selectedSkills, skillId],
        })),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      setSearchQuery: (query) => set({ searchQuery: query }),
    }),
    {
      name: 'pi-ui-storage',
      partialize: (state) => ({
        activeWorkspaceId: state.activeWorkspaceId,
        activeSessionId: state.activeSessionId,
        sidebarOpen: state.sidebarOpen,
        rightPanelOpen: state.rightPanelOpen,
        rightPanelWidth: state.rightPanelWidth,
        rightPanelActiveTab: state.rightPanelActiveTab,
        compactMode: state.compactMode,
        selectedSkills: state.selectedSkills,
      }),
    },
  ),
);
