import type { ContentModule, PublicModule, Slide } from '@/types/supabase'
import { MockTable, delay, now, uuid } from './table'
import { SEED_MODULES } from './seed'
import { slides } from './slides'

/**
 * Content modules (table `slide_modules`): group many slides into a course,
 * client engagement or workshop series. Slide membership lives on
 * `slides.module_id`; order inside a module is `slides.order_index`.
 */

const modules = new MockTable<ContentModule>('slide_modules', SEED_MODULES)

export interface ModuleWithStats extends ContentModule {
  slide_count: number
  active_count: number
}

/**
 * SUPABASE (one round trip with an embedded count):
 *   sb.from('slide_modules').select('*, slides(count)').order('order_index')
 *   + sb.from('slides').select('module_id').eq('is_active', true) for active counts
 */
export async function listModules(): Promise<ModuleWithStats[]> {
  const all = slides.all()
  return delay(
    modules.all()
      .sort((a, b) => a.order_index - b.order_index)
      .map((m) => {
        const own = all.filter((s) => s.module_id === m.id)
        return { ...m, slide_count: own.length, active_count: own.filter((s) => s.is_active).length }
      }),
  )
}

/** SUPABASE: sb.from('slide_modules').select('*').eq('id', id).single() */
export const getModule = (id: string) => delay(modules.get(id))

export type ModuleDraft = Omit<ContentModule, 'id' | 'created_at' | 'updated_at'>

/** SUPABASE: sb.from('slide_modules').insert(draft).select().single() */
export const createModule = (draft: ModuleDraft) =>
  delay(modules.insert({ ...draft, id: uuid(), created_at: now(), updated_at: now() }))

/** SUPABASE: sb.from('slide_modules').update(patch).eq('id', id).select().single() */
export const updateModule = (id: string, patch: Partial<ModuleDraft>) => delay(modules.update(id, { ...patch, updated_at: now() }))

/**
 * Delete a module. Its slides are kept and become unassigned (FK is ON DELETE SET NULL).
 * SUPABASE: sb.from('slide_modules').delete().eq('id', id)
 */
export async function deleteModule(id: string) {
  for (const s of slides.all().filter((r) => r.module_id === id)) slides.update(s.id, { module_id: null })
  modules.remove(id)
  return delay(undefined)
}

/** SUPABASE: sb.from('slide_modules').upsert(ids.map((id, order_index) => ({ id, order_index })), { onConflict: 'id' }) */
export async function reorderModules(ids: string[]) {
  ids.forEach((id, i) => modules.update(id, { order_index: i }))
  return delay(undefined, 150)
}

/** SUPABASE: sb.from('slides').select('*').eq('module_id', moduleId).order('order_index') */
export const listModuleSlides = (moduleId: string) =>
  delay(slides.all().filter((s) => s.module_id === moduleId).sort((a, b) => a.order_index - b.order_index))

/** SUPABASE: sb.from('slides').select('id, slug, title, file_type, module_id').is('module_id', null) — or all for "move from" */
export const listAssignableSlides = (moduleId: string) =>
  delay(slides.all().filter((s) => s.module_id !== moduleId).sort((a, b) => a.title.localeCompare(b.title)))

/**
 * Add slides to a module (moving them out of any other module), appended at the end.
 * SUPABASE: sb.from('slides').update({ module_id }).in('id', slideIds)
 */
export async function assignSlides(moduleId: string, slideIds: string[]) {
  const mod = modules.get(moduleId)
  const tail = Math.max(-1, ...slides.all().filter((s) => s.module_id === moduleId).map((s) => s.order_index))
  slideIds.forEach((id, i) =>
    slides.update(id, { module_id: moduleId, order_index: tail + 1 + i, ...(mod ? { module_category: mod.category } : {}) }),
  )
  return delay(undefined)
}

/** SUPABASE: sb.from('slides').update({ module_id: null }).eq('id', slideId) */
export const unassignSlide = (slideId: string) => delay(slides.update(slideId, { module_id: null }))

/**
 * Reorder slides inside one module without disturbing the global order: the
 * module's slides swap among the order_index values they already occupy.
 * SUPABASE: sb.from('slides').upsert(pairs, { onConflict: 'id' }) with the computed pairs.
 */
export async function reorderModuleSlides(moduleId: string, ids: string[]) {
  const slots = slides.all().filter((s) => s.module_id === moduleId).map((s) => s.order_index).sort((a, b) => a - b)
  ids.forEach((id, i) => slides.update(id, { order_index: slots[i] ?? i }))
  return delay(undefined, 150)
}

/* ---------------------------------------------------------------- public */

/** SUPABASE: sb.rpc('get_public_module', { p_slug: slug }) */
export async function getPublicModule(slug: string): Promise<PublicModule | null> {
  const m = modules.find((r) => r.slug === slug && r.is_published)
  if (!m) return delay(null)
  const list = slides.all()
    .filter((s: Slide) => s.module_id === m.id && s.is_active)
    .sort((a, b) => a.order_index - b.order_index)
    .map(({ slug, title, description, presenter, file_type, is_protected, module_category, order_index, page_count }) => ({
      slug, title, description, presenter, file_type, is_protected, module_category, order_index, page_count,
    }))
  const { title, description, category, cover_url } = m
  return delay({ module: { slug: m.slug, title, description, category, cover_url }, slides: list })
}
