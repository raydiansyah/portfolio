import { Anchor, FileQuestion, Play } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { getPublicModule } from '@/features/admin/data/modules'
import { grantFor, verifyModuleAccess, type AccessReason } from '@/features/admin/data/slides'
import type { ModuleGrant, PublicModuleMeta } from '@/types/supabase'
import { AccessGate } from './AccessGate'
import { ThemeToggle } from './ThemeToggle'
import { MODULE_LABEL } from './types'
import Viewer from './Viewer'

const FORMAT_LABEL = { html: 'HTML', pdf: 'PDF', ppt: 'PPT' } as const

/* ----------------------------------------------- session module grant */

// The unlocked module (slide list + file keys) is cached per tab — never the code.
const GRANT_TTL_MS = 60 * 60 * 1000
const grantKey = (slug: string) => `slides-module:${slug}`

function loadGrant(slug: string): ModuleGrant | null {
  try {
    const raw = sessionStorage.getItem(grantKey(slug))
    if (!raw) return null
    const { grant, at } = JSON.parse(raw) as { grant: ModuleGrant; at: number }
    if (Date.now() - at < GRANT_TTL_MS) return grant
    sessionStorage.removeItem(grantKey(slug))
  } catch {
    /* storage unavailable or corrupt */
  }
  return null
}

function saveGrant(slug: string, grant: ModuleGrant) {
  try {
    sessionStorage.setItem(grantKey(slug), JSON.stringify({ grant, at: Date.now() }))
  } catch {
    /* ignore */
  }
}

/* --------------------------------------------------------------- page */

type State =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'gate'; meta: PublicModuleMeta }
  | { kind: 'error'; meta: PublicModuleMeta; message: string }
  | { kind: 'ready'; grant: ModuleGrant }

const REASON_TEXT: Record<AccessReason, string> = {
  'wrong-code': 'This module needs an access code.',
  'rate-limit': 'Too many requests. Wait a minute, then reload the page.',
  expired: 'Access to this module has ended. Contact the presenter if you still need it.',
  'not-found': 'This module is no longer available.',
}

interface Props {
  slug: string
  /** Deck being played (`/slides/m/<module>/<slide>`), or null for the list. */
  playing: string | null
  navigate: (path: string, replace?: boolean) => void
}

/**
 * Module flow (/slides/m/<slug>): access code (when the module is locked) →
 * module page with its decks → player that moves between decks. One code
 * unlocks every deck; the unlocked list is kept for the tab session.
 */
