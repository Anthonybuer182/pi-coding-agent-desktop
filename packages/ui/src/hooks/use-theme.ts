import { useEffect } from 'react';
import { useThemeStore } from '../stores/theme-store';

export function useTheme() {
  const { theme, resolvedTheme, setTheme, setResolvedTheme } = useThemeStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolved = () => {
      if (theme === 'system') {
        const resolved = mediaQuery.matches ? 'dark' : 'light';
        setResolvedTheme(resolved);
        applyTheme(resolved);
      } else {
        setResolvedTheme(theme);
        applyTheme(theme);
      }
    };

    updateResolved();

    const handler = () => {
      if (theme === 'system') {
        updateResolved();
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme, setResolvedTheme]);

  return { theme, resolvedTheme, setTheme };
}

function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(theme);
}
