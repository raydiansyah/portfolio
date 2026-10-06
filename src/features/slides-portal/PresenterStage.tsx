import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { ZOOM_STEP, clampZoom } from './types'


interface Props {
  children: ReactNode
  /** Laser pointer on: the cursor becomes a red dot and the deck stops receiving clicks. */
  laser: boolean
  zoom: number
  onZoomChange: (zoom: number) => void
}

/**
 * Presenter layer over the 16:9 stage: zoom (scaled from the centre, drag to
 * pan while zoomed, ctrl/⌘ + wheel or pinch-trackpad to zoom) and a laser dot.
 * While either tool is active a transparent overlay sits above the deck iframe
 * so pointer events reach this layer instead of the deck.
 */
export function PresenterStage({ children, laser, zoom, onZoomChange }: Props) {
  const box = useRef<HTMLDivElement>(null)
  /** Pan offset and the zoom it was set at; scaled with zoom so it stays in bounds. */
  const [pan, setPan] = useState({ x: 0, y: 0, z: 1 })
  const [dot, setDot] = useState<{ x: number; y: number } | null>(null)
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const active = laser || zoom > 1

  const k = pan.z > 1 ? (zoom - 1) / (pan.z - 1) : 0
  const offset = { x: pan.x * k, y: pan.y * k }

  // Keep the zoomed stage covering the frame: pan is limited to the overflow.
  const clampPan = (x: number, y: number) => {
    const el = box.current
    if (!el) return { x: 0, y: 0, z: zoom }
    const mx = ((zoom - 1) * el.clientWidth) / 2
    const my = ((zoom - 1) * el.clientHeight) / 2
    return { x: Math.min(mx, Math.max(-mx, x)), y: Math.min(my, Math.max(-my, y)), z: zoom }
  }

  // ctrl/⌘ + wheel (and trackpad pinch) zooms; needs a non-passive listener.
  const zoomRef = useRef({ zoom, onZoomChange })
  useEffect(() => {
    zoomRef.current = { zoom, onZoomChange }
  })
  useEffect(() => {
    const el = box.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return
      e.preventDefault()
      const { zoom: z, onZoomChange: set } = zoomRef.current
      set(clampZoom(z - Math.sign(e.deltaY) * ZOOM_STEP))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const onPointerDown = (e: ReactPointerEvent) => {
    if (laser || zoom <= 1) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, px: offset.x, py: offset.y }
    setDragging(true)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    if (laser) {
      const r = e.currentTarget.getBoundingClientRect()
      setDot({ x: e.clientX - r.left, y: e.clientY - r.top })
      return
    }
    const d = drag.current
    if (d) setPan(clampPan(d.px + e.clientX - d.x, d.py + e.clientY - d.y))
  }
  const endDrag = () => {
    drag.current = null
    setDragging(false)
  }

  return (
    <div ref={box} className="absolute inset-0 overflow-hidden">
      <div
        className={cn('absolute inset-0 origin-center', !dragging && 'motion-safe:transition-transform motion-safe:duration-150')}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
      >
        {children}
      </div>
      {active && (
        <div
          className={cn('absolute inset-0 z-10 touch-none', laser ? 'cursor-none' : dragging ? 'cursor-grabbing' : 'cursor-grab')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => setDot(null)}
          aria-hidden
        >
          {laser && dot && (
            <span
              className="pointer-events-none absolute size-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_10px_4px_rgba(239,68,68,0.7),0_0_24px_10px_rgba(239,68,68,0.35)]"
              style={{ left: dot.x, top: dot.y }}
            />
          )}
        </div>
      )}
    </div>
  )
}
