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
 *
 * Decks from Storage (signed URLs on another origin) are fetched and rendered via
 * `srcdoc` with `sandbox="allow-scripts"` only: the deck runs in an opaque origin,
 * can't touch this site, and works even though Storage won't serve it as a page.
 * Same-origin demo decks keep a normal `src`.
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
  const sameOrigin = useMemo(() => new URL(src, location.href).origin === location.origin, [src])
  const [doc, setDoc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (sameOrigin) return
    let alive = true
    fetch(src)
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(String(r.status)))))
      .then((html) => alive && setDoc(html))
      .catch(() => alive && setFailed(true))
    return () => {
      alive = false
    }
  }, [src, sameOrigin])

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
    // srcdoc decks have an opaque origin, so they can only be addressed with '*'.
    frame.current?.contentWindow?.postMessage({ type: 'slides:goto', index: page - 1 }, sameOrigin ? location.origin : '*')
  }, [page, ready, sameOrigin])

  if (failed) {
    return <p role="alert" className="absolute inset-0 grid place-items-center p-6 text-center text-sm text-muted-foreground">This deck could not be loaded. The link may have expired — reload the page.</p>
  }

  return (
    <>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      {(sameOrigin || doc !== null) && <iframe
        ref={frame}
        {...(sameOrigin ? { src } : { srcDoc: doc ?? '' })}
        title={`${grant.slide.title} — slides`}
        sandbox={sameOrigin ? 'allow-scripts allow-same-origin' : 'allow-scripts'}
        referrerPolicy="no-referrer"
        loading="eager"
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 size-full border-0 bg-card"
      />}
    </>
  )
}
