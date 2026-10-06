import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type Announcements, type DragEndEvent, type Modifier, type UniqueIdentifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, Globe, GripVertical, Lock, Pencil, Share2, Trash2 } from 'lucide-react'
import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Slide } from '@/types/supabase'
import { ConfirmDelete } from '../../ui/ConfirmDelete'
import { FORMATS, MODULE_LABELS } from './shared'

interface RowActions {
  onToggleActive: (slide: Slide, active: boolean) => void
  onShare: (slide: Slide) => void
  onEdit: (slide: Slide) => void
  onDelete: (slide: Slide) => void
}

interface Props extends RowActions {
  slides: Slide[]
  /** Reordering only makes sense on the full, unfiltered list. */
  reorderable: boolean
  onReorder: (ids: string[]) => void
}

/** Lock dragging to the Y axis (avoids pulling in @dnd-kit/modifiers for one line). */
const restrictToVertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })

// Mobile rows wrap onto two lines (44px + 36px); desktop rows are a single 64px line.
const ROW = 'flex flex-wrap items-center gap-x-3 gap-y-2 px-2 py-2.5 sm:h-16 sm:flex-nowrap sm:py-0 sm:pr-3'

export function SlideList({ slides, reorderable, onReorder, ...actions }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const ids = useMemo(() => slides.map((s) => s.id), [slides])

  // Screen-reader announcements use titles + positions instead of raw ids.
  const announcements = useMemo<Announcements>(() => {
    const title = (id: UniqueIdentifier) => slides.find((s) => s.id === id)?.title ?? 'Slide'
    const pos = (id?: UniqueIdentifier) => (id === undefined ? 0 : ids.indexOf(String(id)) + 1)
    return {
      onDragStart: ({ active }) => `Picked up ${title(active.id)}. Position ${pos(active.id)} of ${ids.length}.`,
      onDragOver: ({ active, over }) => (over ? `${title(active.id)} moved to position ${pos(over.id)} of ${ids.length}.` : `${title(active.id)} is no longer over the list.`),
      onDragEnd: ({ active, over }) => (over ? `${title(active.id)} dropped at position ${pos(over.id)} of ${ids.length}.` : `${title(active.id)} dropped.`),
      onDragCancel: ({ active }) => `Reorder cancelled. ${title(active.id)} returned to position ${pos(active.id)}.`,
    }
  }, [slides, ids])

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    onReorder(arrayMove(ids, ids.indexOf(String(active.id)), ids.indexOf(String(over.id))))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[restrictToVertical]}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: 'To reorder, press Space or Enter on the handle, use the arrow keys to move, Space or Enter to drop, Escape to cancel.' },
      }}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy} disabled={!reorderable}>
        <ol className="divide-y overflow-hidden rounded-lg border bg-card" aria-label="Slides">
          {slides.map((slide, i) => (
            <SlideRow key={slide.id} slide={slide} index={i} reorderable={reorderable} {...actions} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function SlideRow({ slide, index, reorderable, onToggleActive, onShare, onEdit, onDelete }: RowActions & { slide: Slide; index: number; reorderable: boolean }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id, disabled: !reorderable })
  const fmt = FORMATS[slide.file_type]
  const FormatIcon = fmt.icon
  const badges = (
    <>
      <Badge variant="outline" className="font-normal">{MODULE_LABELS[slide.module_category]}</Badge>
      {slide.is_protected ? (
        <Badge variant="secondary" className="font-normal"><Lock aria-hidden />Protected</Badge>
      ) : (
        <Badge variant="ghost" className="font-normal text-muted-foreground"><Globe aria-hidden />Public</Badge>
      )}
    </>
  )

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(ROW, 'relative bg-card', isDragging && 'z-10 shadow-lg ring-1 ring-ring/40', !slide.is_active && 'text-muted-foreground')}
    >
      {reorderable ? (
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Reorder ${slide.title}`}
          className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        >
          <GripVertical className="size-4" aria-hidden />
        </button>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-disabled="true"
              aria-label={`Reorder ${slide.title} (unavailable while filtered)`}
              className="grid size-11 shrink-0 cursor-not-allowed place-items-center rounded-md text-muted-foreground/50 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <GripVertical className="size-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent>Clear all filters to reorder (or reorder inside a module)</TooltipContent>
        </Tooltip>
      )}

      <span className="w-5 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="grid size-9 shrink-0 place-items-center rounded-md border bg-muted/40" title={fmt.long}>
        <FormatIcon className="size-4" aria-hidden />
        <span className="sr-only">{fmt.long}</span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-foreground">{slide.title}</p>
        <p className="truncate font-mono text-xs text-muted-foreground">
          <span className="mr-1.5 font-semibold">{fmt.short}</span>/{slide.slug}
        </p>
      </div>

      <div className="hidden shrink-0 items-center gap-1.5 lg:flex">{badges}</div>

      <Switch
        checked={slide.is_active}
        onCheckedChange={(v) => onToggleActive(slide, v)}
        aria-label={`${slide.is_active ? 'Deactivate' : 'Activate'} ${slide.title}`}
        className="shrink-0 sm:order-last"
      />

      {/* Second line on mobile: badges + actions; inline on desktop. */}
      <div className="flex w-full flex-wrap items-center justify-between gap-2 pl-14 sm:w-auto sm:flex-nowrap sm:pl-0">
        <div className="flex min-w-0 flex-wrap items-center gap-1.5 lg:hidden">{badges}</div>
        <div className="ml-auto flex shrink-0 items-center">
          <Button variant="ghost" size="icon-lg" aria-label={`Share ${slide.title}`} onClick={() => onShare(slide)}>
            <Share2 aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-lg" aria-label={`Edit ${slide.title}`} onClick={() => onEdit(slide)}>
            <Pencil aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-lg" asChild>
            <a href={`/slides/${slide.slug}`} target="_blank" rel="noopener noreferrer" aria-label={`Preview ${slide.title} (opens in new tab)`}>
              <ExternalLink aria-hidden />
            </a>
          </Button>
          <ConfirmDelete
            title={`Delete “${slide.title}”?`}
            description="The slide, its file and its share link will stop working. This cannot be undone."
            onConfirm={() => onDelete(slide)}
          >
            <Button variant="ghost" size="icon-lg" aria-label={`Delete ${slide.title}`} className="text-muted-foreground hover:text-destructive">
              <Trash2 aria-hidden />
            </Button>
          </ConfirmDelete>
        </div>
      </div>
    </li>
  )
}

/** Placeholder rows with the same box model as SlideRow (no layout shift on swap). */
export function SlideListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <ol className="divide-y overflow-hidden rounded-lg border bg-card" aria-busy="true" aria-label="Loading slides">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={ROW}>
          <Skeleton className="size-11 rounded-md" />
          <Skeleton className="h-3 w-5" />
          <Skeleton className="size-9 rounded-md" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-48 max-w-full" />
            <Skeleton className="h-3 w-32 max-w-full" />
          </div>
          <Skeleton className="h-[18px] w-8 rounded-full sm:order-last" />
          <div className="flex w-full flex-wrap items-center justify-between gap-2 pl-14 sm:w-auto sm:flex-nowrap sm:justify-end sm:pl-0">
            {/* Mirrors the wrapped badge line real rows have on mobile, so rows don't grow on load. */}
            <Skeleton className="h-5 w-40 lg:hidden" />
            <Skeleton className="ml-auto h-9 w-40" />
          </div>
        </li>
      ))}
    </ol>
  )
}
