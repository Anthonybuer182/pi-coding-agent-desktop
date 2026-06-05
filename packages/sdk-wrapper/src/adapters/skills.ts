import { loadSkills, type Skill as RealSkill } from '@earendil-works/pi-coding-agent';
import type { Skill, SlashCommand } from '@pi/types';

/**
 * Load skills from the real SDK and convert to our Skill type.
 */
export async function loadRealSkills(cwd: string, agentDir: string): Promise<Skill[]> {
  const result = await loadSkills({
    cwd,
    agentDir,
    skillPaths: [],
    includeDefaults: true,
  });

  return result.skills.map(realSkillToSkill);
}

function realSkillToSkill(s: RealSkill): Skill {
  return {
    id: `skill-${s.name.toLowerCase().replace(/\s+/g, '-')}`,
    name: s.name,
    description: s.description,
    category: 'custom',
    enabled: !s.disableModelInvocation,
  };
}

/**
 * Build slash commands from available skills.
 */
export function skillsToSlashCommands(skills: Skill[]): SlashCommand[] {
  return skills.map((s) => ({
    id: `sc-${s.id}`,
    name: `/${s.name}`,
    description: s.description,
    category: 'skill',
  }));
}

/**
 * Default built-in slash commands.
 */
export const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  { id: 'sc-help', name: '/help', description: 'Show help information', category: 'chat' },
  { id: 'sc-clear', name: '/clear', description: 'Clear the current conversation', category: 'chat' },
  { id: 'sc-compact', name: '/compact', description: 'Compact conversation context', category: 'chat' },
  { id: 'sc-model', name: '/model', description: 'Switch the AI model', category: 'config' },
  { id: 'sc-config', name: '/config', description: 'Show or update config', category: 'config' },
  { id: 'sc-diff', name: '/diff', description: 'Show diff for current session', category: 'chat' },
  { id: 'sc-bash', name: '/bash', description: 'Execute a bash command', category: 'tool', args: [{ name: 'command', description: 'Bash command to execute', required: true, type: 'string' }] },
  { id: 'sc-file', name: '/file', description: 'Open a file', category: 'file', args: [{ name: 'path', description: 'File path', required: true, type: 'string' }] },
];
