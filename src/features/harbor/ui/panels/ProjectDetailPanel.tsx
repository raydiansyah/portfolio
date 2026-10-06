import { ArrowLeft, ArrowRight, ArrowUpRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { actions } from '../../controller'
import { PROJECTS } from '../../data/content'
import { useHarbor } from '../../store'
import { PanelHeading, SectionLabel } from './PanelHeading'
import { ProjectThumb } from './ProjectThumb'

const wrap = (i: number) => (i + PROJECTS.length) % PROJECTS.length

export function ProjectDetailPanel() {
  const raw = useHarbor((s) => s.projectIndex)
  const index = Math.min(Math.max(raw, 0), PROJECTS.length - 1)
  const project = PROJECTS[index]
  const prev = PROJECTS[wrap(index - 1)]
  const next = PROJECTS[wrap(index + 1)]

  return (
    <div className="flex flex-col gap-12">
      <PanelHeading
        eyebrow={`${project.category} — ${project.year}`}
        title={project.title}
        description={project.description}
      />

      <div data-stagger>
        <ProjectThumb project={project} index={index} size="lg" className="aspect-[16/9] w-full md:aspect-[21/9]" />
      </div>

      <div data-stagger className="grid gap-10 md:grid-cols-12">
        {project.role && (
        <section aria-labelledby="pd-role" className="md:col-span-4">
          <SectionLabel id="pd-role">Role</SectionLabel>
          <p className="mt-3 leading-relaxed">{project.role}</p>
        </section>
        )}
        {project.highlights.length > 0 && (
        <section aria-labelledby="pd-highlights" className="md:col-span-5">
          <SectionLabel id="pd-highlights">Highlights</SectionLabel>
          <ul className="mt-3 flex flex-col">
            {project.highlights.map((h) => (
              <li key={h} className="flex gap-3 border-t py-2.5 first:border-t-0 first:pt-0">
                <span aria-hidden="true" className="mt-2.5 h-px w-3 shrink-0 bg-lantern" />
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </section>
        )}
        <section aria-labelledby="pd-stack" className="md:col-span-3">
          <SectionLabel id="pd-stack">Stack</SectionLabel>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {project.stack.map((s) => (
              <li key={s}>
                <Badge variant="outline" className="h-7 rounded-sm px-2.5 font-mono text-[10px] tracking-wider uppercase">
                  {s}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div data-stagger className="flex flex-col gap-6 border-t pt-8">
        {(project.liveUrl || project.repoUrl) && (
          <div className="flex flex-wrap gap-3">
            {project.liveUrl && (
              <Button asChild className="h-11 px-5">
                <a href={project.liveUrl} target="_blank" rel="noreferrer">
                  Live demo
                  <ArrowUpRight data-icon="inline-end" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            )}
            {project.repoUrl && (
              <Button asChild variant={project.liveUrl ? 'outline' : 'default'} className="h-11 px-5">
                <a href={project.repoUrl} target="_blank" rel="noreferrer">
                  GitHub
                  <ArrowUpRight data-icon="inline-end" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </Button>
            )}
          </div>
        )}

        <nav aria-label="Project navigation" className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" className="h-11 px-3" onClick={() => actions.openPanel('portfolio-list')}>
            <ArrowLeft data-icon="inline-start" />
            All projects
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-11 px-3"
              onClick={() => actions.viewProject(wrap(index - 1))}
              aria-label={`Previous project: ${prev.title}`}
            >
              <ArrowLeft data-icon="inline-start" />
              <span className="hidden sm:inline">Prev</span>
            </Button>
            <Button
              variant="outline"
              className="h-11 px-3"
              onClick={() => actions.viewProject(wrap(index + 1))}
              aria-label={`Next project: ${next.title}`}
            >
              <span className="hidden sm:inline">Next</span>
              <ArrowRight data-icon="inline-end" />
            </Button>
          </div>
        </nav>
      </div>
    </div>
  )
}
