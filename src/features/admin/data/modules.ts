import { supabase, unwrap } from '@/lib/supabase'
import type { ContentModule, PublicModule, Slide } from '@/types/supabase'

/**
 * Content modules (table `slide_modules`): group many slides into a course,
 * client engagement or workshop series. Slide membership lives on
 * `slides.module_id`; order inside a module is `slides.order_index`.
 */

const sb = () => supabase()

export interface ModuleWithStats extends ContentModule {
  slide_count: number
  active_count: number
}

/** Modules with slide counts (one query each, counts computed client-side from the small slide index). */
export async function listModules(): Promise<ModuleWithStats[]> {
  const [mods, slides] = await Promise.all([
    sb().from('slide_modules').select('*').order('order_index'),
    sb().from('slides').select('module_id, is_active').not('module_id', 'is', null),
  ])
  const rows = unwrap<ContentModule[]>(mods)
  const index = unwrap<Pick<Slide, 'module_id' | 'is_active'>[]>(slides)
  return rows.map((m) => {
    const own = index.filter((s) => s.module_id === m.id)
    return { ...m, slide_count: own.length, active_count: own.filter((s) => s.is_active).length }
  })
}

export async function getModule(id: string): Promise<ContentModule | null> {
  return unwrap(await sb().from('slide_modules').select('*').eq('id', id).maybeSingle())
}

export type ModuleDraft = Omit<ContentModule, 'id' | 'created_at' | 'updated_at'>

export async function createModule(draft: ModuleDraft): Promise<ContentModule> {
  return unwrap(await sb().from('slide_modules').insert(draft).select().single())
}

export async function updateModule(id: string, patch: Partial<ModuleDraft>): Promise<ContentModule> {
  return unwrap(await sb().from('slide_modules').update(patch).eq('id', id).select().single())
}

/** Delete a module; its slides are kept and become unassigned (FK is ON DELETE SET NULL). */
export async function deleteModule(id: string) {
  unwrap(await sb().from('slide_modules').delete().eq('id', id))
}

export async function reorderModules(ids: string[]) {
  const results = await Promise.all(ids.map((id, order_index) => sb().from('slide_modules').update({ order_index }).eq('id', id)))
  results.forEach((r) => unwrap(r))
}

export async function listModuleSlides(moduleId: string): Promise<Slide[]> {
  return unwrap(await sb().from('slides').select('*').eq('module_id', moduleId).order('order_index'))
}

/** Slides that can be added to this module (unassigned or in another module). */
export async function listAssignableSlides(moduleId: string): Promise<Slide[]> {
  return unwrap(await sb().from('slides').select('*').or(`module_id.is.null,module_id.neq.${moduleId}`).order('title'))
}

/** Add slides to a module (moving them out of any other module), appended at the end; they adopt its category. */
export async function assignSlides(moduleId: string, slideIds: string[]) {
  const [mod, current] = await Promise.all([
    getModule(moduleId),
    sb().from('slides').select('order_index').eq('module_id', moduleId).order('order_index', { ascending: false }).limit(1),
  ])
  const tail = unwrap<{ order_index: number }[]>(current)[0]?.order_index ?? -1
  const results = await Promise.all(
    slideIds.map((id, i) =>
      sb().from('slides').update({ module_id: moduleId, order_index: tail + 1 + i, ...(mod ? { module_category: mod.category } : {}) }).eq('id', id),
    ),
  )
  results.forEach((r) => unwrap(r))
}

export async function unassignSlide(slideId: string): Promise<Slide> {
  return unwrap(await sb().from('slides').update({ module_id: null }).eq('id', slideId).select().single())
}

/**
 * Reorder slides inside one module without disturbing the global order: the
 * module's slides swap among the order_index values they already occupy.
 */
export async function reorderModuleSlides(moduleId: string, ids: string[]) {
  const rows = unwrap<{ order_index: number }[]>(await sb().from('slides').select('order_index').eq('module_id', moduleId))
  const slots = rows.map((r) => r.order_index).sort((a, b) => a - b)
  const results = await Promise.all(ids.map((id, i) => sb().from('slides').update({ order_index: slots[i] ?? i }).eq('id', id)))
  results.forEach((r) => unwrap(r))
}

/* ---------------------------------------------------------------- public */

export async function getPublicModule(slug: string): Promise<PublicModule | null> {
  return unwrap(await sb().rpc('get_public_module', { p_slug: slug }))
}
