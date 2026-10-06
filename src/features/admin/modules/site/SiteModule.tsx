import { Check, Copy, ExternalLink, Monitor, RotateCw, Smartphone, Tablet } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { PageHeader } from '../../ui/PageHeader'

const PAGES = [
  { title: 'Harbor home', path: '/', description: 'The 3D harbor landing scene.' },
  { title: 'About', path: '/#about', description: 'Deep link to the About section.' },
  { title: 'Portfolio', path: '/#portfolio', description: 'Deep link to published work.' },
  { title: 'Slide portal', path: '/slides/workshop-web-performance', description: 'Example of a public slide link with access gate.' },
]

// Width + aspect per device; the frame scales down inside its container on small screens.
const DEVICES = {
  desktop: { label: 'Desktop', icon: Monitor, width: 1280, aspect: 'aspect-[16/10]' },
  tablet: { label: 'Tablet', icon: Tablet, width: 768, aspect: 'aspect-[3/4]' },
  mobile: { label: 'Mobile', icon: Smartphone, width: 390, aspect: 'aspect-[9/19]' },
} as const
type Device = keyof typeof DEVICES

function PageCard({ title, path, description }: (typeof PAGES)[number]) {
  const [copied, setCopied] = useState(false)
  const url = `${location.origin}${path}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('URL copied')
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Clipboard is not available')
    }
  }

  return (
    <li className="flex flex-col justify-between gap-4 rounded-xl border bg-card p-4">
      <div className="min-w-0">
        <p className="font-medium">{title}</p>
        <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        <p className="mt-2 truncate font-mono text-xs text-muted-foreground" title={url}>{path}</p>
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <a href={path} target="_blank" rel="noreferrer">
            <ExternalLink aria-hidden />Open<span className="sr-only"> {title} in a new tab</span>
          </a>
        </Button>
        <Button variant="ghost" size="icon-sm" onClick={() => void copy()} aria-label={`Copy ${title} URL`}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
        </Button>
      </div>
    </li>
  )
}

export default function SiteModule() {
  const [device, setDevice] = useState<Device>('desktop')
  const [loaded, setLoaded] = useState(false)
  const [nonce, setNonce] = useState(0)
  const d = DEVICES[device]

  const reload = () => {
    setLoaded(false)
    setNonce((n) => n + 1) // remounts the iframe
  }

  return (
    <div className="flex flex-col gap-8">
      <PageHeader eyebrow="Engagement" title="View Sites" description="Jump to public pages or preview the live site at different widths." />

      <section aria-labelledby="pages-h" className="flex flex-col gap-3">
        <h2 id="pages-h" className="hud-label text-muted-foreground">Public pages</h2>
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PAGES.map((p) => <PageCard key={p.path} {...p} />)}
        </ul>
      </section>

      <section aria-labelledby="preview-h" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="preview-h" className="hud-label text-muted-foreground">Live preview</h2>
            <p className="mt-1 text-xs text-muted-foreground">Shows the site served by this host (the dev server when running locally).</p>
          </div>
          <div className="flex items-center gap-2">
            <ToggleGroup
              type="single"
              variant="outline"
              spacing={0}
              value={device}
              onValueChange={(v) => {
                if (!v || v === device) return
                setDevice(v as Device)
                reload()
              }}
              aria-label="Preview device"
            >
              {(Object.keys(DEVICES) as Device[]).map((k) => {
                const Icon = DEVICES[k].icon
                return (
                  <ToggleGroupItem key={k} value={k} aria-label={`${DEVICES[k].label} (${DEVICES[k].width}px)`}>
                    <Icon aria-hidden />
                  </ToggleGroupItem>
                )
              })}
            </ToggleGroup>
            <Button variant="outline" size="icon" onClick={reload} aria-label="Reload preview"><RotateCw aria-hidden /></Button>
          </div>
        </div>

        <div className="flex justify-center rounded-xl border bg-muted/40 p-3 sm:p-6">
          <div className={cn('relative w-full overflow-hidden rounded-lg border bg-background shadow-sm', d.aspect)} style={{ maxWidth: d.width }}>
            {!loaded && <Skeleton className="absolute inset-0 rounded-none" aria-label="Loading preview" />}
            <iframe
              key={`${device}-${nonce}`}
              src="/"
              title="Public site preview"
              loading="lazy"
              onLoad={() => setLoaded(true)}
              className={cn('absolute inset-0 size-full border-0 motion-safe:transition-opacity', loaded ? 'opacity-100' : 'opacity-0')}
            />
          </div>
        </div>
      </section>
    </div>
  )
}
