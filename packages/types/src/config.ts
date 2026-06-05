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

// models.json 配置类型

export interface ModelEntry {
  id: string;
  name: string;
  input?: string[];
  /** 自定义模型专用的额外配置 */
  api?: string;
  baseUrl?: string;
  contextWindow?: number;
  maxTokens?: number;
}

export interface ProviderCompat {
  supportsDeveloperRole?: boolean;
  supportsReasoningEffort?: boolean;
}

export interface ProviderEntry {
  baseUrl: string;
  api: string;
  apiKey: string;
  compat?: ProviderCompat;
  models: ModelEntry[];
}

export interface ModelsConfig {
  providers: Record<string, ProviderEntry>;
}
