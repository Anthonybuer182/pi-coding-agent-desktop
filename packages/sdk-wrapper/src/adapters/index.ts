import type { Transport } from '../transport/base.js';
import type { PiSDKClient } from '../client.js';
import { createSDKClient } from '../client.js';
import { createRealWorkspaceService } from './workspace.js';
import { createRealSessionService } from './session.js';
import { createRealChatService } from './chat.js';
import { createRealFileService } from './file.js';
import { createRealDiffService } from './diff.js';
import { createRealConfigService } from './config.js';
import { DEFAULT_SLASH_COMMANDS } from './skills.js';

export {
  createRealWorkspaceService,
  createRealSessionService,
  createRealChatService,
  createRealFileService,
  createRealDiffService,
  createRealConfigService,
  DEFAULT_SLASH_COMMANDS,
};
export { loadRealSkills, skillsToSlashCommands } from './skills.js';

export interface RealSDKClientOptions {
  transport: Transport;
  /** Working directory for the agent */
  cwd?: string;
  /** Agent config directory (default: ~/.pi/agent) */
  agentDir?: string;
}

/**
 * Create a PiSDKClient backed by the real @earendil-works/pi-coding-agent SDK.
 */
export function createRealSDKClient(options: RealSDKClientOptions): PiSDKClient {
  const cwd = options.cwd ?? process.cwd();
  const agentDir = options.agentDir;

  return createSDKClient({
    transport: options.transport,
    workspace: createRealWorkspaceService(),
    session: createRealSessionService(),
    chat: createRealChatService(cwd),
    file: createRealFileService(),
    diff: createRealDiffService(),
    config: createRealConfigService(cwd, agentDir),
  });
}
