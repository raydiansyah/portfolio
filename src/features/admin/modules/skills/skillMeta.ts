import type { SkillCategory } from '@/types/supabase'

export const SKILL_CATEGORIES: SkillCategory[] = ['frontend', 'backend', 'devops', 'design', 'teaching', 'other']

export const CATEGORY_LABEL: Record<SkillCategory, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  devops: 'DevOps',
  design: 'Design',
  teaching: 'Teaching',
  other: 'Other',
}

export const initials = (name: string) =>
  name.split(/[\s.\-/]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?'
