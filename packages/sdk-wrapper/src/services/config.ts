import type { Config, ModelInfo } from '@pi/types';

export interface ConfigService {
  get(): Promise<Config>;
  update(data: Partial<Config>): Promise<Config>;
  listModels(): Promise<ModelInfo[]>;
}
