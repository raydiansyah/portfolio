import { omit, supabase, unwrap } from '@/lib/supabase'
import type { Database } from '@/types/database.gen'
import type { Experience, Inbox, Portfolio, Profile, Service, Settings, Skill } from '@/types/supabase'

/**
 * Content repositories for the admin dashboard, backed by Supabase.
 * Writes are allowed by RLS only for admin JWTs (`private.is_admin()`);
 * public pages read the same tables through their public-read policies.
 */

const sb = () => supabase()

/* ------------------------------------------------------------------ files */

/** Upload to a public bucket and return the public URL. */
export async function uploadPublicFile(bucket: string, folder: string, file: File): Promise<string> {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-80)
  const path = `${folder}/${crypto.randomUUID()}-${safe}`
  unwrap(await sb().storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type, cacheControl: '31536000' }))
  return sb().storage.from(bucket).getPublicUrl(path).data.publicUrl
}

/* --------------------------------------------------------------- profiles */

/** The signed-in admin's profile; a blank draft (not yet saved) if none exists. */
export async function getProfile(): Promise<Profile> {
  const { data: auth } = await sb().auth.getUser()
  const user = auth.user
  if (!user) throw new Error('Not signed in')
  const row = unwrap<Profile | null>(await sb().from('profiles').select('*').eq('id', user.id).maybeSingle())
  return (
    row ?? {
      id: user.id,
      full_name: (user.user_metadata?.name as string | undefined) ?? '',
      headline: null, bio: null, avatar_url: null, email: user.email ?? null, phone: null, location: null,
      social_links: {}, updated_at: new Date().toISOString(),
    }
  )
}

/** Upsert so the first save creates the row. */
export async function updateProfile(id: string, patch: Partial<Profile>): Promise<Profile> {
  const rest = omit(patch, 'updated_at')
  return unwrap(await sb().from('profiles').upsert({ id, full_name: '', ...rest } as never).select().single())
}

/* --------------------------------------------------------------- settings */

export async function getSettings(): Promise<Settings> {
  return unwrap(await sb().from('settings').select('*').eq('id', 1).single())
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  return unwrap(await sb().from('settings').update(omit(patch, 'id', 'updated_at') as never).eq('id', 1).select().single())
}

/* ------------------------------------------------------------- portfolios */

type ProjectRow = Database['public']['Tables']['portofolio']['Row']
type ProjectUpdate = Database['public']['Tables']['portofolio']['Update']

function toPortfolio(r: ProjectRow, views = 0): Portfolio {
  return {
    id: r.id,
    slug: r.slug,
    title: r.judul,
    category: r.kategori,
    summary: r.ringkasan || null,
    description: r.tujuan,
    challenge: r.tantangan,
    solution: r.solusi,
    duration: r.durasi,
    thumbnail_url: r.url_gambar,
    tech_stack: r.teknologi,
    live_url: r.url_demo,
    repo_url: r.url_repo,
    status: r.status_tampil ? 'published' : 'draft',
    featured: r.unggulan,
    view_count: views,
    order_index: r.urutan,
    published_at: r.tanggal,
    created_at: r.tanggal,
    updated_at: r.tanggal,
  }
}

function toProjectRow(p: Partial<Portfolio>): ProjectUpdate {
  const row: ProjectUpdate = {}
  if (p.slug !== undefined) row.slug = p.slug
  if (p.title !== undefined) row.judul = p.title
  if (p.category !== undefined) row.kategori = p.category
  if (p.summary !== undefined) row.ringkasan = p.summary ?? ''
  if (p.description !== undefined) row.tujuan = p.description
  if (p.challenge !== undefined) row.tantangan = p.challenge
  if (p.solution !== undefined) row.solusi = p.solution
  if (p.duration !== undefined) row.durasi = p.duration
  if (p.thumbnail_url !== undefined) row.url_gambar = p.thumbnail_url
  if (p.tech_stack !== undefined) row.teknologi = p.tech_stack
  if (p.live_url !== undefined) row.url_demo = p.live_url
  if (p.repo_url !== undefined) row.url_repo = p.repo_url
  if (p.status !== undefined) row.status_tampil = p.status === 'published'
  if (p.featured !== undefined) row.unggulan = p.featured
  if (p.order_index !== undefined) row.urutan = p.order_index
  return row
}

/** Projects with their click totals (one small index query, counted client-side). */
export async function listPortfolios(): Promise<Portfolio[]> {
  const [rows, clicks] = await Promise.all([
    sb().from('portofolio').select('*').order('urutan').order('tanggal', { ascending: false }),
    sb().from('portfolio_click').select('portfolio_id'),
  ])
  const views = new Map<string, number>()
  for (const c of unwrap<{ portfolio_id: string }[]>(clicks)) views.set(c.portfolio_id, (views.get(c.portfolio_id) ?? 0) + 1)
  return unwrap<ProjectRow[]>(rows).map((r) => toPortfolio(r, views.get(r.id)))
}

export async function createPortfolio(draft: Omit<Portfolio, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'published_at'>): Promise<Portfolio> {
  const { data } = await sb().auth.getUser()
  if (!data.user) throw new Error('Not signed in')
  const row = { ...toProjectRow(draft), created_by: data.user.id } as Database['public']['Tables']['portofolio']['Insert']
  return toPortfolio(unwrap(await sb().from('portofolio').insert(row).select().single()))
}

export async function updatePortfolio(id: string, patch: Partial<Portfolio>): Promise<Portfolio> {
  const row = toProjectRow(omit(patch, 'id', 'created_at', 'updated_at', 'view_count', 'published_at'))
  return toPortfolio(unwrap(await sb().from('portofolio').update(row).eq('id', id).select().single()), patch.view_count)
}

