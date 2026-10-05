import { ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { actions } from '../../controller'
import { SERVICES } from '../../data/content'
import { PanelHeading } from './PanelHeading'

export function ServicesPanel() {
  return (
    <div className="flex flex-col gap-12">
      <PanelHeading
        eyebrow={`Services — ${String(SERVICES.length).padStart(2, '0')} disciplines`}
        title="How we can work together"
        description="From a single audit to a full platform build, with teaching folded in where it helps your team."
      />

      <ol className="grid gap-x-10 md:grid-cols-2">
        {SERVICES.map((s, i) => (
          <li key={s.title} data-stagger className="flex flex-col gap-3 border-t py-8">
            <span className="font-mono text-xs tracking-widest text-lantern">{String(i + 1).padStart(2, '0')}</span>
            <h3 className="text-2xl font-semibold tracking-tight uppercase md:text-3xl">{s.title}</h3>
            <p className="max-w-md leading-relaxed text-muted-foreground">{s.summary}</p>
            <ul className="mt-2 flex flex-col gap-1.5" aria-label={`${s.title} deliverables`}>
              {s.deliverables.map((d) => (
                <li key={d} className="hud-label text-foreground/80">
                  {d}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ol>

      <div data-stagger className="flex flex-col items-start gap-4 border-t pt-8 sm:flex-row sm:items-center sm:justify-between">
        <p className="hud-label text-muted-foreground">Currently taking on new projects</p>
        <Button size="lg" className="h-11 px-5" onClick={() => actions.openPanel('contact')}>
          Discuss a project
          <ArrowRight data-icon="inline-end" />
        </Button>
      </div>
    </div>
  )
}
