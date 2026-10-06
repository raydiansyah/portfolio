import { ArrowLeft, Copy, ExternalLink, Pencil, Plus, Presentation, Upload } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Link, useLocation } from 'wouter'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Slide } from '@/types/supabase'
import { assignSlides, listAssignableSlides, listModuleSlides, reorderModuleSlides, unassignSlide, type ModuleWithStats } from '../../data/modules'
import { EmptyState } from '../../ui/EmptyState'
import { useResource } from '../../ui/useResource'
import { MODULE_LABELS, copyText } from '../slides/shared'
import { AddSlidesDialog } from './AddSlidesDialog'
import { ModuleSlideList, ModuleSlideListSkeleton } from './ModuleSlideList'

const moduleUrl = (slug: string) => `${location.origin}/slides/m/${slug}`

interface Props {
  module: ModuleWithStats
  moduleTitles: Record<string, string>
  onEdit: () => void
  /** Slide membership changed: refresh counts in the parent. */
  onChanged: () => void
}

export function ModuleDetail({ module, moduleTitles, onEdit, onChanged }: Props) {
  const [, navigate] = useLocation()
  const { data, error, setData, reload } = useResource(() => listModuleSlides(module.id))
  const [adding, setAdding] = useState(false)
  const [candidates, setCandidates] = useState<Slide[] | null>(null)

  const openAdd = async () => {
    setCandidates(null)
    setAdding(true)
    setCandidates(await listAssignableSlides(module.id))
  }

  const onAdd = async (ids: string[]) => {
    try {
      await assignSlides(module.id, ids)
      toast.success(`${ids.length} ${ids.length === 1 ? 'slide' : 'slides'} added`)
      setAdding(false)
      reload()
      onChanged()
    } catch {
      toast.error('Could not add slides.')
    }
  }

  const onReorder = async (ids: string[]) => {
    const prev = data
    const byId = new Map((data ?? []).map((s) => [s.id, s]))
    setData(ids.map((id) => byId.get(id)!))
    try {
      await reorderModuleSlides(module.id, ids)
      toast.success('Order saved')
    } catch {
      setData(prev)
      toast.error('Could not save the new order.')
    }
  }

  const onRemove = async (slide: Slide) => {
    const prev = data
    setData((d) => d?.filter((s) => s.id !== slide.id) ?? d)
    try {
      await unassignSlide(slide.id)
      onChanged()
      toast.success(`${slide.title} removed from ${module.title}`, {
        action: { label: 'Undo', onClick: () => void assignSlides(module.id, [slide.id]).then(() => (reload(), onChanged())) },
      })
    } catch {
      setData(prev)
      toast.error('Could not remove the slide.')
    }
  }

  const copyLink = async () => {
    if (await copyText(moduleUrl(module.slug))) toast.success('Module link copied')
    else toast.error('Clipboard unavailable.')
  }

  const slides = data ?? []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/modules" className="hud-label inline-flex min-h-10 items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" aria-hidden /> All modules
        </Link>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="font-normal">{MODULE_LABELS[module.category]}</Badge>
              <Badge variant={module.is_published ? 'secondary' : 'outline'} className="font-normal">{module.is_published ? 'Published' : 'Draft'}</Badge>
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{module.title}</h1>
            {module.description && <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{module.description}</p>}
            <p className="mt-2 font-mono text-xs text-muted-foreground">/slides/m/{module.slug}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={copyLink}><Copy aria-hidden />Copy link</Button>
            <Button variant="outline" asChild>
              <a href={`/slides/m/${module.slug}`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden />Preview</a>
            </Button>
            <Button variant="outline" onClick={onEdit}><Pencil aria-hidden />Edit</Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="hud-label text-muted-foreground">
          Slides in order · {slides.length}
        </h2>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/slides?new=1&module=${module.id}`)}>
            <Upload aria-hidden />Upload new
          </Button>
          <Button onClick={openAdd}><Plus aria-hidden />Add existing</Button>
        </div>
      </div>

      {error && <p role="alert" className="text-sm text-destructive">Could not load slides. <button className="underline" onClick={reload}>Retry</button></p>}
      {!data && !error && <ModuleSlideListSkeleton rows={Math.max(1, Math.min(module.slide_count, 6))} />}
      {data && slides.length === 0 && (
        <EmptyState
          icon={Presentation}
          title="No slides in this module yet"
          description="Add existing decks or upload a new one. Visitors see them in this order."
          action={<Button onClick={openAdd}><Plus aria-hidden />Add slides</Button>}
        />
      )}
      {slides.length > 0 && <ModuleSlideList slides={slides} onReorder={onReorder} onRemove={onRemove} />}
      {slides.length > 1 && <p className="text-xs text-muted-foreground">Drag the handle, or focus it and press Space then ↑/↓, to change the order.</p>}

      <AddSlidesDialog open={adding} onOpenChange={setAdding} candidates={candidates} moduleTitles={moduleTitles} onAdd={onAdd} />
    </div>
  )
}