export function ModulePage({ slug, playing, navigate }: Props) {
  const [state, setState] = useState<State>(() => {
    const cached = loadGrant(slug)
    return cached ? { kind: 'ready', grant: cached } : { kind: 'loading' }
  })

  const unlock = useCallback(
    async (code: string | null): Promise<AccessReason | null> => {
      const res = await verifyModuleAccess(slug, code)
      if (!res.ok) return res.reason
      saveGrant(slug, res.grant)
      setState({ kind: 'ready', grant: res.grant })
      return null
    },
    [slug],
  )

  const loading = state.kind === 'loading'
  useEffect(() => {
    if (!loading) return
    let alive = true
    ;(async () => {
      const data = await getPublicModule(slug)
      if (!alive) return
      if (!data) return setState({ kind: 'missing' })
      if (data.module.is_protected) return setState({ kind: 'gate', meta: data.module })
      // Open module: no code, but file keys still come from the Edge Function.
      const reason = await unlock(null).catch((): AccessReason => 'rate-limit')
      if (alive && reason) setState({ kind: 'error', meta: data.module, message: REASON_TEXT[reason] })
    })()
    return () => {
      alive = false
    }
  }, [loading, slug, unlock])

  const title =
    state.kind === 'ready' ? state.grant.module.title : state.kind === 'gate' || state.kind === 'error' ? state.meta.title : 'Module'
  useEffect(() => {
    document.title = `${state.kind === 'missing' ? 'Module not found' : title} — Slides`
  }, [state.kind, title])

  if (state.kind === 'gate') {
    return (
      <AccessGate
        eyebrow={MODULE_LABEL[state.meta.category]}
        title={state.meta.title}
        subtitle={state.meta.description}
        verify={(code) => unlock(code)}
      />
    )
  }

  if (state.kind === 'ready' && playing) {
    const { grant } = state
    const i = grant.slides.findIndex((s) => s.slug === playing)
    if (i >= 0) {
      const prev = grant.slides[i - 1]
      const next = grant.slides[i + 1]
      const base = `/slides/m/${encodeURIComponent(slug)}`
      return (
        <Viewer
          key={playing}
          grant={grantFor(grant.slides[i])}
          deck={{
            index: i,
            total: grant.slides.length,
            moduleTitle: grant.module.title,
            prevTitle: prev?.title,
            nextTitle: next?.title,
            onPrev: prev && (() => navigate(`${base}/${encodeURIComponent(prev.slug)}`)),
            onNext: next && (() => navigate(`${base}/${encodeURIComponent(next.slug)}`)),
            onBack: () => navigate(base),
          }}
        />
      )
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="flex h-14 items-center justify-between px-4 sm:px-6">
        <a href="/" className="inline-flex items-center gap-2 rounded-md text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
          <Anchor className="size-4 text-primary" aria-hidden />
          Ray Diansyah
        </a>
        <ThemeToggle />
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 pt-8 pb-20 sm:px-6 sm:pt-14">
        {state.kind === 'loading' && (
          <div aria-busy="true">
            <span className="sr-only" role="status">Loading module…</span>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-3 h-10 w-80 max-w-full" />
            <Skeleton className="mt-3 h-4 w-96 max-w-full" />
            <div className="mt-10 flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-[72px] w-full rounded-lg" />)}
            </div>
          </div>
        )}

        {state.kind === 'missing' && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
            <h1 className="text-xl font-semibold">Module not found</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              No published module matches <code className="font-mono text-foreground">{slug}</code>. Check the link with your presenter.
            </p>
          </div>
        )}

        {state.kind === 'error' && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <h1 className="text-xl font-semibold text-balance">{state.meta.title}</h1>
            <p role="alert" className="max-w-sm text-sm text-muted-foreground">{state.message}</p>
          </div>
        )}

        {state.kind === 'ready' && <DeckList grant={state.grant} missing={playing} onPlay={(s) => navigate(`/slides/m/${encodeURIComponent(slug)}/${encodeURIComponent(s)}`)} />}
      </main>
    </div>
  )
}

function DeckList({ grant, missing, onPlay }: { grant: ModuleGrant; missing: string | null; onPlay: (slug: string) => void }) {
  const { module, slides } = grant
  return (
    <>
      <p className="hud-label text-muted-foreground">{MODULE_LABEL[module.category]}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{module.title}</h1>
      {module.description && <p className="mt-3 max-w-2xl text-muted-foreground">{module.description}</p>}
      {missing && (
        <p role="alert" className="mt-4 text-sm text-muted-foreground">
          The deck <code className="font-mono text-foreground">{missing}</code> isn’t in this module any more. Pick one below.
        </p>
      )}

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="hud-label text-muted-foreground">{slides.length} {slides.length === 1 ? 'deck' : 'decks'}</h2>
        {slides.length > 0 && (
          <Button onClick={() => onPlay(slides[0].slug)}>
            <Play aria-hidden />
            Play from the start
          </Button>
        )}
      </div>

      {slides.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No decks are available yet.</p>
      ) : (
        <ol className="mt-3 flex flex-col gap-3">
          {slides.map((s, i) => (
            <li key={s.slug}>
              <button
                type="button"
                onClick={() => onPlay(s.slug)}
                className="group flex min-h-[72px] w-full items-center gap-4 rounded-lg border bg-card px-4 py-3 text-left outline-none transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="w-6 shrink-0 font-mono text-sm tabular-nums text-muted-foreground" aria-hidden>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="grid min-w-0 flex-1">
                  <span className="truncate font-medium">{s.title}</span>
                  <span className="truncate text-sm text-muted-foreground">
                    {FORMAT_LABEL[s.file_type]}
                    {s.page_count ? ` · ${s.page_count} slides` : ''}
                    {s.description ? ` · ${s.description}` : ''}
                  </span>
                </span>
                <Play className="size-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:scale-110" aria-hidden />
                <span className="sr-only">Play</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
