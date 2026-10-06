import {
  Briefcase, Cog, Gauge, Globe2, Inbox, LayoutTemplate, Presentation, Sparkles, UserRound, type LucideIcon,
} from 'lucide-react'

export interface NavItem {
  path: string
  label: string
  icon: LucideIcon
  group: 'Overview' | 'Content' | 'Engagement' | 'System'
}

/** Single source for sidebar, breadcrumbs and route table. Paths are relative to /secure. */
export const NAV: NavItem[] = [
  { path: '/dashboard', label: 'Dashboard', icon: Gauge, group: 'Overview' },
  { path: '/portfolio', label: 'Portofolio', icon: Briefcase, group: 'Content' },
  { path: '/services', label: 'Layanan', icon: LayoutTemplate, group: 'Content' },
  { path: '/skills', label: 'Skills', icon: Sparkles, group: 'Content' },
  { path: '/slides', label: 'Slides', icon: Presentation, group: 'Content' },
  { path: '/inbox', label: 'Inbox', icon: Inbox, group: 'Engagement' },
  { path: '/site', label: 'View Sites', icon: Globe2, group: 'Engagement' },
  { path: '/profile', label: 'Profile', icon: UserRound, group: 'System' },
  { path: '/settings', label: 'Settings', icon: Cog, group: 'System' },
]

export const NAV_GROUPS: NavItem['group'][] = ['Overview', 'Content', 'Engagement', 'System']

export const BASE = '/secure'
