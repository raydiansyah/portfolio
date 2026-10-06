import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { cn } from '@/lib/utils'
import type { SlideOutlineItem } from '@/types/supabase'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  outline: SlideOutlineItem[]
  page: number
  onJump: (page: number) => void
}

/** Section index; the active entry is the last section starting at or before the current page. */
export function OutlineSheet({ open, onOpenChange, outline, page, onJump }: Props) {
  const active = outline.reduce((acc, item, i) => (item.page <= page ? i : acc), -1)
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-80 max-w-[85vw] gap-0">
        <SheetHeader className="border-b">
          <SheetTitle>Outline</SheetTitle>
          <SheetDescription>Jump to a section.</SheetDescription>
        </SheetHeader>
        <nav aria-label="Slide outline" className="flex-1 overflow-y-auto p-2">
          <ol className="flex flex-col gap-0.5">
            {outline.map((item, i) => (
              <li key={`${item.page}-${item.title}`}>
                <button
                  type="button"
                  onClick={() => {
                    onJump(item.page)
                    onOpenChange(false)
                  }}
                  aria-current={i === active ? 'step' : undefined}
                  className={cn(
                    'flex w-full items-baseline gap-3 rounded-lg px-3 py-2.5 text-left text-sm outline-none transition-colors hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50',
                    i === active && 'bg-muted font-medium',
                  )}
                >
                  <span className="w-6 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">{String(item.page).padStart(2, '0')}</span>
                  <span className="flex-1">{item.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </SheetContent>
    </Sheet>
  )
}
