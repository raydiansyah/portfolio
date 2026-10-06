import { useCallback, useEffect, useRef, useState } from 'react'
import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist'
import { AlertTriangle, Expand, Presentation, ZoomIn, ZoomOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { FormatViewerProps } from '../types'

// Worker is emitted as its own asset by Vite; this module is the only pdfjs entry point.
pdfjs.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString()

const ZOOM_MIN = 0.5
const ZOOM_MAX = 3
const ZOOM_STEP = 1.25
const clampZoom = (z: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, z))

export default function PdfViewer({ grant, page, onPageCount, presentation, onTogglePresentation }: FormatViewerProps) {
  const scroller = useRef<HTMLDivElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null)
  const [error, setError] = useState(false)
  const [rendered, setRendered] = useState(false)
  const [zoom, setZoom] = useState(1) // 1 = fit page to the 16:9 stage
  const [box, setBox] = useState({ w: 0, h: 0 })
  // Presentation mode always shows the whole page.
  const scale = presentation ? 1 : zoom

  /* load document */
  useEffect(() => {
    let alive = true
    const task = pdfjs.getDocument({ url: grant.signed_url })
    task.promise.then(
      (d) => {
        if (!alive) return
        setDoc(d)
        onPageCount(d.numPages)
      },
      (err: unknown) => {
        // Destroying the task on unmount rejects too; only surface real failures.
        if (!alive) return
        console.error('[slides] PDF load failed', err)
        setError(true)
      },
    )
    return () => {
      alive = false
      void task.destroy()
    }
  }, [grant.signed_url, onPageCount])

  /* track container size (DPR-aware render happens below) */
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setBox((b) => (Math.abs(b.w - width) < 1 && Math.abs(b.h - height) < 1 ? b : { w: width, h: height }))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  /* render current page; cancel any in-flight render on change */
  useEffect(() => {
    if (!doc || !canvas.current || !box.w || !box.h) return
    let task: RenderTask | null = null
    let cancelled = false
    ;(async () => {
      const p = await doc.getPage(Math.min(page, doc.numPages))
      if (cancelled || !canvas.current) return
      const base = p.getViewport({ scale: 1 })
      const fit = Math.min(box.w / base.width, box.h / base.height)
      const viewport = p.getViewport({ scale: fit * scale })
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const c = canvas.current
      c.width = Math.floor(viewport.width * dpr)
      c.height = Math.floor(viewport.height * dpr)
      c.style.width = `${Math.floor(viewport.width)}px`
      c.style.height = `${Math.floor(viewport.height)}px`
      task = p.render({ canvas: c, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined })
      try {
        await task.promise
        if (!cancelled) setRendered(true)
      } catch {
        /* RenderingCancelledException on rapid page/zoom changes */
      }
    })()
    return () => {
      cancelled = true
      task?.cancel()
    }
  }, [doc, page, scale, box])

  const zoomBy = useCallback((f: number | null) => setZoom((z) => (f === null ? 1 : clampZoom(z * f))), [])

  /* Ctrl/Cmd + / - / 0 → zoom instead of browser zoom */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      const f = e.key === '+' || e.key === '=' ? ZOOM_STEP : e.key === '-' ? 1 / ZOOM_STEP : e.key === '0' ? null : undefined
      if (f === undefined) return
      e.preventDefault()
      zoomBy(f)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zoomBy])

  if (error) {
    return (
      <div role="alert" className="absolute inset-0 grid place-items-center p-6 text-center">
        <div className="flex max-w-xs flex-col items-center gap-2">
          <AlertTriangle className="size-6 text-destructive" aria-hidden />
          <p className="font-medium">Couldn't load this PDF</p>
          <p className="text-sm text-muted-foreground">The link may have expired. Reload the page to request a fresh one.</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <div ref={scroller} className={cn('absolute inset-0 overflow-auto', scale > 1 && 'touch-auto')}>
        <div className="flex min-h-full min-w-full w-max">
          <canvas
            ref={canvas}
            role="img"
            aria-label={`${grant.slide.title}, page ${page}`}
            className={cn('m-auto block bg-white', !rendered && 'invisible')}
          />
        </div>
      </div>
      {!rendered && <Skeleton className="absolute inset-0 rounded-none" />}

      {!presentation && doc && (
        <div
          role="toolbar"
          aria-label="PDF zoom"
          className="absolute right-2 bottom-2 flex items-center gap-0.5 rounded-lg border bg-background/85 p-0.5 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-background/70"
        >
          <Button variant="ghost" size="icon-sm" onClick={() => zoomBy(1 / ZOOM_STEP)} disabled={zoom <= ZOOM_MIN} aria-label="Zoom out" title="Zoom out (Ctrl −)">
            <ZoomOut aria-hidden />
          </Button>
          <span className="w-11 text-center font-mono text-xs tabular-nums" aria-live="polite">
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon-sm" onClick={() => zoomBy(ZOOM_STEP)} disabled={zoom >= ZOOM_MAX} aria-label="Zoom in" title="Zoom in (Ctrl +)">
            <ZoomIn aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={() => zoomBy(null)} disabled={zoom === 1} aria-label="Fit page" title="Fit page (Ctrl 0)">
            <Expand aria-hidden />
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onTogglePresentation} aria-label="Presentation mode" title="Presentation mode">
            <Presentation aria-hidden />
          </Button>
        </div>
      )}
    </>
  )
}
