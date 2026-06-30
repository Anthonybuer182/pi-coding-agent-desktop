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
];
