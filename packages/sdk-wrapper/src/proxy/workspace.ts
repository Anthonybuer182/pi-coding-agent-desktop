import type { Transport } from '../transport/base.js';
import type { WorkspaceService } from '../services/workspace.js';

export function createProxyWorkspaceService(transport: Transport): WorkspaceService {
  return {
    async list() {
      return transport.request('workspace.list') as ReturnType<WorkspaceService['list']>;
    },
    async get(id: string) {
      return transport.request('workspace.get', { id }) as ReturnType<WorkspaceService['get']>;
    },
    async create(name: string, path: string) {
      return transport.request('workspace.create', { name, path }) as ReturnType<WorkspaceService['create']>;
    },
    async delete(id: string) {
      return transport.request('workspace.delete', { id }) as ReturnType<WorkspaceService['delete']>;
    },
    async update(id: string, data: any) {
      return transport.request('workspace.update', { id, data }) as ReturnType<WorkspaceService['update']>;
    },
  };
}
