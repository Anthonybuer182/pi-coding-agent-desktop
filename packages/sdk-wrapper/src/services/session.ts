import type { Session, SessionWithMessages, SessionTreeResult } from '@pi/types';

export interface SessionService {
  list(workspaceId: string): Promise<Session[]>;
  get(id: string): Promise<SessionWithMessages>;
  create(workspaceId: string, title?: string): Promise<Session>;
  delete(id: string): Promise<void>;
  archive(id: string): Promise<Session>;
  unarchive(id: string): Promise<Session>;
  updateTitle(id: string, title: string): Promise<Session>;
  getTree(id: string): Promise<SessionTreeResult>;
}
