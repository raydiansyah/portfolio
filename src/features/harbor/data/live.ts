import { isConfigured, supabase } from '@/lib/supabase'
import type { Experience, Portfolio, Profile, Service, Skill } from '@/types/supabase'
import { ABOUT, EXPERIENCE, FEATURED_PROJECTS, PROFILE, PROJECTS, SERVICES, type Project, type Service as SiteService } from './content'

/**
 * Live content for the public harbor, read from Supabase with the publishable
 * key (public-read RLS: published portfolios, active services, skills, profiles,
 * published experiences).
 *
 * The static objects in content.ts are the fallback and are updated IN PLACE so
 * every panel, label and the 3D boards keep importing the same references.
 * Fields the tables don't have (project role/highlights/tint) are kept from the
 * static entry with the same slug.
 */

const FEATURED_COUNT = 4 // Portfolio Island has four project buoys
const TIMEOUT_MS = 2500

let loading: Promise<boolean> | null = null

/** Deterministic muted two-stop tint for projects created in the dashboard. */
function tintFor(slug: string): [string, string] {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 360
  return [`hsl(${h} 22% 26%)`, `hsl(${(h + 40) % 360} 30% 62%)`]
}

function toProject(p: Portfolio): Project {
  const prev = PROJECTS.find((x) => x.id === p.slug)
  return {
    id: p.slug,
    title: p.title,
    category: p.category,
    year: (p.published_at ?? p.created_at).slice(0, 4),
    summary: p.summary ?? '',
    description: p.description ?? p.summary ?? '',
    role: prev?.role ?? '',
    stack: p.tech_stack,
    highlights: prev?.highlights ?? [],
    liveUrl: p.live_url ?? undefined,
    repoUrl: p.repo_url ?? undefined,
    featured: p.featured,
    tint: prev?.tint ?? tintFor(p.slug),
  }
}

function replace<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next)
}

async function fetchAll() {
  const sb = supabase()
  const [portfolios, services, skills, profiles, experiences] = await Promise.all([
    sb.from('portfolios').select('*').eq('status', 'published').order('order_index'),
    sb.from('services').select('*').eq('is_active', true).order('order_index'),
    sb.from('skills').select('name, level').order('order_index'),
    sb.from('profiles').select('*').order('updated_at', { ascending: false }).limit(1),
    sb.from('experiences').select('*').eq('is_published', true)
      .order('end_year', { ascending: false, nullsFirst: true }).order('start_year', { ascending: false }).order('order_index'),
  ])
  return {
    portfolios: (portfolios.data ?? []) as Portfolio[],
    services: (services.data ?? []) as Service[],
    skills: (skills.data ?? []) as Pick<Skill, 'name' | 'level'>[],
    profile: ((profiles.data ?? [])[0] ?? null) as Profile | null,
    experiences: (experiences.data ?? []) as Experience[],
  }
}

function apply({ portfolios, services, skills, profile, experiences }: Awaited<ReturnType<typeof fetchAll>>) {
  // Need enough projects for the island's four buoys; otherwise keep the static set.
  if (portfolios.length >= FEATURED_COUNT) {
    const projects = portfolios.map(toProject)
    replace(PROJECTS, projects)
    const featured = [...projects.filter((p) => p.featured), ...projects.filter((p) => !p.featured)]
    replace(FEATURED_PROJECTS, featured.slice(0, FEATURED_COUNT))
  }

  if (services.length) {
    replace<SiteService>(SERVICES, services.map((s) => {
      const prev = SERVICES.find((x) => x.title === s.name)
      return { title: s.name, summary: s.description ?? '', deliverables: prev?.deliverables ?? (s.price_label ? [s.price_label] : []) }
    }))
  }

  if (skills.length) replace(ABOUT.stack, skills.map((s) => s.name))

  if (experiences.length) {
    replace(EXPERIENCE, experiences.map((x) => ({
      role: x.role,
      org: x.organization,
      period: `${x.start_year} — ${x.end_year ?? 'Now'}`,
      location: x.location ?? '',
      summary: x.summary ?? '',
      stack: x.stack,
    })))
  }

  if (profile) {
    if (profile.full_name) PROFILE.name = profile.full_name
    if (profile.headline) PROFILE.role = profile.headline
    if (profile.email) PROFILE.email = profile.email
    if (profile.location) PROFILE.location = profile.location
    if (profile.social_links.github) PROFILE.links.github = profile.social_links.github
    if (profile.social_links.linkedin) PROFILE.links.linkedin = profile.social_links.linkedin
    if (profile.bio) replace(ABOUT.paragraphs, profile.bio.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean))
  }
}

/**
 * Load once; resolves true when live data was applied. Never rejects and never
 * waits longer than TIMEOUT_MS, so the 3D world isn't held hostage by the network.
 */
export function loadLiveContent(): Promise<boolean> {
  if (!isConfigured()) return Promise.resolve(false)
  loading ??= Promise.race([
    fetchAll().then((data) => (apply(data), true)),
    new Promise<boolean>((r) => setTimeout(() => r(false), TIMEOUT_MS)),
  ]).catch(() => false)
  return loading
}

/** Count a project view for the dashboard's "Populer" sort (fire-and-forget). */
export function trackProjectView(slug: string) {
  if (!isConfigured()) return
  void supabase().rpc('increment_portfolio_view', { p_slug: slug })
}