export async function deletePortfolio(id: string) {
  unwrap(await sb().from('portofolio').delete().eq('id', id))
}

/* --------------------------------------------------------------- services */

export async function listServices(): Promise<Service[]> {
  return unwrap(await sb().from('services').select('*').order('order_index'))
}

export async function createService(row: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service> {
  return unwrap(await sb().from('services').insert(row as never).select().single())
}

export async function updateService(id: string, patch: Partial<Service>): Promise<Service> {
  return unwrap(await sb().from('services').update(omit(patch, 'id', 'created_at', 'updated_at') as never).eq('id', id).select().single())
}

export async function deleteService(id: string) {
  unwrap(await sb().from('services').delete().eq('id', id))
}

/* ----------------------------------------------------------------- skills */

export async function listSkills(): Promise<Skill[]> {
  return unwrap(await sb().from('skills').select('*').order('order_index'))
}

export async function createSkill(row: Omit<Skill, 'id' | 'created_at' | 'updated_at'>): Promise<Skill> {
  return unwrap(await sb().from('skills').insert(row as never).select().single())
}

export async function updateSkill(id: string, patch: Partial<Skill>): Promise<Skill> {
  return unwrap(await sb().from('skills').update(omit(patch, 'id', 'created_at', 'updated_at') as never).eq('id', id).select().single())
}

export async function deleteSkill(id: string) {
  unwrap(await sb().from('skills').delete().eq('id', id))
}

/* ------------------------------------------------------------ experiences */

/** Newest first: current roles (no end year) on top, then by start year. */
export async function listExperiences(): Promise<Experience[]> {
  return unwrap(
    await sb().from('experiences').select('*')
      .order('end_year', { ascending: false, nullsFirst: true })
      .order('start_year', { ascending: false })
      .order('order_index'),
  )
}

export async function createExperience(row: Omit<Experience, 'id' | 'created_at' | 'updated_at'>): Promise<Experience> {
  return unwrap(await sb().from('experiences').insert(row).select().single())
}

export async function updateExperience(id: string, patch: Partial<Experience>): Promise<Experience> {
  return unwrap(await sb().from('experiences').update(omit(patch, 'id', 'created_at', 'updated_at')).eq('id', id).select().single())
}

export async function deleteExperience(id: string) {
  unwrap(await sb().from('experiences').delete().eq('id', id))
}

/* ---------------------------------------------------------------- inboxes */

type ContactRow = Database['public']['Tables']['pesan_kontak']['Row']
type ContactUpdate = Database['public']['Tables']['pesan_kontak']['Update']

// pesan_kontak.status: baru | dibaca | ditindaklanjuti | arsip
const TO_STATUS: Record<string, Inbox['status']> = { baru: 'unread', dibaca: 'read', ditindaklanjuti: 'read', arsip: 'archived' }
const FROM_STATUS: Record<Inbox['status'], string> = { unread: 'baru', read: 'dibaca', archived: 'arsip' }

export function toInbox(r: ContactRow): Inbox {
  return {
    id: r.id,
    sender_name: r.nama,
    sender_email: r.email,
    subject: r.jenis_layanan || 'General inquiry',
    phone: r.telepon,
    service: r.jenis_layanan,
    budget: r.perkiraan_anggaran,
    body: r.pesan,
    status: TO_STATUS[r.status] ?? 'unread',
    is_important: r.penting,
    replied_at: r.dibalas_pada,
    created_at: r.dibuat_pada,
  }
}

export async function listInbox(): Promise<Inbox[]> {
  const rows = unwrap<ContactRow[]>(await sb().from('pesan_kontak').select('*').order('dibuat_pada', { ascending: false }))
  return rows.map(toInbox)
}
export async function updateInbox(id: string, patch: Partial<Inbox>): Promise<Inbox> {
  const row: ContactUpdate = {}
  if (patch.status !== undefined) row.status = FROM_STATUS[patch.status]
  if (patch.is_important !== undefined) row.penting = patch.is_important
  return toInbox(unwrap(await sb().from('pesan_kontak').update(row).eq('id', id).select().single()))
}
export async function deleteInbox(id: string) {
  unwrap(await sb().from('pesan_kontak').delete().eq('id', id))
}
/** Sends the reply email via the admin-only `inbox-reply` Edge Function (Resend); marks the message followed up. */
export async function replyInbox(id: string, message: string): Promise<Inbox> {
  const { data, error } = await sb().functions.invoke<{ inbox: ContactRow }>('inbox-reply', { body: { inbox_id: id, message } })
  if (error || !data) throw new Error(error?.message ?? 'Reply failed')
  return toInbox(data.inbox)
}

/* ---------------------------------------------------------------- summary */

export interface DashboardStats {
  portfolios: number
  services: number
  inboxUnread: number
  inboxTotal: number
  skills: number
  slidesActive: number
  accessLogs: number
}

const count = async (q: PromiseLike<{ count: number | null; error: { message: string } | null }>) => {
  const { count: n, error } = await q
  if (error) throw new Error(error.message)
  return n ?? 0
}

/** Head-only counts in parallel (no rows transferred). */
export async function getStats(slidesActive: number, accessLogs: number): Promise<DashboardStats> {
  const head = { count: 'exact' as const, head: true }
  const [portfolios, services, skills, inboxTotal, inboxUnread] = await Promise.all([
    count(sb().from('portofolio').select('*', head)),
    count(sb().from('services').select('*', head)),
    count(sb().from('skills').select('*', head)),
    count(sb().from('pesan_kontak').select('*', head)),
    count(sb().from('pesan_kontak').select('*', head).eq('status', 'baru')),
  ])
  return { portfolios, services, inboxUnread, inboxTotal, skills, slidesActive, accessLogs }
}
