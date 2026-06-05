import { create } from 'zustand';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting';

interface UIState {
  activeWorkspaceId: string | null;
  activeSessionId: string | null;
  activePreviewFilePath: string | null;
  activeDiffId: string | null;
  sidebarOpen: boolean;
  rightPanelOpen: boolean;
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
  setRightPanelTab: (tab: string) => void;
  setCompactMode: (compact: boolean) => void;
  toggleSkill: (skillId: string) => void;
  setConnectionStatus: (status: ConnectionStatus) => void;
  setSearchQuery: (query: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeWorkspaceId: null,
  activeSessionId: null,
  activePreviewFilePath: null,
  activeDiffId: null,
  sidebarOpen: true,
  rightPanelOpen: true,
  rightPanelActiveTab: 'preview',
  compactMode: false,
  selectedSkills: ['skill-officecli', 'skill-filesystem'],
  connectionStatus: 'connecting',
  searchQuery: '',

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id, activeSessionId: null }),
  setActiveSession: (id) => set({ activeSessionId: id }),
  setActivePreviewFile: (path) => set({ activePreviewFilePath: path, rightPanelActiveTab: 'preview' }),
  setActiveDiff: (id) => set({ activeDiffId: id, rightPanelActiveTab: 'diff' }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleRightPanel: () => set((s) => ({ rightPanelOpen: !s.rightPanelOpen })),
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
}));
