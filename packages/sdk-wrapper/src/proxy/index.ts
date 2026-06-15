import type { Transport } from '../transport/base.js';
import type { PiSDKClient } from '../client.js';
import { createSDKClient } from '../client.js';
import { createProxyWorkspaceService } from './workspace.js';
import { createProxySessionService } from './session.js';
import { createProxyChatService } from './chat.js';
import { createProxyFileService } from './file.js';
import { createProxyConfigService } from './config.js';
import type { SlashCommand } from '@pi/types';

/**
 * Default built-in slash commands.
 */
export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { id: 'sc-help', name: '/help', description: 'Show help information', category: 'chat' },
  { id: 'sc-clear', name: '/clear', description: 'Clear the current conversation', category: 'chat' },
  { id: 'sc-compact', name: '/compact', description: 'Compact conversation context', category: 'chat' },
  { id: 'sc-model', name: '/model', description: 'Switch the AI model', category: 'config' },
  { id: 'sc-config', name: '/config', description: 'Show or update config', category: 'config' },
  { id: 'sc-bash', name: '/bash', description: 'Execute a bash command', category: 'tool', args: [{ name: 'command', description: 'Bash command to execute', required: true, type: 'string' }] },
  { id: 'sc-file', name: '/file', description: 'Open a file', category: 'file', args: [{ name: 'path', description: 'File path', required: true, type: 'string' }] },
];

export interface ProxySDKClientOptions {
  transport: Transport;
}

/**
 * Create a PiSDKClient where all service calls are proxied through the transport.
 * This is used by renderers (web and Electron) - no Node.js imports needed.
 */
export function createProxySDKClient(options: ProxySDKClientOptions): PiSDKClient {
  const { transport } = options;

  return createSDKClient({
    transport,
    workspace: createProxyWorkspaceService(transport),
    session: createProxySessionService(transport),
    chat: createProxyChatService(transport),
    file: createProxyFileService(transport),
    config: createProxyConfigService(transport),
  });
}
