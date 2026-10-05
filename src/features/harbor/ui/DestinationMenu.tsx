import { ArrowRight, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { Dialog, DialogDescription, DialogOverlay, DialogPortal, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { actions } from '../controller'
import { DESTINATIONS } from '../data/destinations'
import { useHarbor } from '../store'
import type { DestinationId } from '../types'

const pad = (n: number) => String(n).padStart(2, '0')

function openDestination(id: DestinationId) {
  actions.openPanel(id === 'portfolio' ? 'portfolio-list' : id)
}

/** "Skip exploration" menu: jump straight into any section or set a course. */
export default function DestinationMenu() {
  const open = useHarbor((s) => s.menuOpen)

  return (
    <Dialog open={open} onOpenChange={(next) => actions.toggleMenu(next)}>
      <DialogPortal>
        <DialogOverlay className="bg-black/25 supports-backdrop-filter:backdrop-blur-none" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 flex max-h-[min(90dvh,820px)] w-[calc(100%-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-panel text-foreground backdrop-blur-md outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]"
        >
          <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b pr-2 pl-5 md:pl-10">
            <DialogTitle className="hud-label font-mono text-muted-foreground">Menu — Skip exploration</DialogTitle>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Close menu">
                <X />
              </Button>
            </DialogPrimitive.Close>
          </div>
          <DialogDescription className="sr-only">
            Open any section directly, or set a course and let the boat sail there.
          </DialogDescription>

          <ScrollArea className="min-h-0 flex-1">
            <nav aria-label="Destinations" className="px-5 py-4 md:px-10 md:py-6">
              <ol className="flex flex-col">
                {DESTINATIONS.map((d) => (
                  <li key={d.id} className="flex items-center gap-3 border-t first:border-t-0">
                    <button
                      type="button"
                      onClick={() => openDestination(d.id)}
                      className="group flex min-h-11 flex-1 items-baseline gap-4 rounded-sm py-5 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50 md:gap-6"
                    >
                      <span className="w-6 shrink-0 font-mono text-xs tracking-widest text-muted-foreground group-hover:text-lantern">
                        {pad(d.index)}
                      </span>
                      <span className="flex flex-col gap-1">
                        <span className="text-3xl leading-none font-semibold tracking-tight uppercase transition-colors group-hover:text-lantern md:text-5xl">
                          {d.label}
                        </span>
                        <span className="text-sm text-muted-foreground">{d.tagline}</span>
                      </span>
                    </button>
                    <Button
                      variant="ghost"
                      className="h-11 shrink-0 px-3 font-mono text-[11px] tracking-widest text-muted-foreground uppercase"
                      onClick={() => actions.navigateTo(d.id, true)}
                      aria-label={`Sail to ${d.label}`}
                    >
                      <span className="hidden sm:inline">Sail there</span>
                      <ArrowRight data-icon="inline-end" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ol>
            </nav>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
