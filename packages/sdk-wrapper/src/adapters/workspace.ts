import { existsSync, readdirSync, readFileSync, writeFileSync, statSync, mkdirSync, rmSync } from 'fs';
import { basename, join, resolve } from 'path';
import type { WorkspaceService } from '../services/workspace.js';
import type { Workspace } from '@pi/types';
import { SessionManager, getAgentDir } from '@earendil-works/pi-coding-agent';

/**
 * Encode a workspace path into the session directory name,
 * matching the SDK's getDefaultSessionDirPath() logic.
 */
function encodeSessionDir(cwd: string): string {
  const resolvedCwd = resolve(cwd);
  const safePath = `--${resolvedCwd.replace(/^[/\\]/, '').replace(/[/\\:]/g, '-')}--`;
  return join(getAgentDir(), 'sessions', safePath);
}

/**
 * Attempt to decode a session directory name back to a filesystem path.
 * The SDK encoding replaces `/`, `\`, `:` with `-`, so decoding is lossy.
 * We verify the result with existsSync() to filter out bad decodes.
 */
function decodeSessionDir(dirName: string): string | null {
  if (!dirName.startsWith('--') || !dirName.endsWith('--')) return null;
  const inner = dirName.slice(2, -2);
  if (!inner) return null;
  // Reverse the encoding: replace - back to path separator.
  // On Windows paths the drive letter (C:) is encoded as "C-", so we
  // check the platform to decide the separator, avoiding ambiguity with
  // single-letter directory names on macOS.
  const isWin = process.platform === 'win32';
  const candidate = isWin
    ? inner.charAt(0) + ':' + inner.slice(1).replace(/-/g, '\\')
    : '/' + inner.replace(/-/g, '/');
  return existsSync(candidate) ? candidate : null;
}

/**
 * Discovers workspaces from three sources:
 * 1. SessionManager.listAll() — workspaces that have actual session .jsonl files
 * 2. workspace.json metadata files — workspaces created but not yet used
 * 3. Session directory names — empty directories decoded back to paths
 */
export function createRealWorkspaceService(): WorkspaceService {
  return {
    async list(): Promise<Workspace[]> {
      const workspaceMap = new Map<string, Workspace>();

      // Source 1: workspaces discovered from existing sessions
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

      // Source 2: workspaces from workspace.json metadata (no sessions yet)
      try {
        const sessionsDir = join(getAgentDir(), 'sessions');
        if (existsSync(sessionsDir)) {
          const entries = readdirSync(sessionsDir, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const metaPath = join(sessionsDir, entry.name, 'workspace.json');
            if (!existsSync(metaPath)) continue;
            try {
              const raw = readFileSync(metaPath, 'utf-8');
              const meta = JSON.parse(raw);
              if (!meta.path || workspaceMap.has(meta.path)) continue;
              if (!existsSync(meta.path)) continue;
              const stat = statSync(metaPath);
              workspaceMap.set(meta.path, {
                id: meta.path,
                name: meta.name || basename(meta.path),
                path: meta.path,
                type: 'local',
                sessionCount: 0,
                createdAt: meta.createdAt || stat.birthtime.toISOString(),
                updatedAt: stat.mtime.toISOString(),
              });
            } catch {
              // skip malformed workspace.json
            }
          }
        }
      } catch {
        // non-critical
      }

      // Source 3: session directories without .jsonl and without workspace.json
      // Decode directory name back to path, verify it exists on disk
      try {
        const sessionsDir = join(getAgentDir(), 'sessions');
        if (existsSync(sessionsDir)) {
          const entries = readdirSync(sessionsDir, { withFileTypes: true });
          for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            const dirPath = join(sessionsDir, entry.name);
            // Skip if workspace.json exists (handled by Source 2)
            if (existsSync(join(dirPath, 'workspace.json'))) continue;
            // Skip if has .jsonl files (handled by Source 1)
            try {
              const files = readdirSync(dirPath);
              if (files.some(f => f.endsWith('.jsonl'))) continue;
            } catch { continue; }
            // Try to decode directory name
            const cwd = decodeSessionDir(entry.name);
            if (!cwd || workspaceMap.has(cwd)) continue;
            const stat = statSync(dirPath);
            workspaceMap.set(cwd, {
              id: cwd,
              name: basename(cwd),
              path: cwd,
              type: 'local',
              sessionCount: 0,
              createdAt: stat.birthtime.toISOString(),
              updatedAt: stat.mtime.toISOString(),
            });
          }
        }
      } catch {
        // non-critical
      }

      return [...workspaceMap.values()];
    },

    async get(id: string): Promise<Workspace> {
      try {
        const sessions = await SessionManager.list(id);
        if (sessions.length > 0) {
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
        }
      } catch {
        // fall through to workspace.json lookup
      }

      // Check workspace.json for metadata-only workspaces
      const sessionDir = encodeSessionDir(id);
      const metaPath = join(sessionDir, 'workspace.json');
      if (existsSync(metaPath)) {
        const meta = JSON.parse(readFileSync(metaPath, 'utf-8'));
        const stat = statSync(metaPath);
        return {
          id,
          name: meta.name || basename(id),
          path: id,
          type: 'local',
          sessionCount: 0,
          createdAt: meta.createdAt || stat.birthtime.toISOString(),
          updatedAt: stat.mtime.toISOString(),
        };
      }

      throw new Error(`Workspace not found: ${id}`);
    },

    async create(name: string, path: string): Promise<Workspace> {
      // Write workspace metadata so list() can discover it even before
      // any session is created (SessionManager doesn't write .jsonl until
      // the first assistant message)
      const sessionDir = encodeSessionDir(path);
      if (!existsSync(sessionDir)) {
        mkdirSync(sessionDir, { recursive: true });
      }
      const workspaceMeta = {
        name,
        path,
        createdAt: new Date().toISOString(),
      };
      writeFileSync(join(sessionDir, 'workspace.json'), JSON.stringify(workspaceMeta));

      return {
        id: path,
        name,
        path,
        type: 'local',
        sessionCount: 0,
        createdAt: workspaceMeta.createdAt,
        updatedAt: workspaceMeta.createdAt,
      };
    },

    async delete(id: string): Promise<void> {
      const sessionDir = encodeSessionDir(id);
      if (existsSync(sessionDir)) {
        rmSync(sessionDir, { recursive: true, force: true });
      }
    },

    async update(id: string, data: Partial<Pick<Workspace, 'name'>>): Promise<Workspace> {
      return this.get(id).then((ws) => ({ ...ws, ...data }));
    },
  };
}
