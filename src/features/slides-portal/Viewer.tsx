import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType, LazyExoticComponent, PointerEvent as ReactPointerEvent } from 'react'
import { ChevronLeft, ChevronRight, Download, ListTree, Maximize, Minimize, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SlideAccessGrant, SlideFileType } from '@/types/supabase'
import { OutlineSheet } from './OutlineSheet'
import { ThemeToggle } from './ThemeToggle'
import { outlinePages } from './types'
import type { FormatViewerProps } from './types'
import { useFullscreen } from './useFullscreen'

// Each format is its own chunk; pdfjs only ever loads with PdfViewer.
const FORMAT_VIEWERS: Record<SlideFileType, LazyExoticComponent<ComponentType<FormatViewerProps>>> = {
  html: lazy(() => import('./viewers/HtmlViewer')),
  pdf: lazy(() => import('./viewers/PdfViewer')),
  ppt: lazy(() => import('./viewers/PptViewer')),
}

const SWIPE_PX = 50
const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

export default function Viewer({ grant }: { grant: SlideAccessGrant }) {
  const { slide } = grant
  const rootRef = useRef<HTMLDivElement>(null)
  const fs = useFullscreen(rootRef)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState<number | null>(() => (slide.file_type === 'ppt' ? null : outlinePages(grant)))
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const go = useCallback((p: number) => setPage(count ? Math.min(Math.max(1, p), count) : 1), [count])
  const onPageCount = useCallback((n: number | null) => {
    setCount(n)
    if (n) setPage((p) => Math.min(p, n))
  }, [])

  const { enter: enterFs, exit: exitFs, toggle: toggleFs } = fs
  // Presentation = chrome hidden + fullscreen (when the API is available).
  const togglePresentation = useCallback(() => {
    if (presentation) void exitFs()
    else void enterFs()
    setPresentation(!presentation)
  }, [presentation, enterFs, exitFs])

  // Leaving fullscreen (Esc, browser UI) also ends presentation mode.
  useEffect(() => {
    const onChange = () => !document.fullscreenElement && setPresentation(false)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || outlineOpen || e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return
      const nav: Record<string, () => void> = {
        ArrowRight: () => go(page + 1),
        PageDown: () => go(page + 1),
        ArrowLeft: () => go(page - 1),
        PageUp: () => go(page - 1),
        Home: () => go(1),
        End: () => go(count ?? 1),
      }
      if (count && nav[e.key]) {
        e.preventDefault()
        nav[e.key]()
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        void toggleFs()
      } else if (e.key === 'Escape' && presentation && !document.fullscreenElement) {
        setPresentation(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, page, count, outlineOpen, presentation, toggleFs])

  const onPointerDown = (e: ReactPointerEvent) => {
    swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || !count) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) go(page + (dx < 0 ? 1 : -1))
  }

  const Format = FORMAT_VIEWERS[slide.file_type]
  const hasOutline = slide.outline.length > 0 && count !== null
  const progress = count ? (page / count) * 100 : 0

  return (
    <div ref={rootRef} className="flex h-dvh flex-col bg-background text-foreground">
      {!presentation && (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:gap-3 sm:px-4">
          <div className="min-w-0 flex-1 pl-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">{slide.title}</h1>
            {slide.presenter && <p className="hidden truncate text-xs text-muted-foreground sm:block">{slide.presenter}</p>}
          </div>
          {count && (
            <p className="hud-label hidden text-muted-foreground tabular-nums md:block" aria-hidden>
              {String(page).padStart(2, '0')} / {String(count).padStart(2, '0')}
            </p>
          )}
          <div className="flex items-center gap-0.5">
            {hasOutline && (
              <Button variant="ghost" onClick={() => setOutlineOpen(true)} aria-haspopup="dialog" aria-label="Open outline">
                <ListTree aria-hidden />
                <span className="hidden sm:inline">Outline</span>
              </Button>
            )}
            {slide.allow_download && (
              <Button asChild variant="ghost" size="icon">
                <a href={grant.signed_url} download aria-label="Download slides" title="Download slides">
                  <Download aria-hidden />
                </a>
              </Button>
            )}
            <ThemeToggle />
            {fs.supported && (
              <Button variant="ghost" size="icon" onClick={() => void toggleFs()} aria-pressed={fs.active} aria-label="Fullscreen (F)" title="Fullscreen (F)">
                {fs.active ? <Minimize aria-hidden /> : <Maximize aria-hidden />}
              </Button>
            )}
          </div>
        </header>
      )}

      <main
        className={cn('relative grid min-h-0 flex-1 place-items-center [container-type:size] touch-pan-y', presentation ? 'p-0' : 'p-2 sm:p-4 lg:p-6')}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (swipe.current = null)}
      >
        {/* Fixed 16:9 stage sized from the container: no layout shift while chunks/files load. */}
        <div
          className={cn(
            'relative aspect-video w-[min(100cqw,calc(100cqh*16/9))] overflow-hidden bg-card',
            !presentation && 'rounded-xl border shadow-sm',
          )}
        >
          <Suspense fallback={<Skeleton className="absolute inset-0 rounded-none" />}>
            <Format
              grant={grant}
              page={page}
              onPageCount={onPageCount}
              onPageChange={go}
              presentation={presentation}
              onTogglePresentation={togglePresentation}
            />
          </Suspense>
        </div>
        {presentation && (
          <Button
            variant="secondary"
            size="icon"
            onClick={togglePresentation}
            aria-label="Exit presentation mode"
            className="absolute top-3 right-3 opacity-60 hover:opacity-100 focus-visible:opacity-100"
          >
            <X aria-hidden />
          </Button>
        )}
      </main>

      {!presentation && count !== null && (
        <footer className="shrink-0 border-t">
          <div className="h-0.5 bg-muted" aria-hidden>
            <div className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${progress}%` }} />
          </div>
          <nav aria-label="Slide navigation" className="flex h-14 items-center justify-between gap-2 px-2 sm:px-4">
            <Button variant="ghost" size="lg" onClick={() => go(page - 1)} disabled={page <= 1}>
              <ChevronLeft aria-hidden />
              <span className="sr-only sm:not-sr-only">Previous</span>
            </Button>
            <p className="text-sm text-muted-foreground tabular-nums">
              Slide <span className="font-medium text-foreground">{page}</span> of {count}
            </p>
            <Button variant="ghost" size="lg" onClick={() => go(page + 1)} disabled={page >= count}>
              <span className="sr-only sm:not-sr-only">Next</span>
              <ChevronRight aria-hidden />
            </Button>
          </nav>
        </footer>
      )}

      <p className="sr-only" aria-live="polite" aria-atomic>
        {count ? `Slide ${page} of ${count}` : ''}
      </p>

      {hasOutline && <OutlineSheet open={outlineOpen} onOpenChange={setOutlineOpen} outline={slide.outline} page={page} onJump={go} />}
    </div>
  )
}
