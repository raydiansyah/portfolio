import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { actions } from '../controller'
import { DESTINATIONS, DESTINATION_BY_ID, WORLD_RADIUS, islandCentre } from '../data/destinations'
import { SECRETS } from '../data/discoveries'
import { telemetry, useHarbor } from '../store'
import type { DestinationId } from '../types'

const R = WORLD_RADIUS
const pad = (n: number) => String(n).padStart(2, '0')
/** World XZ -> percentage offsets inside the square map (north is up, so SVG y = -z). */
const pct = (x: number, z: number) => ({ left: `${((x + R) / (2 * R)) * 100}%`, top: `${((-z + R) / (2 * R)) * 100}%` })

/** Full world map dialog with destination picker and navigation actions. */
export default function WorldMap() {
  const open = useHarbor((s) => s.mapOpen)
  return (
    <Dialog open={open} onOpenChange={(o) => actions.toggleMap(o)}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-md border border-border bg-background p-5 ring-0 sm:max-w-[min(920px,calc(100%-2rem))] md:p-6">
        <DialogHeader className="gap-1">
          <DialogTitle className="text-lg font-semibold tracking-tight uppercase">World map</DialogTitle>
          <DialogDescription className="font-mono text-[11px] tracking-[0.14em] uppercase">
            Select a destination
          </DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so selection resets and the rAF loop stops on close. */}
        <MapBody />
      </DialogContent>
    </Dialog>
  )
}

function MapBody() {
  const discovered = useHarbor((s) => s.discovered)
  const secrets = useHarbor((s) => s.secrets)
  const waypoint = useHarbor((s) => s.waypoint)
  const nearestId = useHarbor((s) => s.nearest?.id ?? null)
  const [selected, setSelected] = useState<DestinationId | null>(waypoint ?? nearestId)

  const boatRef = useRef<SVGGElement>(null)
  const pathRef = useRef<SVGPolylineElement>(null)
  const buttons = useRef<(HTMLButtonElement | null)[]>([])

  // Live boat marker + waypoint path while the dialog is open.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      const { x, z, yaw } = telemetry.boat
      boatRef.current?.setAttribute('transform', `translate(${x} ${-z}) rotate(${(yaw * 180) / Math.PI})`)
      pathRef.current?.setAttribute('points', telemetry.path.map((p) => `${p.x},${-p.z}`).join(' '))
      raf = requestAnimationFrame(tick)
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])

  // Arrow keys cycle focus between destination markers.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? -1 : 0
    if (!step) return
    e.preventDefault()
    const current = buttons.current.findIndex((b) => b === document.activeElement)
    const n = DESTINATIONS.length
    buttons.current[(current + step + n) % n]?.focus()
  }

  const sel = selected ? DESTINATION_BY_ID[selected] : null

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1fr)_220px]">
      <div className="relative mx-auto aspect-square w-full max-w-[min(100%,68dvh)]" onKeyDown={onKeyDown}>
        <svg viewBox={`${-R} ${-R} ${2 * R} ${2 * R}`} className="absolute inset-0 size-full text-foreground" aria-hidden>
          <circle r={R - 1} fill="none" stroke="currentColor" strokeOpacity={0.18} strokeWidth={1} />
          <circle r={R * 0.5} fill="none" stroke="currentColor" strokeOpacity={0.07} strokeDasharray="2 6" />
          <line x1={0} y1={-R} x2={0} y2={-R + 10} stroke="currentColor" strokeOpacity={0.4} />
          <text x={0} y={-R + 22} textAnchor="middle" fontSize={9} className="fill-current font-mono" opacity={0.5}>
            N
          </text>

          {DESTINATIONS.map((d) => {
            const c = islandCentre(d)
            return <circle key={d.id} cx={c.x} cy={-c.z} r={d.islandRadius} fill="currentColor" fillOpacity={0.08} />
          })}

          {SECRETS.filter((s) => secrets.includes(s.id)).map((s) => (
            <rect key={s.id} x={s.position.x - 2} y={-s.position.z - 2} width={4} height={4} fill="var(--lantern)" opacity={0.8} />
          ))}

          <polyline
            ref={pathRef}
            fill="none"
            stroke="var(--lantern)"
            strokeWidth={1.25}
            strokeDasharray="4 4"
            vectorEffect="non-scaling-stroke"
          />

          <g ref={boatRef}>
            <path d="M0 -7 L5 5 L0 2.5 L-5 5 Z" fill="currentColor" />
            <text y={18} textAnchor="middle" fontSize={8} className="fill-current font-mono" opacity={0.7}>
              YOU
            </text>
          </g>
        </svg>

        {DESTINATIONS.map((d, i) => {
          const known = discovered.includes(d.id)
          const active = selected === d.id
          return (
            <button
              key={d.id}
              ref={(el) => {
                buttons.current[i] = el
              }}
              type="button"
              onClick={() => setSelected(d.id)}
              aria-pressed={active}
              aria-label={`${pad(d.index)} ${d.label}${known ? '' : ' (not yet discovered)'}`}
              className={`group absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${known ? '' : 'opacity-55'}`}
              style={pct(d.dock.x, d.dock.z)}
            >
              <span
                className={`block size-2.5 rounded-full border ${active ? 'border-lantern bg-lantern' : 'border-foreground bg-background'} ${known ? '' : 'border-dashed'}`}
              />
              <span className="pointer-events-none absolute top-[calc(50%+10px)] left-1/2 flex -translate-x-1/2 items-baseline gap-1 whitespace-nowrap">
                <span className="font-mono text-[9px] text-muted-foreground">{pad(d.index)}</span>
                <span className={`text-[11px] font-semibold tracking-wide uppercase ${active ? 'text-lantern' : 'text-foreground'}`}>
                  {d.label}
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <aside className="flex flex-col gap-3 border-t border-border pt-4 md:border-t-0 md:border-l md:pt-0 md:pl-5">
        {sel ? (
          <>
            <div>
              <p className="hud-label text-muted-foreground">{pad(sel.index)} / 06</p>
              <h3 className="mt-1 text-xl font-semibold tracking-tight uppercase">{sel.label}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{sel.tagline}</p>
            </div>
            <ActionButton primary onClick={() => actions.navigateTo(sel.id, true)}>
              Auto navigate
            </ActionButton>
            <ActionButton onClick={() => actions.navigateTo(sel.id, false)}>Set waypoint only</ActionButton>
            <ActionButton onClick={() => actions.openPanel(sel.id === 'portfolio' ? 'portfolio-list' : sel.id)}>
              Open directly
            </ActionButton>
          </>
        ) : (
          <p className="text-xs text-muted-foreground">Choose a harbor on the map to plot a course.</p>
        )}
        {waypoint && (
          <ActionButton onClick={() => actions.clearWaypoint()}>
            Clear waypoint · {DESTINATION_BY_ID[waypoint].label}
          </ActionButton>
        )}
      </aside>
    </div>
  )
}

function ActionButton({ primary, onClick, children }: { primary?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-11 items-center justify-between rounded-sm border px-3 font-mono text-[11px] tracking-[0.14em] uppercase transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
        primary
          ? 'border-foreground bg-foreground text-background hover:bg-foreground/85'
          : 'border-border text-foreground hover:border-foreground/40'
      }`}
    >
      {children}
    </button>
  )
}
