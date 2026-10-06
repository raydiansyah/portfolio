import type { PublicSlideMeta, Slide, SlideAccessGrant, SlideAccessLog } from '@/types/supabase'
import { MockTable, delay, now, uuid } from './table'
import { MOCK_SLIDE_CODES, SEED_ACCESS_LOGS, SEED_SLIDES } from './seed'

/**
 * Slide repository shared by the admin Slide Manager and the public portal.
 *
 * Security model (see supabase/schema): the public never reads `slides`
 * directly. `get_public_slide` returns safe metadata; `verify_slide_access`
 * checks the code server-side (bcrypt), writes an access log and returns a
 * short-lived signed URL for the private `slides` bucket.
 */

const slides = new MockTable<Slide>('slides', SEED_SLIDES)
const logs = new MockTable<SlideAccessLog>('slide_access_logs', SEED_ACCESS_LOGS)
const CODES_KEY = 'admin-mock:slide-codes'

function codes(): Record<string, string> {
  try {
    return { ...MOCK_SLIDE_CODES, ...JSON.parse(localStorage.getItem(CODES_KEY) ?? '{}') }
  } catch {
    return { ...MOCK_SLIDE_CODES }
  }
}

function saveCode(slug: string, code: string | null) {
  const all = codes()
  if (code) all[slug] = code
  else delete all[slug]
  try {
    localStorage.setItem(CODES_KEY, JSON.stringify(all))
  } catch {
    /* ignore */
  }
}

/* ----------------------------------------------------------------- admin */

/** SUPABASE: sb.from('slides').select('*').order('order_index') — admin-only via RLS (private.is_admin()) */
export const listSlides = () => delay(slides.all().sort((a, b) => a.order_index - b.order_index))

/** SUPABASE: sb.from('slide_access_logs').select('*').order('accessed_at', { ascending: false }).limit(n) */
export const listAccessLogs = (limit = 50) =>
  delay(logs.all().sort((a, b) => b.accessed_at.localeCompare(a.accessed_at)).slice(0, limit))

/** SUPABASE: sb.from('slide_access_logs').select('*', { count: 'exact', head: true }) */
export const countAccessLogs = () => delay(logs.all().length, 80)

export type SlideDraft = Omit<Slide, 'id' | 'created_at' | 'updated_at' | 'access_code' | 'page_count' | 'outline'> & {
  outline?: Slide['outline']
}

/**
 * Create a slide. `plainCode` is hashed server-side and never stored in plain text.
 * SUPABASE:
 *   const { data } = await sb.from('slides').insert({ ...draft, access_code: null }).select().single()
 *   if (draft.is_protected) await sb.rpc('set_slide_access_code', { p_slide_id: data.id, p_code: plainCode })
 */
export async function createSlide(draft: SlideDraft, plainCode: string | null) {
  const row = slides.insert({
    ...draft, outline: draft.outline ?? [], id: uuid(), page_count: null,
    access_code: draft.is_protected && plainCode ? '$2a$mock$hash' : null, created_at: now(), updated_at: now(),
  })
  saveCode(row.slug, draft.is_protected ? plainCode : null)
  return delay(row)
}

/** SUPABASE: sb.from('slides').update(patch).eq('id', id).select().single() (+ set_slide_access_code when the code changes) */
export async function updateSlide(id: string, patch: Partial<SlideDraft>, plainCode?: string | null) {
  const row = slides.update(id, { ...patch, updated_at: now() })
  if (plainCode !== undefined || patch.is_protected === false) {
    const code = row.is_protected ? plainCode ?? null : null
    saveCode(row.slug, code)
    slides.update(id, { access_code: code ? '$2a$mock$hash' : null })
  }
  return delay(slides.get(id)!)
}

/** SUPABASE: sb.from('slides').delete().eq('id', id); sb.storage.from('slides').remove([row.file_url]) */
export const deleteSlide = (id: string) => delay(slides.remove(id))

/**
 * Persist a new order after drag-and-drop.
 * SUPABASE: sb.from('slides').upsert(ids.map((id, order_index) => ({ id, order_index })), { onConflict: 'id' })
 */
export async function reorderSlides(ids: string[]) {
  const byId = new Map(slides.all().map((s) => [s.id, s]))
  slides.replaceAll(ids.map((id, i) => ({ ...byId.get(id)!, order_index: i })))
  return delay(undefined, 150)
}

/**
 * Upload a slide file to the PRIVATE bucket.
 * SUPABASE:
 *   const path = `${moduleCategory}/${slug}/${file.name}`
 *   await sb.storage.from('slides').upload(path, file, { upsert: true, contentType: file.type })
 *   return path   // stored in slides.file_url; served only via createSignedUrl()
 * HTML bundles (.zip) are unpacked by an Edge Function into `${slug}/index.html`.
 */
export async function uploadSlideFile(slug: string, file: File, onProgress?: (p: number) => void) {
  for (let p = 0; p <= 1; p += 0.2) {
    onProgress?.(p)
    await delay(null, 120)
  }
  // Mock: object URL lives for this tab only.
  return { path: URL.createObjectURL(file), name: `${slug}/${file.name}` }
}

/** Mock helper so the admin can show the current code (in production the plain code is shown once, at creation). */
export const peekMockCode = (slug: string) => codes()[slug] ?? null

/* ---------------------------------------------------------------- public */

/** SUPABASE: sb.rpc('get_public_slide', { p_slug: slug }) */
export async function getPublicSlide(slug: string): Promise<PublicSlideMeta | null> {
  const s = slides.find((r) => r.slug === slug && r.is_active)
  if (!s) return delay(null)
  const { title, description, presenter, file_type, is_protected, module_category } = s
  return delay({ slug, title, description, presenter, file_type, is_protected, module_category })
}

export type AccessResult = { ok: true; grant: SlideAccessGrant } | { ok: false; reason: 'wrong-code' | 'not-found' | 'rate-limit' }

const attempts = new Map<string, number[]>()

/**
 * Verify the access code and get a signed URL.
 * SUPABASE: const { data, error } = await sb.rpc('verify_slide_access', { p_slug: slug, p_code: code })
 *           (server enforces rate limiting and writes slide_access_logs)
 */
export async function verifySlideAccess(slug: string, code: string | null): Promise<AccessResult> {
  const recent = (attempts.get(slug) ?? []).filter((t) => Date.now() - t < 60_000)
  if (recent.length >= 5) return delay({ ok: false, reason: 'rate-limit' })
  const s = slides.find((r) => r.slug === slug && r.is_active)
  if (!s) return delay({ ok: false, reason: 'not-found' })
  if (s.is_protected) {
    const expected = codes()[slug]
    if (!code || !expected || code.trim().toUpperCase() !== expected.toUpperCase()) {
      attempts.set(slug, [...recent, Date.now()])
      return delay({ ok: false, reason: 'wrong-code' }, 450)
    }
  }
  attempts.delete(slug)
  logs.insert({ id: uuid(), slide_id: s.id, accessed_at: now(), ip_hash: null, user_agent: navigator.userAgent.slice(0, 120), referrer: document.referrer || null })
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { access_code, ...safe } = s
  return delay({ ok: true, grant: { slide: safe, signed_url: s.file_url, expires_in: 3600 } }, 350)
}

/** Generate a 6-digit PIN using the CSPRNG (never Math.random for access codes). */
export function generatePin() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

/** Public share URL for a slide. */
export const shareUrl = (slug: string) => `${location.origin}/slides/${slug}`
