import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import type { ComponentType, LazyExoticComponent, PointerEvent as ReactPointerEvent } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Crosshair, Download, ListTree, Maximize, Minimize, X, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { SlideAccessGrant, SlideFileType } from '@/types/supabase'
import { OutlineSheet } from './OutlineSheet'
import { PresenterStage } from './PresenterStage'
import { ThemeToggle } from './ThemeToggle'
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, clampZoom, outlinePages } from './types'
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

/** Position inside an unlocked module: lets the player move between decks. */
export interface DeckNav {
  index: number
  total: number
  moduleTitle: string
  prevTitle?: string
  nextTitle?: string
  onPrev?: () => void
  onNext?: () => void
  onBack: () => void
}

export default function Viewer({ grant, deck }: { grant: SlideAccessGrant; deck?: DeckNav }) {
  const { slide } = grant
  const rootRef = useRef<HTMLDivElement>(null)
  const fs = useFullscreen(rootRef)
  const [page, setPage] = useState(1)
  const [count, setCount] = useState<number | null>(() => (slide.file_type === 'ppt' ? null : outlinePages(grant)))
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [presentation, setPresentation] = useState(false)
  const [laser, setLaser] = useState(false)
  const [zoom, setZoom] = useState(1)
  const swipe = useRef<{ x: number; y: number } | null>(null)

  const go = useCallback((p: number) => setPage(count ? Math.min(Math.max(1, p), count) : 1), [count])
  // Past the last page → next deck; before the first → previous deck.
  const atEnd = count === null || page >= count
  const next = useCallback(() => (count && page < count ? go(page + 1) : deck?.onNext?.()), [count, page, go, deck])
  const prev = useCallback(() => (page > 1 ? go(page - 1) : deck?.onPrev?.()), [page, go, deck])
  const zoomBy = useCallback((d: number) => setZoom((z) => clampZoom(z + d)), [])

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
        ArrowRight: next,
        PageDown: next,
        ArrowLeft: prev,
        PageUp: prev,
        Home: () => go(1),
        End: () => go(count ?? 1),
        l: () => setLaser((v) => !v),
        L: () => setLaser((v) => !v),
        '+': () => zoomBy(ZOOM_STEP),
        '=': () => zoomBy(ZOOM_STEP),
        '-': () => zoomBy(-ZOOM_STEP),
        '0': () => setZoom(1),
      }
      if (nav[e.key]) {
        e.preventDefault()
        nav[e.key]()
      } else if (e.key === 'Escape' && (laser || zoom > 1)) {
        setLaser(false)
        setZoom(1)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        void toggleFs()
      } else if (e.key === 'Escape' && presentation && !document.fullscreenElement) {
        setPresentation(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, next, prev, zoomBy, count, laser, zoom, outlineOpen, presentation, toggleFs])

  const onPointerDown = (e: ReactPointerEvent) => {
    swipe.current = e.pointerType === 'mouse' ? null : { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    const s = swipe.current
    swipe.current = null
    if (!s || laser || zoom > 1) return
    const dx = e.clientX - s.x
    if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(e.clientY - s.y)) (dx < 0 ? next : prev)()
  }

  const Format = FORMAT_VIEWERS[slide.file_type]
  const hasOutline = slide.outline.length > 0 && count !== null
  const progress = count ? (page / count) * 100 : 0

  return (
    <div ref={rootRef} className="flex h-dvh flex-col bg-background text-foreground">
      {!presentation && (
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-2 sm:gap-3 sm:px-4">
          {deck && (
            <Button variant="ghost" size="icon" onClick={deck.onBack} aria-label={`Back to ${deck.moduleTitle}`} title="Back to module">
              <ArrowLeft aria-hidden />
            </Button>
          )}
          <div className="min-w-0 flex-1 pl-1">
            <h1 className="truncate text-sm font-semibold sm:text-base">{slide.title}</h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {deck ? `${deck.moduleTitle} · Deck ${deck.index + 1} of ${deck.total}` : slide.presenter}
            </p>
          </div>
          <StageTools laser={laser} onLaser={() => setLaser((v) => !v)} zoom={zoom} onZoom={zoomBy} onResetZoom={() => setZoom(1)} />
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
          <PresenterStage laser={laser} zoom={zoom} onZoomChange={setZoom}>
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
          </PresenterStage>
        </div>
        {presentation && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-1 rounded-lg bg-background/80 p-1 opacity-60 backdrop-blur-sm transition-opacity hover:opacity-100 focus-within:opacity-100">
            <StageTools laser={laser} onLaser={() => setLaser((v) => !v)} zoom={zoom} onZoom={zoomBy} onResetZoom={() => setZoom(1)} />
            <Button variant="ghost" size="icon" onClick={togglePresentation} aria-label="Exit presentation mode">
              <X aria-hidden />
            </Button>
          </div>
        )}
      </main>

      {!presentation && (count !== null || deck) && (
        <footer className="shrink-0 border-t">
          <div className="h-0.5 bg-muted" aria-hidden>
            <div className="h-full bg-primary motion-safe:transition-[width] motion-safe:duration-300" style={{ width: `${progress}%` }} />
          </div>
          <nav aria-label="Slide navigation" className="flex h-14 items-center justify-between gap-2 px-2 sm:px-4">
            <Button variant="ghost" size="lg" onClick={prev} disabled={page <= 1 && !deck?.onPrev} className="max-w-[40%]">
              <ChevronLeft aria-hidden />
              <span className="sr-only truncate sm:not-sr-only">{page <= 1 && deck?.prevTitle ? deck.prevTitle : 'Previous'}</span>
            </Button>
            <p className="text-sm text-muted-foreground tabular-nums">
              {count && count > 1 ? (
                <>Slide <span className="font-medium text-foreground">{page}</span> of {count}</>
              ) : deck ? (
                <>Deck <span className="font-medium text-foreground">{deck.index + 1}</span> of {deck.total}</>
              ) : null}
            </p>
            <Button variant="ghost" size="lg" onClick={next} disabled={atEnd && !deck?.onNext} className="max-w-[40%]">
              <span className="sr-only truncate sm:not-sr-only">{atEnd && deck?.nextTitle ? deck.nextTitle : 'Next'}</span>
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

/** Laser pointer + zoom controls (header and presentation overlay). */
function StageTools({ laser, onLaser, zoom, onZoom, onResetZoom }: { laser: boolean; onLaser: () => void; zoom: number; onZoom: (d: number) => void; onResetZoom: () => void }) {
  return (
    <div className="flex items-center gap-0.5" role="group" aria-label="Presenter tools">
      <Button variant={laser ? 'secondary' : 'ghost'} size="icon" onClick={onLaser} aria-pressed={laser} aria-label="Laser pointer (L)" title="Laser pointer (L)">
        <Crosshair className={cn(laser && 'text-red-500')} aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => onZoom(-ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out (−)" title="Zoom out (−)">
        <ZoomOut aria-hidden />
      </Button>
      <button
        type="button"
        onClick={onResetZoom}
        className="hidden h-8 min-w-12 rounded-md px-1 font-mono text-xs tabular-nums text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 sm:block"
        aria-label={`Zoom ${Math.round(zoom * 100)}%, reset (0)`}
        title="Reset zoom (0)"
      >
        {Math.round(zoom * 100)}%
      </button>
      <Button variant="ghost" size="icon" onClick={() => onZoom(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in (+)" title="Zoom in (+)">
        <ZoomIn aria-hidden />
      </Button>
    </div>
  )
}
