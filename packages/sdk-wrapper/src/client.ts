import type { Transport } from './transport/base.js';
import type { WorkspaceService } from './services/workspace.js';
import type { SessionService } from './services/session.js';
import type { ChatService } from './services/chat.js';
import type { FileService } from './services/file.js';
import type { DiffService } from './services/diff.js';
import type { ConfigService } from './services/config.js';
import type { TransportEventType, TransportEventHandler } from '@pi/types';

export interface PiSDKClient {
  transport: Transport;
  workspace: WorkspaceService;
  session: SessionService;
  chat: ChatService;
  file: FileService;
  diff: DiffService;
  config: ConfigService;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  on(event: TransportEventType, handler: TransportEventHandler): void;
  off(event: TransportEventType, handler: TransportEventHandler): void;
}

export function createSDKClient(params: {
  transport: Transport;
  workspace: WorkspaceService;
  session: SessionService;
  chat: ChatService;
  file: FileService;
  diff: DiffService;
  config: ConfigService;
}): PiSDKClient {
  const { transport, workspace, session, chat, file, diff, config } = params;

  return {
    transport,
    workspace,
    session,
    chat,
    file,
    diff,
    config,

    async connect() {
      await transport.connect();
    },

    async disconnect() {
      await transport.disconnect();
    },

    on(event, handler) {
      transport.on(event, handler);
    },

    off(event, handler) {
      transport.off(event, handler);
    },
  };
}
