import { supabase, unwrap } from '@/lib/supabase'
import type { Database } from '@/types/database.gen'
import type { ContentModule, PublicModule, Slide } from '@/types/supabase'
import { SLIDE_COLUMNS, toModule, toSlide } from './slides'

/**
 * Content modules (table `material`): group many slides into a course, client
 * engagement or workshop series. Membership lives on `slide_presentasi.material_id`;
 * order inside a module is `slide_presentasi.urutan`. The module's access code
 * and expiry protect all of its slides.
 */

type MaterialUpdate = Database['public']['Tables']['material']['Update']

const sb = () => supabase()

export interface ModuleWithStats extends ContentModule {
  slide_count: number
  active_count: number
}

/** Modules with slide counts (counts computed client-side from the small slide index). */
export async function listModules(): Promise<ModuleWithStats[]> {
  const [mods, slides] = await Promise.all([
    sb().from('material').select('*').order('urutan').order('dibuat_pada'),
    sb().from('slide_presentasi').select('material_id, status_tampil').not('material_id', 'is', null),
  ])
  const rows = unwrap<Database['public']['Tables']['material']['Row'][]>(mods).map(toModule)
  const index = unwrap<{ material_id: string | null; status_tampil: boolean }[]>(slides)
  return rows.map((m) => {
    const own = index.filter((s) => s.material_id === m.id)
    return { ...m, slide_count: own.length, active_count: own.filter((s) => s.status_tampil).length }
  })
}

export async function getModule(id: string): Promise<ContentModule | null> {
  const row = unwrap<Database['public']['Tables']['material']['Row'] | null>(await sb().from('material').select('*').eq('id', id).maybeSingle())
  return row && toModule(row)
}

export type ModuleDraft = Omit<ContentModule, 'id' | 'created_at' | 'updated_at'>

function toRow(d: Partial<ModuleDraft>): MaterialUpdate {
  const row: MaterialUpdate = {}
  if (d.slug !== undefined) row.slug = d.slug
  if (d.title !== undefined) row.judul = d.title
  if (d.description !== undefined) row.deskripsi = d.description ?? ''
  if (d.category !== undefined) row.kategori = d.category
  if (d.cover_url !== undefined) row.cover_url = d.cover_url
  if (d.is_published !== undefined) row.status_tampil = d.is_published
  if (d.order_index !== undefined) row.urutan = d.order_index
  if (d.access_code !== undefined) row.akses_kode = d.access_code
  if (d.access_expires_at !== undefined) row.akses_berakhir_pada = d.access_expires_at
  return row
}

export async function createModule(draft: ModuleDraft): Promise<ContentModule> {
  const { data } = await sb().auth.getUser()
  if (!data.user) throw new Error('Not signed in')
  const row = { ...toRow(draft), created_by: data.user.id } as Database['public']['Tables']['material']['Insert']
  return toModule(unwrap(await sb().from('material').insert(row).select().single()))
}

export async function updateModule(id: string, patch: Partial<ModuleDraft>): Promise<ContentModule> {
  return toModule(unwrap(await sb().from('material').update(toRow(patch)).eq('id', id).select().single()))
}

/** Delete a module; its slides are kept and become unassigned (FK is ON DELETE SET NULL). */
export async function deleteModule(id: string) {
  unwrap(await sb().from('material').delete().eq('id', id))
}

export async function reorderModules(ids: string[]) {
  const results = await Promise.all(ids.map((id, urutan) => sb().from('material').update({ urutan }).eq('id', id)))
  results.forEach((r) => unwrap(r))
}

type SlideWithMaterial = Parameters<typeof toSlide>[0]

export async function listModuleSlides(moduleId: string): Promise<Slide[]> {
  const rows = unwrap<SlideWithMaterial[]>(
    await sb().from('slide_presentasi').select(SLIDE_COLUMNS).eq('material_id', moduleId).order('urutan').order('dibuat_pada'),
  )
  return rows.map(toSlide)
}

/** Slides that can be added to this module (unassigned or in another module). */
export async function listAssignableSlides(moduleId: string): Promise<Slide[]> {
  const rows = unwrap<SlideWithMaterial[]>(
    await sb().from('slide_presentasi').select(SLIDE_COLUMNS).or(`material_id.is.null,material_id.neq.${moduleId}`).order('judul'),
  )
  return rows.map(toSlide)
}

/** Add slides to a module (moving them out of any other module), appended at the end. */
export async function assignSlides(moduleId: string, slideIds: string[]) {
  const current = await sb().from('slide_presentasi').select('urutan').eq('material_id', moduleId).order('urutan', { ascending: false }).limit(1)
  const tail = unwrap<{ urutan: number }[]>(current)[0]?.urutan ?? -1
  const results = await Promise.all(
    slideIds.map((id, i) => sb().from('slide_presentasi').update({ material_id: moduleId, urutan: tail + 1 + i }).eq('id', id)),
  )
  results.forEach((r) => unwrap(r))
}

export async function unassignSlide(slideId: string): Promise<Slide> {
  unwrap(await sb().from('slide_presentasi').update({ material_id: null }).eq('id', slideId))
  const row = unwrap<SlideWithMaterial>(await sb().from('slide_presentasi').select(SLIDE_COLUMNS).eq('id', slideId).single())
  return toSlide(row)
}

/** Reorder slides inside one module: positions 0..n-1 (urutan is per module). */
export async function reorderModuleSlides(_moduleId: string, ids: string[]) {
  const results = await Promise.all(ids.map((id, urutan) => sb().from('slide_presentasi').update({ urutan }).eq('id', id)))
  results.forEach((r) => unwrap(r))
}

/* ---------------------------------------------------------------- public */

export async function getPublicModule(slug: string): Promise<PublicModule | null> {
  return unwrap(await sb().rpc('get_public_module', { p_slug: slug }))
}
