export type ModelProvider = 'anthropic' | 'openai' | 'google' | 'custom';

export type ThinkLevel = 'off' | 'low' | 'medium' | 'high';

export interface ModelInfo {
  id: string;
  name: string;
  provider: ModelProvider;
  supportsThinking: boolean;
  thinkLevels: ThinkLevel[];
  maxTokens: number;
  isAvailable: boolean;
}
