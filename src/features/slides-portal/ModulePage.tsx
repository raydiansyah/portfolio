import { Anchor, ArrowRight, FileQuestion, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { getPublicModule } from '@/features/admin/data/modules'
import type { PublicModule } from '@/types/supabase'
import { ThemeToggle } from './ThemeToggle'
import { MODULE_LABEL } from './types'

const FORMAT_LABEL = { html: 'HTML', pdf: 'PDF', ppt: 'PPT' } as const

/**
 * Public module page (/slides/m/<slug>): the ordered decks of a course,
 * engagement or workshop. Each deck still opens through its own access gate.
 */
export function ModulePage({ slug, onOpen }: { slug: string; onOpen: (slideSlug: string) => void }) {
  const [state, setState] = useState<{ status: 'loading' } | { status: 'missing' } | { status: 'ready'; data: PublicModule }>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    void getPublicModule(slug).then((data) => alive && setState(data ? { status: 'ready', data } : { status: 'missing' }))
    return () => {
      alive = false
    }
  }, [slug])

  useEffect(() => {
    if (state.status === 'ready') document.title = `${state.data.module.title} — Slides`
    if (state.status === 'missing') document.title = 'Module not found — Slides'
  }, [state])

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
        {state.status === 'loading' && (
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

        {state.status === 'missing' && (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <FileQuestion className="size-10 text-muted-foreground" aria-hidden />
            <h1 className="text-xl font-semibold">Module not found</h1>
            <p className="max-w-sm text-sm text-muted-foreground">
              No published module matches <code className="font-mono text-foreground">{slug}</code>. Check the link with your presenter.
            </p>
          </div>
        )}

        {state.status === 'ready' && (
          <>
            <p className="hud-label text-muted-foreground">{MODULE_LABEL[state.data.module.category]}</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">{state.data.module.title}</h1>
            {state.data.module.description && <p className="mt-3 max-w-2xl text-muted-foreground">{state.data.module.description}</p>}

            <h2 className="hud-label mt-10 text-muted-foreground">{state.data.slides.length} decks</h2>
            {state.data.slides.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No decks are available yet.</p>
            ) : (
              <ol className="mt-3 flex flex-col gap-3">
                {state.data.slides.map((s, i) => (
                  <li key={s.slug}>
                    <a
                      href={`/slides/${s.slug}`}
                      onClick={(e) => {
                        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
                        e.preventDefault()
                        onOpen(s.slug)
                      }}
                      className="group flex min-h-[72px] items-center gap-4 rounded-lg border bg-card px-4 py-3 outline-none transition-colors hover:border-foreground/30 focus-visible:ring-3 focus-visible:ring-ring/50"
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
                      {s.is_protected && (
                        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                          <Lock className="size-3.5" aria-hidden />
                          <span>Code</span>
                        </span>
                      )}
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform motion-safe:group-hover:translate-x-0.5" aria-hidden />
                    </a>
                  </li>
                ))}
              </ol>
            )}
          </>
        )}
      </main>
    </div>
  )
}
