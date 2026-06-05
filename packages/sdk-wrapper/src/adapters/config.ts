import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { ConfigService } from '../services/config.js';
import { SettingsManager, AuthStorage, ModelRegistry, getAgentDir } from '@earendil-works/pi-coding-agent';
import type { Config, ModelInfo, ModelProvider } from '@pi/types';

// Map real SDK thinking levels to our Config thinking levels
function toConfigThinkLevel(level?: string): Config['defaultThinkLevel'] {
  switch (level) {
    case 'off': return 'off';
    case 'minimal': return 'low';
    case 'low': return 'low';
    case 'medium': return 'medium';
    case 'high': return 'high';
    case 'xhigh': return 'high';
    default: return 'medium';
  }
}

// Map our think levels to real SDK levels
function toRealThinkLevel(level?: string): 'off' | 'minimal' | 'low' | 'medium' | 'high' | 'xhigh' | undefined {
  switch (level) {
    case 'off': return 'off';
    case 'low': return 'low';
    case 'medium': return 'medium';
    case 'high': return 'high';
    default: return undefined;
  }
}

// SDK thinking levels → our ThinkLevel set (deduped)
const VALID_THINK_LEVELS: ReadonlySet<string> = new Set(['off', 'low', 'medium', 'high']);

function toThinkLevels(thinkingLevelMap?: Record<string, string | null>): ('off' | 'low' | 'medium' | 'high')[] {
  if (!thinkingLevelMap) return ['off', 'low', 'medium', 'high'];
  const levels = new Set<string>();
  for (const l of Object.keys(thinkingLevelMap)) {
    if (l === 'minimal') levels.add('low');
    else if (l === 'xhigh') levels.add('high');
    else if (VALID_THINK_LEVELS.has(l)) levels.add(l);
  }
  return [...levels] as ('off' | 'low' | 'medium' | 'high')[];
}

// Normalize SDK provider to our ModelProvider type
function toModelProvider(raw: string): ModelProvider {
  if (raw === 'openai' || raw.startsWith('openai')) return 'openai';
  if (raw === 'google' || raw === 'google-vertex') return 'google';
  if (raw === 'anthropic') return 'anthropic';
  return 'custom';
}

// Environment variable names for built-in providers
const BUILT_IN_PROVIDER_ENV_KEYS: Record<string, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
  google: 'GOOGLE_API_KEY',
};

function getConfiguredModelProviders(): Set<string> {
  const providers = new Set<string>();

  // 1. Providers from models.json
  const modelsJsonPath = join(getAgentDir(), 'models.json');
  try {
    if (existsSync(modelsJsonPath)) {
      const raw = readFileSync(modelsJsonPath, 'utf-8');
      const config = JSON.parse(raw);
      if (config?.providers) {
        for (const name of Object.keys(config.providers)) {
          providers.add(name);
        }
      }
    }
  } catch {
    // models.json unreadable – skip
  }

  // 2. Built-in providers with env var API keys
  for (const [provider, envKey] of Object.entries(BUILT_IN_PROVIDER_ENV_KEYS)) {
    if (process.env[envKey]) {
      providers.add(provider);
    }
  }

  return providers;
}

export function createRealConfigService(cwd: string, agentDir?: string): ConfigService {
  const settings = SettingsManager.create(cwd, agentDir);
  const modelRegistry = ModelRegistry.create(AuthStorage.inMemory());

  // Determine which providers have usable auth
  const configuredProviders = getConfiguredModelProviders();

  return {
    async get(): Promise<Config> {
      const globalSettings = settings.getGlobalSettings();
      const projectSettings = settings.getProjectSettings();
      const merged = { ...globalSettings, ...projectSettings };

      return {
        theme: (merged.theme as Config['theme']) ?? 'system',
        compactMode: false,
        defaultModelId: settings.getDefaultModel() || merged.defaultModel || 'claude-sonnet-4',
        defaultThinkLevel: toConfigThinkLevel(settings.getDefaultThinkingLevel()),
        autoSave: true,
        fontSize: 14,
        codeFontSize: 13,
        enableStreaming: true,
      };
    },

    async update(data: Partial<Config>): Promise<Config> {
      if (data.defaultModelId) {
        settings.setDefaultModel(data.defaultModelId);
      }
      if (data.defaultThinkLevel) {
        settings.setDefaultThinkingLevel(toRealThinkLevel(data.defaultThinkLevel)!);
      }
      if (data.theme) {
        settings.setTheme(data.theme);
      }
      await settings.flush();
      return this.get();
    },

    async listModels(): Promise<ModelInfo[]> {
      const models = modelRegistry.getAll().filter((m) =>
        configuredProviders.has(m.provider),
      );
      return models.map((m) => ({
        id: m.id,
        name: m.name,
        provider: toModelProvider(m.provider),
        supportsThinking: m.reasoning,
        thinkLevels: m.reasoning ? toThinkLevels(m.thinkingLevelMap) : ['off'],
        maxTokens: m.maxTokens,
        isAvailable: true,
      }));
    },
  };
}
