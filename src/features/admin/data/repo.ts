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

export async function listPortfolios(): Promise<Portfolio[]> {
  return unwrap(await sb().from('portfolios').select('*').order('order_index'))
}

export async function createPortfolio(row: Omit<Portfolio, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'published_at'>): Promise<Portfolio> {
  const published_at = row.status === 'published' ? new Date().toISOString() : null
  return unwrap(await sb().from('portfolios').insert({ ...row, published_at } as never).select().single())
}

export async function updatePortfolio(id: string, patch: Partial<Portfolio>): Promise<Portfolio> {
  const rest = omit(patch, 'id', 'created_at', 'updated_at', 'view_count')
  return unwrap(await sb().from('portfolios').update(rest as never).eq('id', id).select().single())
}

export async function deletePortfolio(id: string) {
  unwrap(await sb().from('portfolios').delete().eq('id', id))
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
    count(sb().from('portfolios').select('*', head)),
    count(sb().from('services').select('*', head)),
    count(sb().from('skills').select('*', head)),
    count(sb().from('pesan_kontak').select('*', head)),
    count(sb().from('pesan_kontak').select('*', head).eq('status', 'baru')),
  ])
  return { portfolios, services, inboxUnread, inboxTotal, skills, slidesActive, accessLogs }
}
