import type { Diff } from '@pi/types';
import type { DiffService } from '../services/diff.js';
import { MOCK_DIFFS } from './fixtures.js';

export class MockDiffService implements DiffService {
  private diffs: Diff[] = [...MOCK_DIFFS];

  async get(diffId: string): Promise<Diff> {
    const diff = this.diffs.find((d) => d.id === diffId);
    if (!diff) throw new Error(`Diff not found: ${diffId}`);
    return { ...diff };
  }

  async list(sessionId: string): Promise<Diff[]> {
    return this.diffs.filter((d) => d.sessionId === sessionId);
  }

  async accept(diffId: string): Promise<Diff> {
    return this.updateStatus(diffId, 'accepted');
  }

  async reject(diffId: string): Promise<Diff> {
    return this.updateStatus(diffId, 'rejected');
  }

  async acceptLine(diffId: string, _lineIds: string[]): Promise<Diff> {
    return this.updateStatus(diffId, 'partial');
  }

  async rejectLine(diffId: string, _lineIds: string[]): Promise<Diff> {
    return this.updateStatus(diffId, 'partial');
  }

  private updateStatus(diffId: string, status: Diff['status']): Diff {
    const idx = this.diffs.findIndex((d) => d.id === diffId);
    if (idx === -1) throw new Error(`Diff not found: ${diffId}`);
    this.diffs[idx] = { ...this.diffs[idx], status };
    return { ...this.diffs[idx] };
  }
}
