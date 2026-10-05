import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { actions } from '../../controller'
import { PROJECTS } from '../../data/content'
import { PanelHeading } from './PanelHeading'

const ALL = 'All'
const CATEGORIES = [ALL, ...new Set(PROJECTS.map((p) => p.category))]

export function ProjectsPanel() {
  const [category, setCategory] = useState(ALL)
  // Keep the original PROJECTS index so detail navigation stays stable.
  const items = PROJECTS.map((p, index) => ({ p, index })).filter(
    ({ p }) => category === ALL || p.category === category,
  )

  return (
    <div className="flex flex-col gap-10">
      <PanelHeading
        eyebrow={`Archive — ${String(PROJECTS.length).padStart(2, '0')} entries`}
        title="The full archive"
        description="Client platforms, side projects, open source and training material, newest first."
      />

      <div data-stagger role="group" aria-label="Filter by category" className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => {
          const active = c === category
          return (
            <button
              key={c}
              type="button"
              aria-pressed={active}
              onClick={() => setCategory(c)}
              className={cn(
                'h-11 rounded-md border px-3.5 font-mono text-[11px] tracking-widest uppercase transition-colors outline-none',
                'focus-visible:ring-3 focus-visible:ring-ring/50',
                active
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground',
              )}
            >
              {c}
            </button>
          )
        })}
      </div>

      <p aria-live="polite" className="sr-only">
        {items.length} {items.length === 1 ? 'project' : 'projects'} shown
      </p>

      <ul className="flex flex-col border-b">
        {items.map(({ p, index }) => (
          <li key={p.id} data-stagger className="border-t">
            <button
              type="button"
              onClick={() => actions.viewProject(index)}
              className="group grid min-h-11 w-full grid-cols-[2.5rem_1fr_auto] items-start gap-4 rounded-sm py-6 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:grid-cols-[3rem_1fr_14rem_4rem_auto] md:items-center"
            >
              <span className="font-mono text-xs tracking-widest text-muted-foreground">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="flex flex-col gap-1">
                <span className="text-xl font-semibold tracking-tight uppercase transition-colors group-hover:text-lantern md:text-2xl">
                  {p.title}
                </span>
                <span className="text-sm text-muted-foreground">{p.summary}</span>
                <span className="hud-label mt-1 text-muted-foreground md:hidden">
                  {p.category} — {p.year}
                </span>
              </span>
              <span className="hud-label hidden text-muted-foreground md:block">{p.category}</span>
              <span className="hidden font-mono text-xs text-muted-foreground md:block">{p.year}</span>
              <ArrowUpRight
                aria-hidden="true"
                className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-foreground"
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
