import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import type { ConfigService } from '../services/config.js';
import { SettingsManager, AuthStorage, ModelRegistry, getAgentDir } from '@earendil-works/pi-coding-agent';
import type { Config, ModelInfo, ModelProvider, ModelsConfig, ProviderEntry, ModelEntry } from '@pi/types';

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

// models.json helpers

function getModelsJsonPath(): string {
  return join(getAgentDir(), 'models.json');
}

function readModelsConfig(): ModelsConfig {
  const path = getModelsJsonPath();
  try {
    if (existsSync(path)) {
      const raw = readFileSync(path, 'utf-8');
      const parsed = JSON.parse(raw);
      return { providers: parsed?.providers ?? {} };
    }
  } catch {
    // unreadable or malformed
  }
  return { providers: {} };
}

function writeModelsConfig(config: ModelsConfig): void {
  const path = getModelsJsonPath();
  const dir = dirname(path);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, JSON.stringify(config, null, 2), 'utf-8');
}

// Re-read configured providers after models.json changes
function refreshConfiguredProviders(modelRegistry: ModelRegistry): Set<string> {
  // Re-create registry to pick up changes
  const providers = getConfiguredModelProviders();
  // Force registry refresh
  try {
    modelRegistry.refresh();
  } catch {
    // refresh might not be available on in-memory instance
  }
  return providers;
}

export function createRealConfigService(cwd: string, agentDir?: string, modelRegistry?: ModelRegistry, settingsManager?: SettingsManager): ConfigService {
  const settings = settingsManager ?? SettingsManager.create(cwd, agentDir);
  const registry = modelRegistry ?? ModelRegistry.create(AuthStorage.inMemory());

  // Determine which providers have usable auth (mutable after models.json writes)
  let configuredProviders = getConfiguredModelProviders();

  return {
    async get(): Promise<Config> {
      const globalSettings = settings.getGlobalSettings();
      const projectSettings = settings.getProjectSettings();
      const merged = { ...globalSettings, ...projectSettings };

      let rawDefaultModelId = settings.getDefaultModel() || merged.defaultModel || 'claude-sonnet-4';

      // Validate: only keep the default model if it's actually available (has configured auth)
      const availableModels = registry.getAvailable();
      if (rawDefaultModelId && availableModels.length > 0 &&
          !availableModels.some((m) => m.id === rawDefaultModelId)) {
        rawDefaultModelId = availableModels[0].id;
      }

      return {
        theme: (merged.theme as Config['theme']) ?? 'system',
        compactMode: false,
        defaultModelId: rawDefaultModelId,
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
      // Refresh from disk so listModels and getModelsConfig stay in sync
      configuredProviders = refreshConfiguredProviders(registry);
      const models = registry.getAll().filter((m) =>
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

    // models.json CRUD

    async getModelsConfig(): Promise<ModelsConfig> {
      return readModelsConfig();
    },

    async saveModelsConfig(config: ModelsConfig): Promise<void> {
      writeModelsConfig(config);
      configuredProviders = refreshConfiguredProviders(registry);
    },

    async upsertProvider(name: string, provider: ProviderEntry): Promise<void> {
      const current = readModelsConfig();
      current.providers[name] = provider;
      writeModelsConfig(current);
      configuredProviders = refreshConfiguredProviders(registry);
    },

    async deleteProvider(name: string): Promise<void> {
      const current = readModelsConfig();
      delete current.providers[name];
      writeModelsConfig(current);
      configuredProviders = refreshConfiguredProviders(registry);
    },

    async addModel(providerName: string, model: ModelEntry): Promise<void> {
      const current = readModelsConfig();
      const provider = current.providers[providerName];
      if (!provider) throw new Error(`Provider "${providerName}" does not exist`);
      if (provider.models.find((m) => m.id === model.id)) {
        throw new Error(`Model "${model.id}" already exists`);
      }
      provider.models.push(model);
      writeModelsConfig(current);
      configuredProviders = refreshConfiguredProviders(registry);
    },

    async deleteModel(providerName: string, modelId: string): Promise<void> {
      const current = readModelsConfig();
      const provider = current.providers[providerName];
      if (!provider) throw new Error(`Provider "${providerName}" does not exist`);
      provider.models = provider.models.filter((m) => m.id !== modelId);
      writeModelsConfig(current);
      configuredProviders = refreshConfiguredProviders(registry);
    },

    async updateModel(providerName: string, modelId: string, model: Partial<ModelEntry>): Promise<void> {
      const current = readModelsConfig();
      const provider = current.providers[providerName];
      if (!provider) throw new Error(`Provider "${providerName}" does not exist`);
      const idx = provider.models.findIndex((m) => m.id === modelId);
      if (idx === -1) throw new Error(`Model "${modelId}" does not exist`);
      provider.models[idx] = { ...provider.models[idx], ...model, id: modelId };
      writeModelsConfig(current);
      configuredProviders = refreshConfiguredProviders(registry);
    },
  };
}
