import { useEffect, useRef } from 'react'
import { actions } from '../controller'
import { DESTINATIONS } from '../data/destinations'
import { telemetry, useHarbor } from '../store'
import type { Destination, DestinationId } from '../types'

/** Keyframes scoped to the label layer (entry fade + idle float). */
const KEYFRAMES = `
@keyframes harbor-label-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes harbor-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
`

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * World-anchored destination labels. Positions are written straight to the DOM
 * from a rAF loop (no React renders per frame); React only re-renders when a
 * tier or visibility-relevant phase changes.
 */
export default function HarborLabels() {
  const phase = useHarbor((s) => s.phase)
  const mapOpen = useHarbor((s) => s.mapOpen)
  const reducedMotion = useHarbor((s) => s.reducedMotion)
  const anchors = useRef<Partial<Record<DestinationId, HTMLDivElement | null>>>({})

  useEffect(() => {
    let raf = 0
    const tick = () => {
      for (const d of DESTINATIONS) {
        const el = anchors.current[d.id]
        if (!el) continue
        const a = telemetry.labels[d.id]
        if (!a || !a.visible) {
          el.style.visibility = 'hidden'
          continue
        }
        el.style.visibility = 'visible'
        el.style.transform = `translate3d(${a.x}px, ${a.y}px, 0) translate(-50%, -100%)`
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const hidden = phase === 'docking' || phase === 'panel' || mapOpen

  return (
    <div
      className={`pointer-events-none absolute inset-0 overflow-hidden transition-opacity duration-200 ${hidden ? 'opacity-0' : 'opacity-100'}`}
      inert={hidden}
      aria-hidden={hidden}
    >
      <style>{KEYFRAMES}</style>
      {DESTINATIONS.map((d) => (
        <div
          key={d.id}
          ref={(el) => {
            anchors.current[d.id] = el
          }}
          className="absolute top-0 left-0 will-change-transform"
          style={{ visibility: 'hidden' }}
        >
          <Label destination={d} reducedMotion={reducedMotion} suppressed={phase === 'project' && d.id === 'portfolio'} />
        </div>
      ))}
    </div>
  )
}

function Label({
  destination: d,
  reducedMotion,
  suppressed,
}: {
  destination: Destination
  reducedMotion: boolean
  suppressed: boolean
}) {
  const tier = useHarbor((s) => s.tiers[d.id])
  const touch = useHarbor((s) => s.inputDevice === 'touch')
  if (tier === 0 || suppressed) return null

  // Remount on tier change so the entry animation replays.
  const motion = reducedMotion
    ? undefined
    : { animation: 'harbor-label-in 200ms ease-out both, harbor-float 4s ease-in-out 200ms infinite' }

  return (
    <div key={tier} style={motion} className="flex flex-col items-center pb-2">
      {tier === 1 && (
        <div className="flex flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] tracking-[0.16em] text-hud-dim uppercase">{d.code}</span>
          <span className="block size-1.5 rounded-full border border-hud ring-2 ring-hud/20" />
        </div>
      )}

      {tier === 2 && (
        <div className="flex flex-col items-center text-center">
          <span className="hud-label text-hud-dim">{pad(d.index)}</span>
          <span className="mt-1 text-lg font-semibold tracking-tight text-hud uppercase md:text-xl">{d.label}</span>
          <span className="mt-0.5 max-w-[220px] text-xs text-hud-dim">{d.tagline}</span>
        </div>
      )}

      {tier === 3 && (
        <div className="w-[220px] rounded-md border border-border bg-panel p-4 text-left backdrop-blur-sm">
          <span className="hud-label text-hud-dim">{pad(d.index)} / 06</span>
          <h3 className="mt-2 text-lg font-semibold tracking-tight text-hud uppercase">{d.label}</h3>
          <p className="mt-1 text-xs leading-relaxed text-hud-dim">{d.tagline}</p>
          <button
            type="button"
            onClick={() => void actions.enter(d.id)}
            aria-label={`Enter ${d.label}`}
            className="pointer-events-auto mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-sm border border-hud/40 px-3 font-mono text-[11px] tracking-[0.18em] text-hud uppercase transition-colors hover:border-lantern hover:text-lantern focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Enter <span aria-hidden>→</span>
          </button>
          {!touch && <p className="mt-2 hidden font-mono text-[10px] text-hud-dim md:block">or press Enter</p>}
        </div>
      )}
    </div>
  )
}
