import type { FileService, FileEntry, FileContent } from '../services/file.js';
import { SAMPLE_CODE, SAMPLE_MARKDOWN } from './fixtures.js';

const MOCK_FILE_TREE: FileEntry[] = [
  { name: 'src', path: 'src', type: 'directory', modifiedAt: '2026-06-04T08:00:00Z' },
  { name: 'package.json', path: 'package.json', type: 'file', size: 1024, modifiedAt: '2026-06-04T07:00:00Z' },
  { name: 'tsconfig.json', path: 'tsconfig.json', type: 'file', size: 512, modifiedAt: '2026-06-03T16:00:00Z' },
  { name: 'README.md', path: 'README.md', type: 'file', size: 2048, modifiedAt: '2026-06-02T12:00:00Z' },
];

const MOCK_SRC_FILES: FileEntry[] = [
  { name: 'auth', path: 'src/auth', type: 'directory', modifiedAt: '2026-06-04T08:15:00Z' },
  { name: 'index.ts', path: 'src/index.ts', type: 'file', size: 256, modifiedAt: '2026-06-04T07:30:00Z' },
];

export class MockFileService implements FileService {
  async list(_workspaceId: string, directory?: string): Promise<FileEntry[]> {
    if (!directory || directory === '/') return MOCK_FILE_TREE;
    if (directory === 'src') return MOCK_SRC_FILES;
    return [];
  }

  async read(_workspaceId: string, filePath: string): Promise<FileContent> {
    if (filePath.endsWith('.md')) {
      return { path: filePath, content: SAMPLE_MARKDOWN, language: 'markdown', size: SAMPLE_MARKDOWN.length };
    }
    return { path: filePath, content: SAMPLE_CODE, language: 'typescript', size: SAMPLE_CODE.length };
  }

  async write(_workspaceId: string, _filePath: string, _content: string): Promise<void> {
    // Mock: no-op
  }

  async delete(_workspaceId: string, _filePath: string): Promise<void> {
    // Mock: no-op
  }
}
