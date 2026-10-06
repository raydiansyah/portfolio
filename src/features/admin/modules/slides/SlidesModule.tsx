import { Presentation, Upload } from 'lucide-react'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useLocation, useSearch } from 'wouter'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import type { Slide } from '@/types/supabase'
import { listModules } from '../../data/modules'
import { deleteSlide, listAccessLogs, listSlides, reorderSlides, updateSlide } from '../../data/slides'
import { EmptyState } from '../../ui/EmptyState'
import { PageHeader } from '../../ui/PageHeader'
import { useResource } from '../../ui/useResource'
import { ShareDialog } from './ShareDialog'
import { SlideList, SlideListSkeleton } from './SlideList'
import { SlideSheet } from './SlideSheet'
import { FILE_TYPES, FORMATS, MODULES, MODULE_LABELS, type FormatFilter, type ModuleFilter } from './shared'

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** Access logs from the last 7 days (computed in the loader, not during render). */
async function loadWeeklyViews() {
  const logs = await listAccessLogs(1000)
  const since = Date.now() - WEEK_MS
  return logs.filter((l) => Date.parse(l.accessed_at) >= since).length
}

export default function SlidesModule() {
  const search = useSearch()
  const [, navigate] = useLocation()
  const { data, error, reload, setData } = useResource(listSlides)
  const weekly = useResource(loadWeeklyViews)
  const contentModules = useResource(listModules)
  /** 'all' | 'none' (unassigned) | module id */
  const [contentFilter, setContentFilter] = useState('all')
  const [moduleFilter, setModuleFilter] = useState<ModuleFilter>('all')
  const [format, setFormat] = useState<FormatFilter>('all')
  const [editing, setEditing] = useState<Slide | null>(null)
  const [creating, setCreating] = useState(false)
  const [share, setShare] = useState<Slide | null>(null)

  // `?new=1` (e.g. from the dashboard quick action) opens the create sheet.
  const params = new URLSearchParams(search)
  const newFromUrl = params.get('new') === '1'
  const moduleFromUrl = params.get('module')
  const sheetOpen = creating || newFromUrl || editing !== null

  const closeSheet = () => {
    setCreating(false)
    setEditing(null)
    if (newFromUrl) navigate('/slides', { replace: true })
  }

  const slides = useMemo(() => data ?? [], [data])
  const byFormat = (s: Slide) => format === 'all' || s.file_type === format
  const byModule = (s: Slide) => moduleFilter === 'all' || s.module_category === moduleFilter
  const byContent = (s: Slide) => contentFilter === 'all' || (contentFilter === 'none' ? !s.module_id : s.module_id === contentFilter)
  const visible = slides.filter((s) => byFormat(s) && byModule(s) && byContent(s))
  // Faceted counts: each filter's counts respect the *other* filter.
  const moduleCount = (m: ModuleFilter) => slides.filter((s) => byFormat(s) && (m === 'all' || s.module_category === m)).length
  const formatCount = (f: FormatFilter) => slides.filter((s) => byModule(s) && (f === 'all' || s.file_type === f)).length
  const reorderable = moduleFilter === 'all' && format === 'all' && contentFilter === 'all'
  const activeCount = slides.filter((s) => s.is_active).length

  const patchLocal = (row: Slide) => setData((prev) => prev?.map((s) => (s.id === row.id ? row : s)) ?? prev)

  const onReorder = async (ids: string[]) => {
    const prev = data
    const byId = new Map(slides.map((s) => [s.id, s]))
    setData(ids.map((id, i) => ({ ...byId.get(id)!, order_index: i })))
    try {
      await reorderSlides(ids)
      toast.success('Order saved')
    } catch {
      setData(prev)
      toast.error('Could not save the new order.')
    }
  }

  const onToggleActive = async (slide: Slide, is_active: boolean) => {
    patchLocal({ ...slide, is_active })
    try {
      patchLocal(await updateSlide(slide.id, { is_active }))
      toast.success(`${slide.title} is now ${is_active ? 'active' : 'inactive'}`)
    } catch {
      patchLocal(slide)
      toast.error('Could not update the slide.')
    }
  }

  const onDelete = async (slide: Slide) => {
    try {
      await deleteSlide(slide.id)
      setData((prev) => prev?.filter((s) => s.id !== slide.id) ?? prev)
      toast.success(`Deleted “${slide.title}”`)
    } catch {
      toast.error('Could not delete the slide.')
    }
  }

  const onSaved = (saved: Slide) => {
    const wasNew = !editing
    closeSheet()
    reload()
    weekly.reload()
    if (wasNew) setShare(saved)
  }

  const openCreate = () => {
    setEditing(null)
    setCreating(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Content"
        title="Slides"
        description="Lecture decks, client presentations and workshop material — shared by link, optionally locked with a code."
        actions={
          <Button size="lg" onClick={openCreate}>
            <Upload aria-hidden />
            Upload slide
          </Button>
        }
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <label htmlFor="slides-content-module" className="hud-label shrink-0 text-muted-foreground">Content module</label>
          <Select value={contentFilter} onValueChange={setContentFilter}>
            <SelectTrigger id="slides-content-module" className="h-9 w-full max-w-72"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modules ({slides.length})</SelectItem>
              <SelectItem value="none">No module ({slides.filter((s) => !s.module_id).length})</SelectItem>
              {(contentModules.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>{m.title} ({slides.filter((s) => s.module_id === m.id).length})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div role="group" aria-label="Filter by category" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(['all', ...MODULES] as ModuleFilter[]).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={moduleFilter === m}
              onClick={() => setModuleFilter(m)}
              className={cn(
                'inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                moduleFilter === m ? 'border-foreground bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {m === 'all' ? 'Semua' : MODULE_LABELS[m]}
              <span className="font-mono text-xs tabular-nums opacity-70">{data ? moduleCount(m) : '–'}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <ToggleGroup
            type="single"
            variant="outline"
            spacing={0}
            value={format}
            onValueChange={(v) => v && setFormat(v as FormatFilter)}
            aria-label="Filter by format"
            className="max-w-full overflow-x-auto"
          >
            {(['all', ...FILE_TYPES] as FormatFilter[]).map((f) => (
              <ToggleGroupItem key={f} value={f} className="gap-1.5 px-3">
                <span className={f === 'all' ? undefined : 'hidden sm:inline'}>{f === 'all' ? 'Semua' : FORMATS[f].long}</span>
                {f !== 'all' && <span className="sm:hidden">{FORMATS[f].short}</span>}
                <span className="font-mono text-xs tabular-nums text-muted-foreground">{data ? formatCount(f) : '–'}</span>
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <p className="hud-label text-muted-foreground" aria-live="polite">
            {data ? `${activeCount} of ${slides.length} active` : 'Loading…'}
            <span aria-hidden> · </span>
            {weekly.data !== null ? `${weekly.data} views in 7 days` : '— views in 7 days'}
          </p>
        </div>
      </div>

      {error ? (
        <EmptyState
          icon={Presentation}
          title="Slides could not be loaded"
          description={error.message}
          action={<Button variant="outline" onClick={reload}>Try again</Button>}
        />
      ) : !data ? (
        <SlideListSkeleton />
      ) : slides.length === 0 ? (
        <EmptyState
          icon={Presentation}
          title="No slides yet"
          description="Upload a self-contained HTML deck or a PDF to get a shareable link."
          action={<Button onClick={openCreate}><Upload aria-hidden />Upload slide</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={Presentation}
          title="Nothing matches these filters"
          action={<Button variant="outline" onClick={() => { setModuleFilter('all'); setFormat('all') }}>Clear filters</Button>}
        />
      ) : (
        <SlideList
          slides={visible}
          reorderable={reorderable}
          onReorder={(ids) => void onReorder(ids)}
          onToggleActive={(s, v) => void onToggleActive(s, v)}
          onShare={setShare}
          onEdit={(s) => setEditing(s)}
          onDelete={(s) => void onDelete(s)}
        />
      )}

      <SlideSheet
        // With ?module=, wait for the module list so the form can preselect it on first render.
        open={sheetOpen && (!moduleFromUrl || contentModules.data !== null)}
        slide={editing}
        takenSlugs={slides.map((s) => s.slug)}
        nextOrder={slides.length}
        modules={contentModules.data ?? []}
        defaultModuleId={editing ? null : moduleFromUrl}
        onOpenChange={(o) => !o && closeSheet()}
        onSaved={onSaved}
      />
      <ShareDialog slide={share} onClose={() => setShare(null)} />
    </div>
  )
}
