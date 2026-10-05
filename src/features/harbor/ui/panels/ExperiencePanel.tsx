import { EXPERIENCE, PROFILE } from '../../data/content'
import { PanelHeading } from './PanelHeading'

export function ExperiencePanel() {
  return (
    <div className="flex flex-col gap-12">
      <PanelHeading
        eyebrow={`Logbook — ${PROFILE.startYear} — Now`}
        title="Where I have worked and taught"
        description="Engineering, training and keeping systems afloat — in roughly that order of time spent."
      />

      <ol className="flex flex-col">
        {EXPERIENCE.map((item) => (
          <li
            key={`${item.role}-${item.period}`}
            data-stagger
            className="grid gap-3 border-t py-8 md:grid-cols-12 md:gap-8"
          >
            <div className="flex flex-col gap-1 md:col-span-3">
              <p className="font-mono text-xs tracking-widest text-foreground uppercase">{item.period}</p>
              <p className="hud-label text-muted-foreground">{item.location}</p>
            </div>
            <div className="md:col-span-9">
              <h3 className="text-2xl font-semibold tracking-tight uppercase md:text-3xl">{item.role}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.org}</p>
              <p className="mt-4 max-w-2xl leading-relaxed">{item.summary}</p>
              <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1" aria-label="Tools and focus">
                {item.stack.map((s) => (
                  <li key={s} className="hud-label text-muted-foreground">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
