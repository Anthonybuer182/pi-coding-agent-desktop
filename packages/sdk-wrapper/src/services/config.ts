import type { Config, ModelInfo, ModelsConfig, ProviderEntry, ModelEntry } from '@pi/types';

export interface ConfigService {
  get(): Promise<Config>;
  update(data: Partial<Config>): Promise<Config>;
  listModels(): Promise<ModelInfo[]>;
  /** 读取 models.json 完整配置 */
  getModelsConfig(): Promise<ModelsConfig>;
  /** 写入 models.json 完整配置 */
  saveModelsConfig(config: ModelsConfig): Promise<void>;
  /** 添加或更新供应商 */
  upsertProvider(name: string, provider: ProviderEntry): Promise<void>;
  /** 删除供应商 */
  deleteProvider(name: string): Promise<void>;
  /** 为指定供应商添加模型 */
  addModel(providerName: string, model: ModelEntry): Promise<void>;
  /** 删除指定供应商的模型 */
  deleteModel(providerName: string, modelId: string): Promise<void>;
  /** 更新指定供应商的模型 */
  updateModel(providerName: string, modelId: string, model: Partial<ModelEntry>): Promise<void>;
}
