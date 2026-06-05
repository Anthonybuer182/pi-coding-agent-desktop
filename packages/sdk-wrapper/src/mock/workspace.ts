import type { Workspace } from '@pi/types';
import type { WorkspaceService } from '../services/workspace.js';
import { MOCK_WORKSPACES } from './fixtures.js';

export class MockWorkspaceService implements WorkspaceService {
  private workspaces: Workspace[] = [...MOCK_WORKSPACES];

  async list(): Promise<Workspace[]> {
    return [...this.workspaces];
  }

  async get(id: string): Promise<Workspace> {
    const ws = this.workspaces.find((w) => w.id === id);
    if (!ws) throw new Error(`Workspace not found: ${id}`);
    return { ...ws };
  }

  async create(name: string, path: string): Promise<Workspace> {
    const ws: Workspace = {
      id: `ws-${Date.now()}`,
      name,
      path,
      type: 'local',
      sessionCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.workspaces.push(ws);
    return ws;
  }

  async delete(id: string): Promise<void> {
    this.workspaces = this.workspaces.filter((w) => w.id !== id);
  }

  async update(id: string, data: Partial<Pick<Workspace, 'name'>>): Promise<Workspace> {
    const idx = this.workspaces.findIndex((w) => w.id === id);
    if (idx === -1) throw new Error(`Workspace not found: ${id}`);
    this.workspaces[idx] = { ...this.workspaces[idx], ...data, updatedAt: new Date().toISOString() };
    return { ...this.workspaces[idx] };
  }
}
