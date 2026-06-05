export type SkillCategory = 'document' | 'filesystem' | 'code' | 'utility' | 'custom';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  enabled: boolean;
  icon?: string;
}
