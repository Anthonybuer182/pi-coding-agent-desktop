import type { Config, ModelInfo } from '@pi/types';
import type { ConfigService } from '../services/config.js';
import { MOCK_CONFIG, MOCK_MODELS } from './fixtures.js';

export class MockConfigService implements ConfigService {
  private config: Config = { ...MOCK_CONFIG };

  async get(): Promise<Config> {
    return { ...this.config };
  }

  async update(data: Partial<Config>): Promise<Config> {
    this.config = { ...this.config, ...data };
    return { ...this.config };
  }

  async listModels(): Promise<ModelInfo[]> {
    return [...MOCK_MODELS];
  }
}
