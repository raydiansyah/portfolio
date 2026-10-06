import { supabase, unwrap } from '@/lib/supabase'
import type { Database } from '@/types/database.gen'
import type { ContentModule, PublicSlideMeta, Slide, SlideAccessGrant, SlideAccessLog, SlideOutlineItem } from '@/types/supabase'

/**
 * Slide repository shared by the admin Slide Manager and the public portal.
 *
 * Storage model (shared with raydiansyah.com, which reads the same tables):
 *   material          → ContentModule (access code + expiry live here)
 *   slide_presentasi  → Slide
 *   files             → Cloudflare R2, uploaded through the presign Worker
 *                       (VITE_R2_UPLOAD_ENDPOINT), served from VITE_R2_PUBLIC_BASE_URL.
 *
 * The public never reads these tables directly: `get_public_slide` returns safe
 * metadata, the `slide-access` Edge Function checks the module code, rate-limits
 * per client IP, logs the access and returns the slide with its file key.
 */

type SlideRow = Database['public']['Tables']['slide_presentasi']['Row']
type MaterialRow = Database['public']['Tables']['material']['Row']

const sb = () => supabase()

/* --------------------------------------------------------------- mapping */

export const SLIDE_COLUMNS = '*, material:material_id (akses_kode, kategori)'

type SlideWithMaterial = SlideRow & { material: Pick<MaterialRow, 'akses_kode' | 'kategori'> | null }

export function toSlide(r: SlideWithMaterial): Slide {
  return {
    id: r.id,
    module_id: r.material_id,
    slug: r.slug,
    title: r.judul,
    description: r.deskripsi,
    presenter: r.presenter,
    file_type: r.mime_type === 'application/pdf' ? 'pdf' : 'html',
    file_url: r.storage_path,
    page_count: r.jumlah_halaman,
    outline: (Array.isArray(r.outline) ? r.outline : []) as unknown as SlideOutlineItem[],
    is_protected: Boolean(r.material?.akses_kode),
    module_category: r.material?.kategori ?? 'materi_kuliah',
    order_index: r.urutan,
    allow_download: r.izinkan_unduh,
    is_active: r.status_tampil,
    created_at: r.dibuat_pada,
    updated_at: r.dibuat_pada,
  }
}

export function toModule(r: MaterialRow): ContentModule {
  return {
    id: r.id,
    slug: r.slug,
    title: r.judul,
    description: r.deskripsi || null,
    category: r.kategori,
    cover_url: r.cover_url,
    is_published: r.status_tampil,
    order_index: r.urutan,
    access_code: r.akses_kode,
    access_expires_at: r.akses_berakhir_pada,
    created_at: r.dibuat_pada,
    updated_at: r.diperbarui_pada,
  }
}

/** Editable slide fields. Access and category come from the module. */
export type SlideDraft = Pick<
  Slide,
  'slug' | 'title' | 'description' | 'presenter' | 'file_type' | 'file_url' | 'order_index' | 'allow_download' | 'is_active'
> & { outline?: SlideOutlineItem[]; module_id?: string | null }

const MIME = { html: 'text/html', pdf: 'application/pdf' } as const

function toRow(d: Partial<SlideDraft>): Database['public']['Tables']['slide_presentasi']['Update'] {
  const row: Database['public']['Tables']['slide_presentasi']['Update'] = {}
  if (d.slug !== undefined) row.slug = d.slug
  if (d.title !== undefined) row.judul = d.title
  if (d.description !== undefined) row.deskripsi = d.description
  if (d.presenter !== undefined) row.presenter = d.presenter
  if (d.file_type !== undefined) row.mime_type = MIME[d.file_type as keyof typeof MIME] ?? MIME.html
  if (d.file_url !== undefined) row.storage_path = d.file_url
  if (d.order_index !== undefined) row.urutan = d.order_index
  if (d.allow_download !== undefined) row.izinkan_unduh = d.allow_download
  if (d.is_active !== undefined) row.status_tampil = d.is_active
  if (d.outline !== undefined) row.outline = d.outline as unknown as Database['public']['Tables']['slide_presentasi']['Row']['outline']
  if (d.module_id !== undefined) row.material_id = d.module_id
  return row
}

/* ----------------------------------------------------------------- admin */

