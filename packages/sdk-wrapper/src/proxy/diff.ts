import type { Transport } from '../transport/base.js';
import type { DiffService } from '../services/diff.js';

export function createProxyDiffService(transport: Transport): DiffService {
  return {
    async get(diffId: string) {
      return transport.request('diff.get', { id: diffId }) as ReturnType<DiffService['get']>;
    },
    async list(sessionId: string) {
      return transport.request('diff.list', { sessionId }) as ReturnType<DiffService['list']>;
    },
    async accept(diffId: string) {
      return transport.request('diff.accept', { id: diffId }) as ReturnType<DiffService['accept']>;
    },
    async reject(diffId: string) {
      return transport.request('diff.reject', { id: diffId }) as ReturnType<DiffService['reject']>;
    },
    async acceptLine(diffId: string, lineIds: string[]) {
      return transport.request('diff.acceptLine', { id: diffId, lineIds }) as ReturnType<DiffService['acceptLine']>;
    },
    async rejectLine(diffId: string, lineIds: string[]) {
      return transport.request('diff.rejectLine', { id: diffId, lineIds }) as ReturnType<DiffService['rejectLine']>;
    },
  };
}
