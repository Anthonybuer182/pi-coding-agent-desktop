import type { Transport } from '../transport/base.js';
import type { PiSDKClient } from '../client.js';
import { createSDKClient } from '../client.js';
import { MockWorkspaceService } from './workspace.js';
import { MockSessionService } from './session.js';
import { MockChatService } from './chat.js';
import { MockFileService } from './file.js';
import { MockDiffService } from './diff.js';
import { MockConfigService } from './config.js';

export { MockWorkspaceService, MockSessionService, MockChatService, MockFileService, MockDiffService, MockConfigService };
export * from './fixtures.js';

export function createMockSDKClient(transport?: Transport): PiSDKClient {
  const noopTransport: Transport = {
    async connect() {},
    async disconnect() {},
    async request() { throw new Error('Transport not available in mock mode'); },
    on() {},
    off() {},
    isConnected() { return false; },
  };

  return createSDKClient({
    transport: transport ?? noopTransport,
    workspace: new MockWorkspaceService(),
    session: new MockSessionService(),
    chat: new MockChatService(),
    file: new MockFileService(),
    diff: new MockDiffService(),
    config: new MockConfigService(),
  });
}
