import type { Diff } from '@pi/types';

export interface DiffService {
  get(diffId: string): Promise<Diff>;
  list(sessionId: string): Promise<Diff[]>;
  accept(diffId: string): Promise<Diff>;
  reject(diffId: string): Promise<Diff>;
  acceptLine(diffId: string, lineIds: string[]): Promise<Diff>;
  rejectLine(diffId: string, lineIds: string[]): Promise<Diff>;
}
