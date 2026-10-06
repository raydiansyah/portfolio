import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, MonitorX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import type { FormatViewerProps } from '../types'

const OFFICE_EMBED = 'https://view.officeapps.live.com/op/embed.aspx?src='
const LOCAL_HOST = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|.+\.(localhost|local|test))$/i

type Resolved = { kind: 'embed'; url: string } | { kind: 'unreachable' }

/**
 * Office/Google viewers fetch the file from their own servers, so the source
 * must be publicly reachable. Known embed URLs pass through; plain file URLs
 * are wrapped in the Office Web Viewer; local/blob URLs can't be previewed.
 */
function resolveEmbed(raw: string): Resolved {
  let u: URL
  try {
    u = new URL(raw, location.href)
  } catch {
    return { kind: 'unreachable' }
  }
  if (u.hostname === 'view.officeapps.live.com') return { kind: 'embed', url: u.toString() }
  if (u.hostname === 'docs.google.com' && u.pathname.startsWith('/presentation/')) {
    // /edit or /view links → /embed (only the embed route is frame-able).
    const path = u.pathname.replace(/\/(edit|view|preview|pub)$/, '').replace(/\/embed$/, '')
    return { kind: 'embed', url: `https://docs.google.com${path}/embed${u.search}` }
  }
  if (u.protocol === 'blob:' || u.protocol === 'data:' || LOCAL_HOST.test(u.hostname)) return { kind: 'unreachable' }
  return { kind: 'embed', url: OFFICE_EMBED + encodeURIComponent(u.toString()) }
}

export default function PptViewer({ grant, onPageCount }: FormatViewerProps) {
  const [loaded, setLoaded] = useState(false)
  const resolved = useMemo(() => resolveEmbed(grant.signed_url), [grant.signed_url])

  // The embed has its own controls and doesn't expose a slide count.
  useEffect(() => onPageCount(null), [onPageCount])

  if (resolved.kind === 'unreachable') {
    return (
      <div role="note" className="absolute inset-0 grid place-items-center p-6 text-center">
        <div className="flex max-w-sm flex-col items-center gap-3">
          <MonitorX className="size-7 text-muted-foreground" aria-hidden />
          <p className="font-medium">This presentation can't be previewed here</p>
          <p className="text-sm text-muted-foreground">
            Online PowerPoint viewers can only open files hosted on a public URL, not local or private files.
          </p>
          {grant.slide.allow_download && (
            <Button asChild variant="outline">
              <a href={grant.signed_url} target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden /> Open original
              </a>
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      {!loaded && <Skeleton className="absolute inset-0 rounded-none" />}
      <iframe
        src={resolved.url}
        title={`${grant.slide.title} — presentation`}
        referrerPolicy="no-referrer"
        allow="fullscreen"
        allowFullScreen
        onLoad={() => setLoaded(true)}
        className="absolute inset-0 size-full border-0"
      />
    </>
  )
}
