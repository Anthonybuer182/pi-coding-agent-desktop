import type { Diff, DiffHunk, DiffLine } from '@pi/types';
import type { DiffService } from '../services/diff.js';

/**
 * Real diff service adapter.
 *
 * The pi-coding-agent SDK doesn't have a first-class diff API.
 * Diffs are generated as part of tool execution (write, edit tools).
 *
 * This adapter reads diffs from the session's tool results or from
 * the file system using git diff if available.
 *
 * For now, it returns an empty diff list. Full implementation would
 * need to parse diffs from session entries.
 */
export function createRealDiffService(): DiffService {
  return {
    async get(_diffId: string): Promise<Diff> {
      throw new Error('Real diff service: get not implemented');
    },

    async list(_sessionId: string): Promise<Diff[]> {
      // Diffs would come from tool results in the session
      return [];
    },

    async accept(_diffId: string): Promise<Diff> {
      throw new Error('Real diff service: accept not implemented');
    },

    async reject(_diffId: string): Promise<Diff> {
      throw new Error('Real diff service: reject not implemented');
    },

    async acceptLine(_diffId: string, _lineIds: string[]): Promise<Diff> {
      throw new Error('Real diff service: acceptLine not implemented');
    },

    async rejectLine(_diffId: string, _lineIds: string[]): Promise<Diff> {
      throw new Error('Real diff service: rejectLine not implemented');
    },
  };
}
