import { useCallback, useEffect, useState, useSyncExternalStore } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Anchor, ArrowRight, FileQuestion, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { getPublicSlide, verifySlideAccess } from '@/features/admin/data/slides'
import type { PublicSlideMeta, SlideAccessGrant } from '@/types/supabase'
import { AccessGate } from './AccessGate'
import { ModulePage } from './ModulePage'
import { ThemeToggle } from './ThemeToggle'
import Viewer from './Viewer'

/* ------------------------------------------------------------- routing */

const subscribePath = (cb: () => void) => {
  window.addEventListener('popstate', cb)
  return () => window.removeEventListener('popstate', cb)
}
/** `/slides/m/<module>` is a module page; `/slides/<slug>` is a deck. Returned as a string so useSyncExternalStore compares by value. */
const readRoute = () => {
  const mod = /^\/slides\/m\/([^/?#]+)/.exec(location.pathname)
  if (mod) return `module:${decodeURIComponent(mod[1])}`
  const m = /^\/slides\/([^/?#]+)/.exec(location.pathname)
  return m ? `slide:${decodeURIComponent(m[1])}` : null
}
function navigate(path: string) {
  history.pushState(null, '', path)
  window.dispatchEvent(new PopStateEvent('popstate'))
}

/* ------------------------------------------------- session grant cache */

// Only the grant (metadata + file URL) is cached — never the access code.
const GRANT_TTL_MS = 60 * 60 * 1000
const grantKey = (slug: string) => `slides-grant:${slug}`

function loadGrant(slug: string): SlideAccessGrant | null {
  try {
    const raw = sessionStorage.getItem(grantKey(slug))
    if (!raw) return null
    const { grant, at } = JSON.parse(raw) as { grant: SlideAccessGrant; at: number }
    if (Date.now() - at < Math.min(GRANT_TTL_MS, grant.expires_in * 1000)) return grant
    sessionStorage.removeItem(grantKey(slug))
  } catch {
    /* storage unavailable or corrupt */
  }
  return null
}

function saveGrant(slug: string, grant: SlideAccessGrant) {
  try {
    sessionStorage.setItem(grantKey(slug), JSON.stringify({ grant, at: Date.now() }))
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------- portal */

function useNoIndex(title: string) {
  useEffect(() => {
    let meta = document.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const prev = meta?.content
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'robots'
      document.head.appendChild(meta)
    }
    meta.content = 'noindex, nofollow'
    return () => {
      if (prev === undefined) meta.remove()
      else meta.content = prev
    }
  }, [])
  useEffect(() => {
    document.title = `${title} — Slides`
  }, [title])
}

export default function SlidesPortal() {
  const route = useSyncExternalStore(subscribePath, readRoute, () => null)
  if (!route) return <EnterLink />
  const [kind, slug] = [route.slice(0, route.indexOf(':')), route.slice(route.indexOf(':') + 1)]
  if (kind === 'module') return <ModulePage key={slug} slug={slug} onOpen={(s) => navigate(`/slides/${encodeURIComponent(s)}`)} />
  return <SlideRoute key={slug} slug={slug} />
}

type State =
  | { kind: 'loading' }
  | { kind: 'not-found' }
  | { kind: 'gate'; meta: PublicSlideMeta }
  | { kind: 'error'; meta: PublicSlideMeta; message: string }
  | { kind: 'viewer'; grant: SlideAccessGrant }

function SlideRoute({ slug }: { slug: string }) {
  const [state, setState] = useState<State>(() => {
    const cached = loadGrant(slug)
    return cached ? { kind: 'viewer', grant: cached } : { kind: 'loading' }
  })
  const title = state.kind === 'viewer' ? state.grant.slide.title : state.kind === 'gate' || state.kind === 'error' ? state.meta.title : 'Slides'
  useNoIndex(title)

  const grant = useCallback(
    (g: SlideAccessGrant) => {
      saveGrant(slug, g)
      setState({ kind: 'viewer', grant: g })
    },
    [slug],
  )

  const loading = state.kind === 'loading'
  useEffect(() => {
    if (!loading) return
    let alive = true
    ;(async () => {
      const meta = await getPublicSlide(slug)
      if (!alive) return
      if (!meta) return setState({ kind: 'not-found' })
      if (meta.is_protected) return setState({ kind: 'gate', meta })
      // Open deck: no code needed, but the file URL still comes from the Edge Function.
      const res = await verifySlideAccess(slug, null)
      if (!alive) return
      if (res.ok) grant(res.grant)
      else if (res.reason === 'not-found') setState({ kind: 'not-found' })
      else if (res.reason === 'expired') setState({ kind: 'error', meta, message: 'Access to this deck has ended. Contact the presenter if you still need it.' })
      else setState({ kind: 'error', meta, message: 'Too many requests. Wait a minute, then reload the page.' })
    })()
    return () => {
      alive = false
    }
  }, [loading, slug, grant])

  switch (state.kind) {
    case 'loading':
      return <LoadingShell />
    case 'not-found':
      return <NotFound slug={slug} />
    case 'gate':
      return <AccessGate meta={state.meta} onGranted={grant} />
    case 'error':
      return (
        <CenteredPage>
          <h1 className="text-xl font-semibold text-balance">{state.meta.title}</h1>
          <p role="alert" className="text-sm text-muted-foreground">{state.message}</p>
        </CenteredPage>
      )
    case 'viewer':
      return <Viewer grant={state.grant} />
  }
}

/* ------------------------------------------------------------ screens */

function Brand() {
  return (
    <a href="/" className="inline-flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
      <Anchor className="size-4 text-primary" aria-hidden />
      Ray Diansyah
    </a>
  )
}

function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <Brand />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-14">
        <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center">{children}</div>
      </main>
    </div>
  )
}

function LoadingShell() {
  return (
    <CenteredPage>
      <span className="sr-only" role="status">Loading slide…</span>
      <Skeleton className="size-12 rounded-full" />
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-4 h-10 w-full" />
    </CenteredPage>
  )
}

function NotFound({ slug }: { slug: string }) {
  return (
    <CenteredPage>
      <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-semibold">Slide not found</h1>
      <p className="text-sm text-muted-foreground">
        No active deck matches <code className="font-mono text-foreground">{slug}</code>. Check the link with your presenter.
      </p>
      <Button variant="outline" onClick={() => navigate('/slides')}>
        Enter another link
      </Button>
    </CenteredPage>
  )
}

/** Accepts a bare slug or a full /slides/<slug> URL. */
function toSlug(input: string) {
  const v = input.trim()
  const m = /\/slides\/([^/?#\s]+)/.exec(v)
  const s = m ? m[1] : v
  return /^[a-z0-9][a-z0-9-]*$/i.test(s) ? s.toLowerCase() : null
}

function EnterLink() {
  useNoIndex('Open a deck')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const slug = toSlug(value)
    if (!slug) return setError('Enter a slide link like /slides/react-fundamentals or its short name.')
    setBusy(true)
    navigate(`/slides/${encodeURIComponent(slug)}`)
  }

  return (
    <CenteredPage>
      <h1 className="text-2xl font-semibold tracking-tight">Open a slide deck</h1>
      <p className="text-sm text-muted-foreground">Enter the slide link or short name your presenter shared.</p>
      <form onSubmit={submit} className="mt-2 flex w-full flex-col gap-2 text-left" noValidate>
        <label htmlFor="slide-slug" className="hud-label text-muted-foreground">
          Slide link or code
        </label>
        <div className="flex gap-2">
          <Input
            id="slide-slug"
            value={value}
            onChange={(e) => {
              setValue(e.target.value)
              setError('')
            }}
            placeholder="react-fundamentals"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            aria-invalid={!!error}
            aria-describedby="slide-slug-error"
            className="h-10"
          />
          <Button type="submit" size="icon-lg" className="size-10" aria-label="Open deck" disabled={busy}>
            {busy ? <Loader2 className="animate-spin" aria-hidden /> : <ArrowRight aria-hidden />}
          </Button>
        </div>
        <p id="slide-slug-error" role="status" aria-live="polite" className="min-h-5 text-sm text-destructive">
          {error}
        </p>
      </form>
    </CenteredPage>
  )
}
