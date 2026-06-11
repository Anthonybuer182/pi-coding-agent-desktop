import type { Transport } from '../transport/base.js';
import type { FileService } from '../services/file.js';

export function createProxyFileService(transport: Transport): FileService {
  return {
    async list(workspaceId: string, directory?: string) {
      return transport.request('file.list', { workspaceId, directory }) as ReturnType<FileService['list']>;
    },
    async read(workspaceId: string, filePath: string) {
      return transport.request('file.read', { workspaceId, path: filePath }) as ReturnType<FileService['read']>;
    },
    async write(workspaceId: string, filePath: string, content: string) {
      return transport.request('file.write', { workspaceId, path: filePath, content }) as ReturnType<FileService['write']>;
    },
    async delete(workspaceId: string, filePath: string) {
      return transport.request('file.delete', { workspaceId, path: filePath }) as ReturnType<FileService['delete']>;
    },
    async readOffice(workspaceId: string, filePath: string) {
      return transport.request('file.readOffice', { workspaceId, path: filePath }) as ReturnType<FileService['readOffice']>;
    },
  };
}
