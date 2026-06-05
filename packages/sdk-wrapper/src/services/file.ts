export interface FileEntry {
  name: string;
  path: string;
  type: 'file' | 'directory';
  size?: number;
  modifiedAt: string;
}

export interface FileContent {
  path: string;
  content: string;
  language?: string;
  size: number;
}

export interface FileService {
  list(workspaceId: string, directory?: string): Promise<FileEntry[]>;
  read(workspaceId: string, filePath: string): Promise<FileContent>;
  write(workspaceId: string, filePath: string, content: string): Promise<void>;
  delete(workspaceId: string, filePath: string): Promise<void>;
}
