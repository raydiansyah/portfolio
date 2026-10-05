import type { CSSProperties } from 'react'
import type { Project } from '../../data/content'
import { cn } from '@/lib/utils'

interface ProjectThumbProps {
  project: Project
  /** Zero-based position in PROJECTS; rendered as a two-digit plate number. */
  index: number
  size?: 'sm' | 'lg'
  className?: string
}

/**
 * Generated, decorative project plate: a muted two-tone wash with fine
 * diagonal hatching and faint contour rings (chart-like), plus a mono number.
 */
export function ProjectThumb({ project, index, size = 'sm', className }: ProjectThumbProps) {
  const [base, accent] = project.tint
  const style: CSSProperties = {
    backgroundColor: base,
    backgroundImage: [
      // Fine diagonal hatching.
      'repeating-linear-gradient(135deg, rgb(255 255 255 / 0.05) 0 1px, transparent 1px 9px)',
      // Contour rings, offset toward the upper right.
      `repeating-radial-gradient(circle at 78% 22%, color-mix(in oklch, ${accent} 22%, transparent) 0 1px, transparent 1px 22px)`,
      // Subtle tonal wash from base into the accent.
      `linear-gradient(160deg, ${base} 35%, color-mix(in oklch, ${base} 70%, ${accent}) 100%)`,
    ].join(', '),
  }
  const initials = project.title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()

  return (
    <div
      aria-hidden="true"
      style={style}
      className={cn('relative overflow-hidden rounded-md ring-1 ring-foreground/10 ring-inset', className)}
    >
      <span
        className={cn(
          'absolute bottom-3 left-4 font-mono leading-none font-medium tracking-tighter text-white/80',
          size === 'lg' ? 'text-6xl md:text-8xl' : 'text-5xl',
        )}
      >
        {String(index + 1).padStart(2, '0')}
      </span>
      <span className="absolute top-3 right-4 font-mono text-[11px] tracking-[0.18em] text-white/60 uppercase">
        {initials} — {project.year}
      </span>
    </div>
  )
}
