export type WorkspaceType = 'local' | 'remote';

export interface Workspace {
  id: string;
  name: string;
  path: string;
  type: WorkspaceType;
  sessionCount: number;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}
