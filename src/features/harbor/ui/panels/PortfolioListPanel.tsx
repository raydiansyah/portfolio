import { ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { actions } from '../../controller'
import { FEATURED_PROJECTS, PROJECTS } from '../../data/content'
import { PanelHeading } from './PanelHeading'
import { ProjectThumb } from './ProjectThumb'

const years = FEATURED_PROJECTS.map((p) => Number(p.year))
const RANGE = `${Math.min(...years)} — ${Math.max(...years)}`

export function PortfolioListPanel() {
  return (
    <div className="flex flex-col gap-12">
      <PanelHeading
        eyebrow={`Selected work — ${RANGE}`}
        title="A collection of selected work"
        description="Four platforms built end to end: learning, certification, commerce and multi-tenant SaaS."
      />

      <ul className="grid gap-x-10 gap-y-14 md:grid-cols-2">
        {FEATURED_PROJECTS.map((p) => {
          const index = PROJECTS.indexOf(p)
          const titleId = `portfolio-${p.id}`
          return (
            <li key={p.id} data-stagger>
              <article aria-labelledby={titleId} className="flex h-full flex-col">
                <ProjectThumb project={p} index={index} className="aspect-[16/10] w-full" />
                <p className="hud-label mt-5 text-muted-foreground">
                  {p.category} — {p.year}
                </p>
                <h3 id={titleId} className="mt-2 text-2xl font-semibold tracking-tight uppercase md:text-3xl">
                  {p.title}
                </h3>
                <p className="mt-3 max-w-md leading-relaxed text-muted-foreground">{p.summary}</p>
                <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Tech stack">
                  {p.stack.map((s) => (
                    <li key={s}>
                      <Badge variant="outline" className="rounded-sm font-mono text-[10px] tracking-wider uppercase">
                        {s}
                      </Badge>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <Button
                    variant="outline"
                    className="h-11 px-4"
                    onClick={() => actions.viewProject(index)}
                    aria-label={`View project: ${p.title}`}
                  >
                    View project
                    <ArrowRight data-icon="inline-end" />
                  </Button>
                </div>
              </article>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