export async function listSlides(): Promise<Slide[]> {
  const rows = unwrap<SlideWithMaterial[]>(await sb().from('slide_presentasi').select(SLIDE_COLUMNS).order('urutan').order('dibuat_pada'))
  return rows.map(toSlide)
}

export async function getSlide(id: string): Promise<Slide> {
  return toSlide(unwrap<SlideWithMaterial>(await sb().from('slide_presentasi').select(SLIDE_COLUMNS).eq('id', id).single()))
}

export async function listAccessLogs(limit = 50): Promise<SlideAccessLog[]> {
  return unwrap(await sb().from('slide_access_logs').select('*').order('accessed_at', { ascending: false }).limit(limit))
}

export async function countAccessLogs(): Promise<number> {
  const { count, error } = await sb().from('slide_access_logs').select('*', { count: 'exact', head: true })
  if (error) throw new Error(error.message)
  return count ?? 0
}

export async function createSlide(draft: SlideDraft): Promise<Slide> {
  const { data } = await sb().auth.getUser()
  if (!data.user) throw new Error('Not signed in')
  const row = { ...toRow(draft), created_by: data.user.id } as Database['public']['Tables']['slide_presentasi']['Insert']
  const created = unwrap<{ id: string }>(await sb().from('slide_presentasi').insert(row).select('id').single())
  return getSlide(created.id)
}

export async function updateSlide(id: string, patch: Partial<SlideDraft>): Promise<Slide> {
  const row = toRow(patch)
  if (Object.keys(row).length) unwrap(await sb().from('slide_presentasi').update(row).eq('id', id))
  return getSlide(id)
}

/** Delete the row. The R2 object stays (the Worker has no delete; re-uploading the slug overwrites it). */
export async function deleteSlide(id: string) {
  unwrap(await sb().from('slide_presentasi').delete().eq('id', id))
}

/** Persist a new global order after drag-and-drop (one small update per row). */
export async function reorderSlides(ids: string[]) {
  const results = await Promise.all(ids.map((id, urutan) => sb().from('slide_presentasi').update({ urutan }).eq('id', id)))
  results.forEach((r) => unwrap(r))
}

/**
 * Upload a slide file to R2: the Worker checks the admin session and returns a
 * short-lived presigned PUT URL plus the object key (`slides/{slug}.{ext}`),
 * then the file goes straight to R2 via XHR for real progress.
 */
export async function uploadSlideFile(slug: string, file: File, onProgress?: (p: number) => void) {
  const endpoint = import.meta.env.VITE_R2_UPLOAD_ENDPOINT
  if (!endpoint) throw new Error('VITE_R2_UPLOAD_ENDPOINT is not set')
  const { data } = await sb().auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Not signed in')

  const presign = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ filename: file.name, contentType: file.type, slug }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!presign.ok) throw new Error(`Upload could not be prepared (${presign.status})`)
  const { url, key } = (await presign.json()) as { url: string; key: string }

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.timeout = 120_000
    xhr.setRequestHeader('Content-Type', file.type)
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total)
    xhr.onload = () => (xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`)))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.ontimeout = () => reject(new Error('Upload timed out'))
    xhr.send(file)
  })
  onProgress?.(1)
  return { path: key, name: file.name }
}

/** Public URL of an R2 object key. */
export function fileUrl(key: string) {
  const base = (import.meta.env.VITE_R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '')
  return /^https?:\/\//.test(key) ? key : `${base}/${key.replace(/^\//, '')}`
}

/* ---------------------------------------------------------------- public */

export async function getPublicSlide(slug: string): Promise<PublicSlideMeta | null> {
  return unwrap(await sb().rpc('get_public_slide', { p_slug: slug }))
}

export type AccessReason = 'wrong-code' | 'not-found' | 'rate-limit' | 'expired'
export type AccessResult = { ok: true; grant: SlideAccessGrant } | { ok: false; reason: AccessReason }

const REASONS: Record<number, AccessReason> = { 403: 'wrong-code', 404: 'not-found', 410: 'expired', 429: 'rate-limit' }

/** Verify the module code (null for open decks) through the `slide-access` Edge Function. */
export async function verifySlideAccess(slug: string, code: string | null): Promise<AccessResult> {
  const { data, error, response } = await sb().functions.invoke<{ slide: Slide }>('slide-access', { body: { slug, code } })
  if (!error && data) return { ok: true, grant: { slide: data.slide, signed_url: fileUrl(data.slide.file_url), expires_in: 60 * 60 } }
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
