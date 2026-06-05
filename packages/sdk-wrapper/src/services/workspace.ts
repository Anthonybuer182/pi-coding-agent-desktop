import type { Workspace } from '@pi/types';

export interface WorkspaceService {
  list(): Promise<Workspace[]>;
  get(id: string): Promise<Workspace>;
  create(name: string, path: string): Promise<Workspace>;
  delete(id: string): Promise<void>;
  update(id: string, data: Partial<Pick<Workspace, 'name'>>): Promise<Workspace>;
}
