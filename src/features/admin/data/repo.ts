import type { Inbox, Portfolio, Profile, Service, Settings, Skill } from '@/types/supabase'
import { MockTable, delay, now, uuid } from './table'
import { SEED_INBOX, SEED_PORTFOLIOS, SEED_PROFILE, SEED_SERVICES, SEED_SETTINGS, SEED_SKILLS } from './seed'

/**
 * Content repositories for the admin dashboard (mock-backed).
 * Each function documents the Supabase call that replaces it:
 *   const sb = supabase()  // from '@/features/secure/auth', typed with Database
 * Keep signatures; swap bodies now that the schema in supabase/schema is live.
 */

const profiles = new MockTable<Profile>('profiles', [SEED_PROFILE])
const settings = new MockTable<Settings>('settings', [SEED_SETTINGS])
const portfolios = new MockTable<Portfolio>('portfolios', SEED_PORTFOLIOS)
const services = new MockTable<Service>('services', SEED_SERVICES)
const skills = new MockTable<Skill>('skills', SEED_SKILLS)
const inboxes = new MockTable<Inbox>('inboxes', SEED_INBOX)

/* ------------------------------------------------------------------ files */

/**
 * Upload a file and return its public URL.
 * SUPABASE:
 *   const path = `${folder}/${crypto.randomUUID()}-${file.name}`
 *   await sb.storage.from(bucket).upload(path, file, { upsert: false, contentType: file.type })
 *   return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl
 */
export async function uploadPublicFile(_bucket: string, _folder: string, file: File): Promise<string> {
  // Mock: data URL so previews work without storage.
  const url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
  return delay(url, 500)
}

/* --------------------------------------------------------------- profiles */

/** SUPABASE: sb.from('profiles').select('*').eq('id', userId).single() */
export const getProfile = () => delay(profiles.all()[0])

/** SUPABASE: sb.from('profiles').update(patch).eq('id', id).select().single() */
export const updateProfile = (id: string, patch: Partial<Profile>) => delay(profiles.update(id, { ...patch, updated_at: now() }))

/* --------------------------------------------------------------- settings */

/** SUPABASE: sb.from('settings').select('*').eq('id', 1).single() */
export const getSettings = () => delay(settings.get(1)!)

/** SUPABASE: sb.from('settings').update(patch).eq('id', 1).select().single() */
export const updateSettings = (patch: Partial<Settings>) => delay(settings.update(1, { ...patch, updated_at: now() }))

/* ------------------------------------------------------------- portfolios */

/** SUPABASE: sb.from('portfolios').select('*').order('order_index') */
export const listPortfolios = () => delay(portfolios.all().sort((a, b) => a.order_index - b.order_index))

/** SUPABASE: sb.from('portfolios').insert(row).select().single() */
export const createPortfolio = (row: Omit<Portfolio, 'id' | 'created_at' | 'updated_at' | 'view_count' | 'published_at'>) =>
  delay(portfolios.insert({
    ...row, id: uuid(), view_count: 0, created_at: now(), updated_at: now(),
    published_at: row.status === 'published' ? now() : null,
  }))

/** SUPABASE: sb.from('portfolios').update(patch).eq('id', id).select().single() */
export const updatePortfolio = (id: string, patch: Partial<Portfolio>) => delay(portfolios.update(id, { ...patch, updated_at: now() }))

/** SUPABASE: sb.from('portfolios').delete().eq('id', id) (+ storage remove of thumbnail) */
export const deletePortfolio = (id: string) => delay(portfolios.remove(id))

/* --------------------------------------------------------------- services */

/** SUPABASE: sb.from('services').select('*').order('order_index') */
export const listServices = () => delay(services.all().sort((a, b) => a.order_index - b.order_index))

/** SUPABASE: sb.from('services').insert(row).select().single() */
export const createService = (row: Omit<Service, 'id' | 'created_at' | 'updated_at'>) =>
  delay(services.insert({ ...row, id: uuid(), created_at: now(), updated_at: now() }))

/** SUPABASE: sb.from('services').update(patch).eq('id', id).select().single() */
export const updateService = (id: string, patch: Partial<Service>) => delay(services.update(id, { ...patch, updated_at: now() }))

/** SUPABASE: sb.from('services').delete().eq('id', id) */
export const deleteService = (id: string) => delay(services.remove(id))

/* ----------------------------------------------------------------- skills */

/** SUPABASE: sb.from('skills').select('*').order('order_index') */
export const listSkills = () => delay(skills.all().sort((a, b) => a.order_index - b.order_index))

/** SUPABASE: sb.from('skills').insert(row).select().single() */
export const createSkill = (row: Omit<Skill, 'id' | 'created_at' | 'updated_at'>) =>
  delay(skills.insert({ ...row, id: uuid(), created_at: now(), updated_at: now() }))

/** SUPABASE: sb.from('skills').update(patch).eq('id', id).select().single() */
export const updateSkill = (id: string, patch: Partial<Skill>) => delay(skills.update(id, { ...patch, updated_at: now() }))

/** SUPABASE: sb.from('skills').delete().eq('id', id) */
export const deleteSkill = (id: string) => delay(skills.remove(id))

/* ---------------------------------------------------------------- inboxes */

/** SUPABASE: sb.from('inboxes').select('*').order('created_at', { ascending: false }) */
export const listInbox = () => delay(inboxes.all().sort((a, b) => b.created_at.localeCompare(a.created_at)))

/** SUPABASE: sb.from('inboxes').update(patch).eq('id', id).select().single() */
export const updateInbox = (id: string, patch: Partial<Inbox>) => delay(inboxes.update(id, patch))

/** SUPABASE: sb.from('inboxes').delete().eq('id', id) */
export const deleteInbox = (id: string) => delay(inboxes.remove(id))

/**
 * SUPABASE: replies go out through an Edge Function (never expose mail keys in the browser):
 *   await sb.functions.invoke('send-reply', { body: { inbox_id: id, message } })
 *   then sb.from('inboxes').update({ replied_at: new Date().toISOString(), status: 'read' }).eq('id', id)
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- message is sent by the Edge Function in production
export const replyInbox = (id: string, _message: string) =>
  delay(inboxes.update(id, { replied_at: now(), status: 'read' }), 600)

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

/**
 * SUPABASE: run in parallel with head-only counts, e.g.
 *   sb.from('portfolios').select('*', { count: 'exact', head: true })
 *   sb.from('inboxes').select('*', { count: 'exact', head: true }).eq('status', 'unread')
 *   sb.from('slides').select('*', { count: 'exact', head: true }).eq('is_active', true)
 */
export async function getStats(slidesActive: number, accessLogs: number): Promise<DashboardStats> {
  const inbox = inboxes.all()
  return delay({
    portfolios: portfolios.all().length,
    services: services.all().length,
    inboxUnread: inbox.filter((m) => m.status === 'unread').length,
    inboxTotal: inbox.length,
    skills: skills.all().length,
    slidesActive,
    accessLogs,
  })
}
