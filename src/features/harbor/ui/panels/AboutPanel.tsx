import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ABOUT, PROFILE } from '../../data/content'
import { PanelHeading, SectionLabel } from './PanelHeading'

export function AboutPanel() {
  const years = new Date().getFullYear() - PROFILE.startYear

  return (
    <div className="flex flex-col gap-12">
      <PanelHeading
        eyebrow={`${PROFILE.name} — ${PROFILE.role}`}
        title={ABOUT.heading}
        description={`${years}+ years building for the web, supporting systems and teaching others to code.`}
      />

      <div className="grid gap-10 md:grid-cols-12">
        <div data-stagger className="flex flex-col gap-5 text-base leading-relaxed md:col-span-7">
          {ABOUT.paragraphs.map((p) => (
            <p key={p.slice(0, 24)}>{p}</p>
          ))}
        </div>

        <dl data-stagger className="grid grid-cols-2 gap-x-6 gap-y-6 self-start md:col-span-4 md:col-start-9 md:grid-cols-1">
          {ABOUT.facts.map((f) => (
            <div key={f.label} className="border-t pt-3">
              <dt className="hud-label text-muted-foreground">{f.label}</dt>
              <dd className="mt-1.5 text-sm">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <Separator />

      <section data-stagger aria-labelledby="about-stack">
        <SectionLabel id="about-stack">Working stack</SectionLabel>
        <ul className="mt-4 flex flex-wrap gap-2">
          {ABOUT.stack.map((s) => (
            <li key={s}>
              <Badge variant="outline" className="h-7 rounded-sm px-2.5 font-mono text-[11px] tracking-wider uppercase">
                {s}
              </Badge>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
