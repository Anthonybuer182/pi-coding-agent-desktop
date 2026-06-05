import type { WorkspaceService } from '../services/workspace.js';
import type { Workspace } from '@pi/types';
import { SessionManager } from '@earendil-works/pi-coding-agent';
import { basename } from 'path';

/**
 * Discovers workspaces from SessionManager.listAll() which scans
 * ~/.pi/agent/sessions/--<path>-- directories automatically.
 */
export function createRealWorkspaceService(): WorkspaceService {
  return {
    async list(): Promise<Workspace[]> {
      const workspaceMap = new Map<string, Workspace>();

      try {
        const allSessions = await SessionManager.listAll();

        for (const session of allSessions) {
          const cwd = session.cwd;
          if (!cwd) continue;

          const existing = workspaceMap.get(cwd);
          const sessionDate = session.modified.getTime();

          if (existing) {
            existing.sessionCount += 1;
            if (sessionDate > new Date(existing.updatedAt).getTime()) {
              existing.updatedAt = session.modified.toISOString();
            }
          } else {
            workspaceMap.set(cwd, {
              id: cwd,
              name: basename(cwd),
              path: cwd,
              type: 'local',
              sessionCount: 1,
              createdAt: session.created.toISOString(),
              updatedAt: session.modified.toISOString(),
            });
          }
        }
      } catch {
        // listAll may fail if sessions dir doesn't exist yet
      }

      return [...workspaceMap.values()];
    },

    async get(id: string): Promise<Workspace> {
      try {
        const sessions = await SessionManager.list(id);
        const latest = sessions.reduce((max, s) =>
          s.modified > max.modified ? s : max, sessions[0]);
        return {
          id,
          name: basename(id),
          path: id,
          type: 'local',
          sessionCount: sessions.length,
          createdAt: sessions[0].created.toISOString(),
          updatedAt: latest.modified.toISOString(),
        };
      } catch {
        throw new Error(`Workspace not found: ${id}`);
      }
    },

    async create(name: string, path: string): Promise<Workspace> {
      return {
        id: path,
        name,
        path,
        type: 'local',
        sessionCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    },

    async delete(_id: string): Promise<void> {
      // Workspace deletion is directory management, not SDK-specific
    },

    async update(id: string, data: Partial<Pick<Workspace, 'name'>>): Promise<Workspace> {
      return this.get(id).then((ws) => ({ ...ws, ...data }));
    },
  };
}
