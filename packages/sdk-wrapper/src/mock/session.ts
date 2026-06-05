import type { Session, SessionWithMessages } from '@pi/types';
import type { SessionService } from '../services/session.js';
import { MOCK_SESSIONS, buildMockMessages } from './fixtures.js';

export class MockSessionService implements SessionService {
  private sessions: Session[] = [...MOCK_SESSIONS];
  private messagesCache = new Map<string, SessionWithMessages['messages']>();

  async list(workspaceId: string): Promise<Session[]> {
    return this.sessions
      .filter((s) => s.workspaceId === workspaceId)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  async get(id: string): Promise<SessionWithMessages> {
    const session = this.sessions.find((s) => s.id === id);
    if (!session) throw new Error(`Session not found: ${id}`);

    if (!this.messagesCache.has(id)) {
      this.messagesCache.set(id, buildMockMessages(id));
    }

    return {
      ...session,
      messages: this.messagesCache.get(id)!,
    };
  }

  async create(workspaceId: string, title?: string): Promise<Session> {
    const session: Session = {
      id: `sess-${Date.now()}`,
      workspaceId,
      title: title ?? `New Session ${new Date().toLocaleTimeString()}`,
      status: 'active',
      messageCount: 0,
      lastMessageAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.sessions.push(session);
    this.messagesCache.set(session.id, []);
    return session;
  }

  async delete(id: string): Promise<void> {
    this.sessions = this.sessions.filter((s) => s.id !== id);
    this.messagesCache.delete(id);
  }

  async archive(id: string): Promise<Session> {
    return this.setStatus(id, 'archived');
  }

  async unarchive(id: string): Promise<Session> {
    return this.setStatus(id, 'active');
  }

  async updateTitle(id: string, title: string): Promise<Session> {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Session not found: ${id}`);
    this.sessions[idx] = { ...this.sessions[idx], title, updatedAt: new Date().toISOString() };
    return { ...this.sessions[idx] };
  }

  private setStatus(id: string, status: Session['status']): Session {
    const idx = this.sessions.findIndex((s) => s.id === id);
    if (idx === -1) throw new Error(`Session not found: ${id}`);
    this.sessions[idx] = { ...this.sessions[idx], status, updatedAt: new Date().toISOString() };
    return { ...this.sessions[idx] };
  }
}
