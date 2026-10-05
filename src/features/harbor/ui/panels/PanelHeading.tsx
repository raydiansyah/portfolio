import type { ReactNode } from 'react'
import { DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface PanelHeadingProps {
  /** Small mono metadata line above the title. */
  eyebrow?: string
  title: string
  description: string
  /** Keep the description for screen readers only. */
  hideDescription?: boolean
}

/** Shared editorial heading: the panel's accessible title (h2) and description. */
export function PanelHeading({ eyebrow, title, description, hideDescription = false }: PanelHeadingProps) {
  return (
    <header className="max-w-3xl">
      {eyebrow && (
        <p data-stagger className="hud-label text-muted-foreground">
          {eyebrow}
        </p>
      )}
      <DialogTitle
        data-stagger
        className="mt-4 font-sans text-4xl leading-[0.95] font-semibold tracking-tight text-balance uppercase md:text-6xl"
      >
        {title}
      </DialogTitle>
      <DialogDescription
        data-stagger={hideDescription ? undefined : true}
        className={cn(
          'mt-5 max-w-2xl text-base leading-relaxed text-muted-foreground md:text-lg',
          hideDescription && 'sr-only',
        )}
      >
        {description}
      </DialogDescription>
    </header>
  )
}

/** Small uppercase technical label used for section captions inside panels. */
export function SectionLabel({ children, id, className }: { children: ReactNode; id?: string; className?: string }) {
  return (
    <h3 id={id} className={cn('hud-label text-muted-foreground', className)}>
      {children}
    </h3>
  )
}
