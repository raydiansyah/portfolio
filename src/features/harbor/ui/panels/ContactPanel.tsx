import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PROFILE } from '../../data/content'
import { ContactForm } from './ContactForm'
import { PanelHeading } from './PanelHeading'

type CopyState = 'idle' | 'copied' | 'failed'

const LINKS = [
  { label: 'GitHub', href: PROFILE.links.github },
  { label: 'LinkedIn', href: PROFILE.links.linkedin },
]

export function ContactPanel() {
  const [copy, setCopy] = useState<CopyState>('idle')

  // Reset the confirmation after a short moment.
  useEffect(() => {
    if (copy === 'idle') return
    const t = window.setTimeout(() => setCopy('idle'), 2400)
    return () => window.clearTimeout(t)
  }, [copy])

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(PROFILE.email)
      setCopy('copied')
    } catch {
      setCopy('failed')
    }
  }

  return (
    <div className="flex flex-col gap-12">
      <PanelHeading
        eyebrow={`Contact — ${PROFILE.available ? 'Available for new work' : 'Currently booked'}`}
        title="Send a message ashore"
        description="Projects, training sessions or a second opinion on your stack. Write below or email me directly — replies come by email."
      />

      <section data-stagger aria-labelledby="contact-form" className="flex flex-col gap-4 border-t pt-8">
        <h3 id="contact-form" className="hud-label text-muted-foreground">
          Message
        </h3>
        <ContactForm />
      </section>

      <section data-stagger aria-labelledby="contact-email" className="flex flex-col gap-4 border-t pt-8">
        <h3 id="contact-email" className="hud-label text-muted-foreground">
          Email
        </h3>
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-6">
          <a
            href={`mailto:${PROFILE.email}`}
            className="rounded-sm text-2xl font-semibold tracking-tight break-all underline decoration-border decoration-1 underline-offset-8 outline-none hover:decoration-lantern focus-visible:ring-3 focus-visible:ring-ring/50 md:text-4xl"
          >
            {PROFILE.email}
          </a>
          <Button variant="outline" className="h-11 px-4" onClick={copyEmail}>
            {copy === 'copied' ? <Check data-icon="inline-start" /> : <Copy data-icon="inline-start" />}
            {copy === 'copied' ? 'Copied' : 'Copy email'}
          </Button>
        </div>
        <p aria-live="polite" className="hud-label min-h-4 text-muted-foreground">
          {copy === 'copied' && 'Email address copied to clipboard'}
          {copy === 'failed' && 'Could not copy — select the address instead'}
        </p>
      </section>

      <dl data-stagger className="grid gap-8 border-t pt-8 sm:grid-cols-3">
        <div>
          <dt className="hud-label text-muted-foreground">Location</dt>
          <dd className="mt-2">{PROFILE.location}</dd>
        </div>
        <div>
          <dt className="hud-label text-muted-foreground">Availability</dt>
          <dd className="mt-2 flex items-center gap-2">
            <span
              aria-hidden="true"
              className={PROFILE.available ? 'size-1.5 rounded-full bg-lantern' : 'size-1.5 rounded-full bg-muted-foreground'}
            />
            {PROFILE.available ? 'Open to projects & training' : 'Booked — enquiries welcome'}
          </dd>
        </div>
        <div>
          <dt className="hud-label text-muted-foreground">Elsewhere</dt>
          <dd className="mt-1">
            <ul className="flex flex-col">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-sm outline-none hover:text-lantern focus-visible:ring-3 focus-visible:ring-ring/50"
                  >
                    {l.label}
                    <ArrowUpRight aria-hidden="true" className="size-4" />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </div>
  )
}
