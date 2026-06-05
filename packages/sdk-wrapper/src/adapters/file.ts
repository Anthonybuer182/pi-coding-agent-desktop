import type { FileService, FileEntry, FileContent } from '../services/file.js';
import { readFileSync, writeFileSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname } from 'path';

const LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.json': 'json',
  '.md': 'markdown',
  '.html': 'html',
  '.css': 'css',
  '.py': 'python',
  '.rs': 'rust',
  '.go': 'go',
  '.java': 'java',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.xml': 'xml',
  '.sql': 'sql',
};

export function createRealFileService(): FileService {
  return {
    async list(_workspaceId: string, dirPath?: string): Promise<FileEntry[]> {
      const dir = dirPath || '/';
      try {
        const entries = readdirSync(dir, { withFileTypes: true });
        return entries.map((entry) => ({
          name: entry.name,
          path: join(dir, entry.name),
          type: entry.isDirectory() ? 'directory' : 'file',
          size: entry.isFile() ? statSync(join(dir, entry.name)).size : undefined,
          modifiedAt: statSync(join(dir, entry.name)).mtime.toISOString(),
        }));
      } catch {
        return [];
      }
    },

    async read(_workspaceId: string, filePath: string): Promise<FileContent> {
      const content = readFileSync(filePath, 'utf-8');
      const ext = extname(filePath);
      return {
        path: filePath,
        content,
        language: LANGUAGE_MAP[ext],
        size: content.length,
      };
    },

    async write(_workspaceId: string, filePath: string, content: string): Promise<void> {
      writeFileSync(filePath, content, 'utf-8');
    },

    async delete(_workspaceId: string, filePath: string): Promise<void> {
      unlinkSync(filePath);
    },
  };
}
