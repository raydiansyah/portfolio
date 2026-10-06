import type { Portfolio } from '@/types/supabase'
import { cn } from '@/lib/utils'
import { initials, tintHue } from './helpers'

/** Fixed 16:9 box (CLS 0): uploaded image, or a muted tint derived from the slug with initials. */
export function Thumbnail({ item, className }: { item: Pick<Portfolio, 'title' | 'slug' | 'thumbnail_url'>; className?: string }) {
  if (item.thumbnail_url) {
    return (
      <div className={cn('aspect-video w-full overflow-hidden bg-muted', className)}>
        <img src={item.thumbnail_url} alt="" loading="lazy" decoding="async" width={640} height={360} className="size-full object-cover" />
      </div>
    )
  }
  const hue = tintHue(item.slug || item.title)
  return (
    <div
      aria-hidden
      className={cn('grid aspect-video w-full place-items-center', className)}
      style={{ background: `color-mix(in oklch, var(--muted) 82%, oklch(0.62 0.07 ${hue}))` }}
    >
      <span className="font-mono text-2xl font-medium tracking-widest text-foreground/55">{initials(item.title || '?')}</span>
    </div>
  )
}
