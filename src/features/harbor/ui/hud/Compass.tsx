import { useEffect, useRef } from 'react'
import { harborStore, telemetry } from '../../store'
import { DESTINATIONS, DESTINATION_BY_ID } from '../../data/destinations'
import type { Destination } from '../../types'

const WIDTH = 220
const PX_PER_DEG = 1.2 // ±~92° visible on the tape
const CARDINALS: Record<number, string> = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SW', 270: 'W', 315: 'NW' }

/** Tape marks from -180° to 540° so the strip can scroll without wrapping gaps. */
const MARKS = Array.from({ length: 49 }, (_, i) => -180 + i * 15)

const toDeg = (rad: number) => (rad * 180) / Math.PI
const wrap360 = (deg: number) => ((deg % 360) + 360) % 360
const wrap180 = (deg: number) => wrap360(deg + 180) - 180

/** Waypoint target, otherwise the nearest undiscovered harbor. */
function pickTarget(bx: number, bz: number): Destination | null {
  const { waypoint, discovered } = harborStore.get()
  if (waypoint) return DESTINATION_BY_ID[waypoint]
  let best: Destination | null = null
  let bestDist = Infinity
  for (const d of DESTINATIONS) {
    if (discovered.includes(d.id)) continue
    const dist = Math.hypot(d.dock.x - bx, d.dock.z - bz)
    if (dist < bestDist) {
      bestDist = dist
      best = d
    }
  }
  return best
}

export function Compass() {
  const stripRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<HTMLDivElement>(null)
  const readoutRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let lastText = ''
    let lastHeading = -1

    const tick = () => {
      raf = requestAnimationFrame(tick)
      const { x, z, yaw } = telemetry.boat
      const heading = wrap360(toDeg(yaw))

      if (stripRef.current) {
        const offset = WIDTH / 2 - (heading + 180) * PX_PER_DEG
        stripRef.current.style.transform = `translate3d(${offset.toFixed(1)}px,0,0)`
      }
      const rounded = Math.round(heading) % 360
      if (readoutRef.current && rounded !== lastHeading) {
        lastHeading = rounded
        readoutRef.current.textContent = String(rounded).padStart(3, '0')
      }

      const marker = markerRef.current
      if (!marker) return
      const target = pickTarget(x, z)
      if (!target) {
        marker.style.opacity = '0'
        return
      }
      const bearing = toDeg(Math.atan2(target.dock.x - x, target.dock.z - z))
      const rel = wrap180(bearing - heading)
      const name = target.label.toUpperCase()
      let text: string
      let transform: string
      if (Math.abs(rel) <= 90) {
        text = `▾ ${name}`
        transform = `translate3d(${(WIDTH / 2 + rel * PX_PER_DEG).toFixed(1)}px,0,0) translateX(-50%)`
      } else if (rel < 0) {
        text = `‹ ${name}`
        transform = 'translate3d(0,0,0)'
      } else {
        text = `${name} ›`
        transform = `translate3d(${WIDTH}px,0,0) translateX(-100%)`
      }
      marker.style.opacity = '1'
      marker.style.transform = transform
      if (text !== lastText) {
        lastText = text
        marker.textContent = text
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="flex flex-col items-center gap-1 text-hud-dim" aria-hidden="true">
      <span ref={readoutRef} className="font-mono text-[10px] tabular-nums text-hud">
        000
      </span>
      <div
        className="relative h-6 overflow-hidden"
        style={{
          width: WIDTH,
          maskImage: 'linear-gradient(to right, transparent, black 18%, black 82%, transparent)',
        }}
      >
        <div ref={stripRef} className="absolute inset-y-0 left-0 will-change-transform">
          {MARKS.map((deg) => {
            const label = CARDINALS[wrap360(deg)]
            return (
              <div
                key={deg}
                className="absolute top-0 flex -translate-x-1/2 flex-col items-center"
                style={{ left: (deg + 180) * PX_PER_DEG }}
              >
                <span className={`w-px bg-current ${label ? 'h-2' : 'h-1 opacity-60'}`} />
                {label && <span className="mt-0.5 font-mono text-[10px] leading-none">{label}</span>}
              </div>
            )
          })}
        </div>
        {/* Centre caret */}
        <span className="absolute top-0 left-1/2 h-3 w-px -translate-x-1/2 bg-hud" />
      </div>
      <div className="relative h-4 font-mono text-[10px] tracking-[0.14em]" style={{ width: WIDTH }}>
        <div
          ref={markerRef}
          className="absolute top-0 left-0 whitespace-nowrap opacity-0 transition-opacity duration-300"
        />
      </div>
    </div>
  )
}
