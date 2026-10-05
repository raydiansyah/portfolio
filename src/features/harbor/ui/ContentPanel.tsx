import { useRef, useState } from 'react'
import type { ComponentType } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { Dialog, DialogOverlay, DialogPortal } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { actions } from '../controller'
import { PROJECTS } from '../data/content'
import { DESTINATIONS, DESTINATION_BY_ID } from '../data/destinations'
import { useHarbor } from '../store'
import type { PanelId } from '../types'
import { AboutPanel } from './panels/AboutPanel'
import { ContactPanel } from './panels/ContactPanel'
import { ExperiencePanel } from './panels/ExperiencePanel'
import { PortfolioListPanel } from './panels/PortfolioListPanel'
import { ProjectDetailPanel } from './panels/ProjectDetailPanel'
import { ProjectsPanel } from './panels/ProjectsPanel'
import { ServicesPanel } from './panels/ServicesPanel'

gsap.registerPlugin(useGSAP)

const PANELS: Record<PanelId, ComponentType> = {
  portfolio: PortfolioListPanel,
  'portfolio-list': PortfolioListPanel,
  projects: ProjectsPanel,
  about: AboutPanel,
  experience: ExperiencePanel,
  services: ServicesPanel,
  contact: ContactPanel,
  'project-detail': ProjectDetailPanel,
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Mono header metadata, e.g. `03 / 06 — ABOUT` or `PROJECT 02 / 07 — LSP TIK`. */
function metaFor(panel: PanelId, projectIndex: number) {
  if (panel === 'project-detail') {
    const p = PROJECTS[projectIndex]
    return `Project ${pad(projectIndex + 1)} / ${pad(PROJECTS.length)} — ${p?.title ?? ''}`
  }
  const d = DESTINATION_BY_ID[panel === 'portfolio-list' ? 'portfolio' : panel]
  return `${pad(d.index)} / ${pad(DESTINATIONS.length)} — ${d.label}`
}

/** Scrollable body; mounts with the dialog content so GSAP sees real nodes. */
function PanelBody({ panel, projectIndex }: { panel: PanelId; projectIndex: number }) {
  const scope = useRef<HTMLDivElement>(null)
  const reducedMotion = useHarbor((s) => s.reducedMotion)
  const Panel = PANELS[panel]

  useGSAP(
    () => {
      // DOM order already matches title -> description -> content -> CTA.
      const items = gsap.utils.toArray<HTMLElement>('[data-stagger]', scope.current)
      if (!items.length) return
      if (reducedMotion) {
        gsap.from(items, { opacity: 0, duration: 0.15, ease: 'none' })
      } else {
        gsap.from(items, { y: 16, opacity: 0, duration: 0.6, stagger: 0.06, ease: 'power3.out' })
      }
    },
    { scope, dependencies: [panel, projectIndex, reducedMotion] },
  )

  return (
    <ScrollArea className="min-h-0 flex-1">
      <div ref={scope} className="px-5 pt-8 pb-14 md:px-12 md:pt-12 md:pb-20">
        <Panel />
      </div>
    </ScrollArea>
  )
}

export default function ContentPanel() {
  const active = useHarbor((s) => s.activePanel)
  const projectIndex = useHarbor((s) => s.projectIndex)
  // Keep rendering the last panel while the close animation plays.
  const [shown, setShown] = useState<PanelId | null>(active)
  if (active !== null && active !== shown) setShown(active)

  return (
    <Dialog open={active !== null} onOpenChange={(open) => !open && actions.closePanel()}>
      <DialogPortal>
        {/* Light scrim, no blur: the world stays visible behind the panel. */}
        <DialogOverlay className="bg-black/25 supports-backdrop-filter:backdrop-blur-none" />
        <DialogPrimitive.Content
          data-slot="dialog-content"
          className="fixed top-1/2 left-1/2 z-50 flex h-[min(86dvh,860px)] w-[calc(100%-2rem)] max-w-5xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg border bg-panel text-foreground backdrop-blur-md outline-none data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]"
        >
          {shown && (
            <>
              <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b pr-2 pl-5 md:pl-12">
                <p className="hud-label truncate text-muted-foreground">{metaFor(shown, projectIndex)}</p>
                <DialogPrimitive.Close asChild>
                  <Button variant="ghost" size="icon" className="size-11" aria-label="Close panel">
                    <X />
                  </Button>
                </DialogPrimitive.Close>
              </div>
              <PanelBody key={`${shown}-${projectIndex}`} panel={shown} projectIndex={projectIndex} />
            </>
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
