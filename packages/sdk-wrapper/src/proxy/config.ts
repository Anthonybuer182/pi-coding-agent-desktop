import type { Transport } from '../transport/base.js';
import type { ConfigService } from '../services/config.js';

export function createProxyConfigService(transport: Transport): ConfigService {
  return {
    async get() {
      return transport.request('config.get') as ReturnType<ConfigService['get']>;
    },
    async update(data: any) {
      return transport.request('config.update', { data }) as ReturnType<ConfigService['update']>;
    },
    async listModels() {
      return transport.request('config.listModels') as ReturnType<ConfigService['listModels']>;
    },
  };
}
