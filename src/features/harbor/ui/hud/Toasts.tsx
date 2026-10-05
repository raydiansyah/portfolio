import { useEffect } from 'react'
import { X } from 'lucide-react'
import { harborStore, useHarbor } from '../../store'
import type { DestinationId } from '../../types'
import { DESTINATION_BY_ID } from '../../data/destinations'
import { SECRETS } from '../../data/discoveries'

const SECRET_MS = 7000

function useAutoDismiss(key: number) {
  useEffect(() => {
    const t = window.setTimeout(() => harborStore.dismissToast(key), SECRET_MS)
    return () => window.clearTimeout(t)
  }, [key])
}

function SecretCard({ toastKey, id, reducedMotion }: { toastKey: number; id: string; reducedMotion: boolean }) {
  useAutoDismiss(toastKey)
  const secret = SECRETS.find((s) => s.id === id)
  if (!secret) return null
  return (
    <div
      className={`pointer-events-auto relative w-[min(26rem,calc(100vw-2.5rem))] rounded-md border border-hud/15 bg-panel px-5 py-4 backdrop-blur-sm ${
        reducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-1 duration-500'
      }`}
    >
      <p className="hud-label pr-8 text-lantern">Discovered — {secret.label}</p>
      <p className="mt-2 text-base font-semibold tracking-tight text-hud">{secret.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-hud-dim">{secret.body}</p>
      <button
        type="button"
        onClick={() => harborStore.dismissToast(toastKey)}
        aria-label="Dismiss"
        className="absolute top-1.5 right-1.5 inline-flex size-9 items-center justify-center rounded-md text-hud-dim outline-none hover:text-hud focus-visible:ring-2 focus-visible:ring-ring/60"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  )
}

/** Screen-reader-only announcement for harbor discoveries (visual cue lives in DiscoveryProgress). */
function DiscoveredAnnouncement({ toastKey, id }: { toastKey: number; id: DestinationId }) {
  useAutoDismiss(toastKey)
  const label = DESTINATION_BY_ID[id]?.label ?? id
  return <p className="sr-only">Discovered {label} harbor</p>
}

export function Toasts() {
  const toasts = useHarbor((s) => s.toasts)
  const reducedMotion = useHarbor((s) => s.reducedMotion)

  return (
    <div
      aria-live="polite"
      className="pointer-events-none absolute inset-x-0 bottom-24 flex flex-col items-center gap-2 px-5 md:bottom-28"
    >
      {toasts.map((t) => {
        if (t.kind === 'secret')
          return <SecretCard key={t.key} toastKey={t.key} id={t.id} reducedMotion={reducedMotion} />
        if (t.kind === 'discovered') return <DiscoveredAnnouncement key={t.key} toastKey={t.key} id={t.id} />
        return null
      })}
    </div>
  )
}
