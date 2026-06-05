import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThemeMode } from '@pi/types';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  setResolvedTheme: (theme: 'light' | 'dark') => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'system',
      resolvedTheme: 'light',
      setTheme: (theme) => set({ theme }),
      setResolvedTheme: (theme) => set({ resolvedTheme: theme }),
    }),
    {
      name: 'pi-theme-storage',
      partialize: (state) => ({ theme: state.theme }),
    },
  ),
);
