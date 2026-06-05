import type { ThinkLevel } from './model.js';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Config {
  theme: ThemeMode;
  compactMode: boolean;
  defaultModelId: string;
  defaultThinkLevel: ThinkLevel;
  autoSave: boolean;
  fontSize: number;
  codeFontSize: number;
  enableStreaming: boolean;
}
