import { omit, supabase, unwrap } from '@/lib/supabase'
import { STORAGE_BUCKETS, type PublicSlideMeta, type Slide, type SlideAccessGrant, type SlideAccessLog } from '@/types/supabase'

/**
 * Slide repository shared by the admin Slide Manager and the public portal.
 *
 * Security model: the public never reads `slides` directly. `get_public_slide`
 * returns safe metadata; the `slide-access` Edge Function checks the code
 * (bcrypt, server-side), rate-limits per client IP, logs the access and returns
 * a short-lived signed URL for the private `slides` bucket.
 */

const sb = () => supabase()

/* ----------------------------------------------------------------- admin */

export async function listSlides(): Promise<Slide[]> {
  return unwrap(await sb().from('slides').select('*').order('order_index'))
}

export async function listAccessLogs(limit = 50): Promise<SlideAccessLog[]> {
  return unwrap(await sb().from('slide_access_logs').select('*').order('accessed_at', { ascending: false }).limit(limit))
}

export async function countAccessLogs(): Promise<number> {
  const { count, error } = await sb().from('slide_access_logs').select('*', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

export type SlideDraft = Omit<Slide, 'id' | 'created_at' | 'updated_at' | 'access_code' | 'page_count' | 'outline' | 'module_id'> & {
  outline?: Slide['outline']
  module_id?: string | null
}

/**
 * Create a slide; the access code is hashed server-side by `set_slide_access_code`
 * (never stored or returned in plain text). `is_protected` is set by that RPC so the
 * `protected_needs_code` constraint holds during the insert.
 */
export async function createSlide(draft: SlideDraft, plainCode: string | null): Promise<Slide> {
  const row = unwrap<Slide>(
    await sb().from('slides').insert({ ...draft, outline: draft.outline ?? [], is_protected: false } as never).select().single(),
  )
  if (draft.is_protected && plainCode) {
    unwrap(await sb().rpc('set_slide_access_code', { p_slide_id: row.id, p_code: plainCode }))
    return unwrap(await sb().from('slides').select('*').eq('id', row.id).single())
  }
  return row
}

/**
 * Update a slide. `plainCode`: undefined = keep the current code, string = set a new one.
 * Turning protection off clears the code; turning it on requires a code.
 */
export async function updateSlide(id: string, patch: Partial<SlideDraft>, plainCode?: string | null): Promise<Slide> {
  const fields = omit(patch, 'is_protected')
  if (Object.keys(fields).length) unwrap(await sb().from('slides').update(fields as never).eq('id', id))
  if (patch.is_protected === false) unwrap(await sb().rpc('set_slide_access_code', { p_slide_id: id, p_code: null as never }))
  else if (plainCode) unwrap(await sb().rpc('set_slide_access_code', { p_slide_id: id, p_code: plainCode }))
  return unwrap(await sb().from('slides').select('*').eq('id', id).single())
}

/** Delete the row and its stored file (embed URLs have no file). */
export async function deleteSlide(id: string) {
  const row = unwrap<Pick<Slide, 'file_url'> | null>(await sb().from('slides').select('file_url').eq('id', id).maybeSingle())
  unwrap(await sb().from('slides').delete().eq('id', id))
  if (row && !/^https?:\/\//.test(row.file_url)) await sb().storage.from(STORAGE_BUCKETS.slides).remove([row.file_url])
}

/** Persist a new global order after drag-and-drop (one small update per row). */
export async function reorderSlides(ids: string[]) {
  const results = await Promise.all(ids.map((id, order_index) => sb().from('slides').update({ order_index }).eq('id', id)))
  results.forEach((r) => unwrap(r))
}

/**
 * Upload a slide file to the PRIVATE `slides` bucket with real progress
 * (supabase-js has no upload progress, so this talks to Storage REST via XHR
 * with the admin's session token). Returns the storage path saved in file_url.
 */
export async function uploadSlideFile(slug: string, file: File, onProgress?: (p: number) => void) {
  const { data } = await sb().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(-80)
  const path = `${slug}/${crypto.randomUUID()}-${safe}`
  const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKETS.slides}/${path}`

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('apikey', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '')
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`)))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
  onProgress?.(1)
  return { path, name: file.name }
}

/* ---------------------------------------------------------------- public */

export async function getPublicSlide(slug: string): Promise<PublicSlideMeta | null> {
  return unwrap(await sb().rpc('get_public_slide', { p_slug: slug }))
}

export type AccessResult = { ok: true; grant: SlideAccessGrant } | { ok: false; reason: 'wrong-code' | 'not-found' | 'rate-limit' }

const REASONS: Record<number, 'wrong-code' | 'not-found' | 'rate-limit'> = { 403: 'wrong-code', 404: 'not-found', 429: 'rate-limit' }

/** Verify the code (null for public decks) through the `slide-access` Edge Function. */
export async function verifySlideAccess(slug: string, code: string | null): Promise<AccessResult> {
  const { data, error, response } = await sb().functions.invoke<SlideAccessGrant>('slide-access', { body: { slug, code } })
  if (!error && data) return { ok: true, grant: data }
  const reason = response ? REASONS[response.status] : undefined
  if (reason) return { ok: false, reason }
  throw new Error(error?.message ?? 'Slide access failed')
}

/** Generate a 6-digit PIN using the CSPRNG (never Math.random for access codes). */
export function generatePin() {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000
  return String(n).padStart(6, '0')
}

/** Public share URL for a slide. */
export const shareUrl = (slug: string) => `${location.origin}/slides/${slug}`
