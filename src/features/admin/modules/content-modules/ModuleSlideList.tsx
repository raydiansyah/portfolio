import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors, type DragEndEvent, type Modifier,
} from '@dnd-kit/core'
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ExternalLink, GripVertical, Lock, MinusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import type { Slide } from '@/types/supabase'
import { FORMATS } from '../slides/shared'

// Vertical-only dragging without pulling in @dnd-kit/modifiers.
const vertical: Modifier = ({ transform }) => ({ ...transform, x: 0 })

const ROW = 'flex h-16 items-center gap-3 bg-card px-2 pr-3'

interface Props {
  slides: Slide[]
  onReorder: (ids: string[]) => void
  onRemove: (slide: Slide) => void
}

/** Ordered decks of one module; drag (or Space + arrows) to reorder. */
export function ModuleSlideList({ slides, onReorder, onRemove }: Props) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const title = (id: string | number) => slides.find((s) => s.id === id)?.title ?? 'slide'
  const pos = (id: string | number) => slides.findIndex((s) => s.id === id) + 1

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return
    const from = slides.findIndex((s) => s.id === active.id)
    const to = slides.findIndex((s) => s.id === over.id)
    onReorder(arrayMove(slides, from, to).map((s) => s.id))
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      modifiers={[vertical]}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${title(active.id)}.`,
          onDragOver: ({ active, over }) => (over ? `${title(active.id)} is now at position ${pos(over.id)} of ${slides.length}.` : ''),
          onDragEnd: ({ active, over }) => (over ? `${title(active.id)} dropped at position ${pos(over.id)}.` : 'Dropped.'),
          onDragCancel: ({ active }) => `Reorder of ${title(active.id)} cancelled.`,
        },
      }}
    >
      <SortableContext items={slides.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <ol className="divide-y overflow-hidden rounded-lg border" aria-label="Slides in this module">
          {slides.map((s, i) => (
            <Row key={s.id} slide={s} index={i} onRemove={onRemove} />
          ))}
        </ol>
      </SortableContext>
    </DndContext>
  )
}

function Row({ slide, index, onRemove }: { slide: Slide; index: number; onRemove: (s: Slide) => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: slide.id })
  const fmt = FORMATS[slide.file_type]
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(ROW, 'relative', isDragging && 'z-10 shadow-lg ring-1 ring-ring/40', !slide.is_active && 'text-muted-foreground')}
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        aria-label={`Reorder ${slide.title}`}
        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-md text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className="w-6 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground" aria-hidden>
        {String(index + 1).padStart(2, '0')}
      </span>
      <fmt.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <span className="grid min-w-0 flex-1">
        <span className="truncate text-sm font-medium text-foreground">{slide.title}</span>
        <span className="truncate font-mono text-xs text-muted-foreground">{fmt.short} /{slide.slug}</span>
      </span>
      {slide.is_protected && (
        <Badge variant="secondary" className="hidden shrink-0 font-normal sm:inline-flex"><Lock aria-hidden />Code</Badge>
      )}
      {!slide.is_active && <Badge variant="outline" className="hidden shrink-0 font-normal sm:inline-flex">Inactive</Badge>}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild aria-label={`Preview ${slide.title}`}>
            <a href={`/slides/${slide.slug}`} target="_blank" rel="noreferrer"><ExternalLink aria-hidden /></a>
          </Button>
        </TooltipTrigger>
        <TooltipContent>Preview</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Remove ${slide.title} from module`} onClick={() => onRemove(slide)} className="text-muted-foreground hover:text-destructive">
            <MinusCircle aria-hidden />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Remove from module (keeps the slide)</TooltipContent>
      </Tooltip>
    </li>
  )
}

export function ModuleSlideListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <ol className="divide-y overflow-hidden rounded-lg border" aria-busy="true" aria-label="Loading slides">
      {Array.from({ length: rows }, (_, i) => (
        <li key={i} className={ROW}>
          <Skeleton className="size-11" />
          <Skeleton className="h-3 w-6" />
          <div className="flex flex-1 flex-col gap-1.5"><Skeleton className="h-4 w-48 max-w-full" /><Skeleton className="h-3 w-28" /></div>
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
        </li>
      ))}
    </ol>
  )
}
