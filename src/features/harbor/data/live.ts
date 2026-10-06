import { isConfigured, supabase } from '@/lib/supabase'
import type { Database } from '@/types/database.gen'
import type { Experience, Profile, Service, Skill } from '@/types/supabase'
import { ABOUT, EXPERIENCE, FEATURED_PROJECTS, PROFILE, PROJECTS, SERVICES, type Project, type Service as SiteService } from './content'

/**
 * Live content for the public harbor, read from Supabase with the publishable
 * key (public-read RLS: visible `portofolio` projects, active services, skills,
 * profiles, published experiences).
 *
 * The static objects in content.ts are the fallback and are updated IN PLACE so
 * every panel, label and the 3D boards keep importing the same references.
 * Fields the tables don't have (project role/highlights/tint) are kept from the
 * static entry with the same slug.
 */

const FEATURED_COUNT = 4 // Portfolio Island has four project buoys
const TIMEOUT_MS = 2500

let loading: Promise<boolean> | null = null

type ProjectRow = Database['public']['Tables']['portofolio']['Row']

const CATEGORY_LABEL: Record<string, string> = { 'aplikasi-web': 'Web App', website: 'Website', 'company-profile': 'Company Profile' }

/** Project slug → `portofolio.id`, for click tracking. */
const projectIds = new Map<string, string>()

/** Deterministic muted two-stop tint for projects created in the dashboard. */
function tintFor(slug: string): [string, string] {
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) % 360
  return [`hsl(${h} 22% 26%)`, `hsl(${(h + 40) % 360} 30% 62%)`]
}

function toProject(p: ProjectRow): Project {
  const prev = PROJECTS.find((x) => x.id === p.slug)
  const caseStudy = [p.tantangan && `Challenge — ${p.tantangan}`, p.solusi && `Solution — ${p.solusi}`].filter((x): x is string => Boolean(x))
  return {
    id: p.slug,
    title: p.judul,
    category: CATEGORY_LABEL[p.kategori] ?? p.kategori,
    year: p.tanggal.slice(0, 4),
    summary: p.ringkasan,
    description: p.tujuan || p.ringkasan,
    role: prev?.role ?? p.durasi ?? '',
    stack: p.teknologi,
    highlights: caseStudy.length ? caseStudy : (prev?.highlights ?? []),
    liveUrl: p.url_demo ?? undefined,
    repoUrl: p.url_repo ?? undefined,
    featured: p.unggulan,
    tint: prev?.tint ?? tintFor(p.slug),
  }
}

function replace<T>(target: T[], next: T[]) {
  target.splice(0, target.length, ...next)
}

async function fetchAll() {
  const sb = supabase()
  const [portfolios, services, skills, profiles, experiences] = await Promise.all([
    sb.from('portofolio').select('*').eq('status_tampil', true).order('urutan').order('tanggal', { ascending: false }),
    sb.from('services').select('*').eq('is_active', true).order('order_index'),
    sb.from('skills').select('name, level').order('order_index'),
    sb.from('profiles').select('*').order('updated_at', { ascending: false }).limit(1),
    sb.from('experiences').select('*').eq('is_published', true)
      .order('end_year', { ascending: false, nullsFirst: true }).order('start_year', { ascending: false }).order('order_index'),
  ])
  return {
    portfolios: (portfolios.data ?? []) as ProjectRow[],
    services: (services.data ?? []) as Service[],
    skills: (skills.data ?? []) as Pick<Skill, 'name' | 'level'>[],
    profile: ((profiles.data ?? [])[0] ?? null) as Profile | null,
    experiences: (experiences.data ?? []) as Experience[],
  }
}

function apply({ portfolios, services, skills, profile, experiences }: Awaited<ReturnType<typeof fetchAll>>) {
  // Need enough projects for the island's four buoys; otherwise keep the static set.
  if (portfolios.length >= FEATURED_COUNT) {
    for (const p of portfolios) projectIds.set(p.slug, p.id)
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

/**
 * Record a project view as a `portfolio_click` row (shared with raydiansyah.com's
 * analytics). Once per project per tab session; fire-and-forget.
 */
export function trackProjectView(slug: string) {
  const id = projectIds.get(slug)
  if (!id || !isConfigured()) return
  const key = `harbor-viewed:${id}`
  try {
    if (sessionStorage.getItem(key)) return
    sessionStorage.setItem(key, '1')
  } catch {
    /* storage unavailable: still count */
  }
  void supabase().from('portfolio_click').insert({ portfolio_id: id })
}
