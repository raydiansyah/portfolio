import { useEffect, useMemo, useRef, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { outlinePages } from '../types'
import type { FormatViewerProps } from '../types'

/**
 * HTML deck in a sandboxed iframe. Navigation protocol (window.postMessage):
 *   parent → deck  { type: 'slides:goto', index }      (0-based)
 *   deck → parent  { type: 'slides:ready', count }
 *   deck → parent  { type: 'slides:change', index }    (0-based)
 * Decks that don't speak it still render; the count falls back to the outline.
 */
type DeckMessage = { type: 'slides:ready'; count: number } | { type: 'slides:change'; index: number }

function isDeckMessage(d: unknown): d is DeckMessage {
  if (!d || typeof d !== 'object') return false
  const m = d as Record<string, unknown>
  return (m.type === 'slides:ready' && Number.isInteger(m.count)) || (m.type === 'slides:change' && Number.isInteger(m.index))
}

export default function HtmlViewer({ grant, page, onPageCount, onPageChange }: FormatViewerProps) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [loaded, setLoaded] = useState(false)
  const [ready, setReady] = useState(false)
  const src = grant.signed_url
  const origin = useMemo(() => new URL(src, location.href).origin, [src])

  // Fallback until (or unless) the deck announces itself.
  useEffect(() => onPageCount(outlinePages(grant)), [grant, onPageCount])

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      // Only trust our own iframe; opaque origins report "null".
      if (e.source !== frame.current?.contentWindow || !isDeckMessage(e.data)) return
      if (e.data.type === 'slides:ready') {
        setReady(true)
        onPageCount(Math.max(1, e.data.count))
      } else {
        onPageChange(e.data.index + 1)
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onPageCount, onPageChange])

  // Parent-driven navigation; re-sent once the deck reports ready.
  useEffect(() => {
    if (!ready) return
    frame.current?.contentWindow?.postMessage({ type: 'slides:goto', index: page - 1 }, origin)
  }, [page, ready, origin])

  return (
    <>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <iframe
        ref={frame}
        src={src}
        title={`${grant.slide.title} — slides`}
        sandbox="allow-scripts allow-same-origin"
        referrerPolicy="no-referrer"
        loading="eager"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 size-full border-0 bg-card"
      />
    </>
  )
}
