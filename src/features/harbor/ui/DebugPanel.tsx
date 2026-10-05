import { useEffect, useRef } from 'react'
import { harborStore, telemetry } from '../store'

/** Dev-only overlay toggled with `?debug=1`. Wrap call sites in `import.meta.env.DEV &&`. */
// eslint-disable-next-line react-refresh/only-export-components -- constant is required by call sites
export const DEBUG_ENABLED =
  import.meta.env.DEV &&
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).get('debug') === '1'

const INTERVAL_MS = 250
const f1 = (n: number) => n.toFixed(1)

function snapshot() {
  const s = harborStore.get()
  const { boat, camera } = telemetry
  const nearest = s.nearest ? `${s.nearest.id} T${s.tiers[s.nearest.id]} ${f1(s.nearest.distance)}m` : '—'
  return [
    `FPS          ${Math.round(telemetry.fps)}`,
    `DRAW CALLS   ${telemetry.drawCalls}`,
    `TRIANGLES    ${telemetry.triangles.toLocaleString('en-US')}`,
    `GEO / TEX    ${telemetry.geometries} / ${telemetry.textures}`,
    `BOAT POS     ${f1(boat.x)}, ${f1(boat.z)}`,
    `SPEED        ${f1(boat.speed)} m/s`,
    `ACTIVE       ${nearest}`,
    `CAMERA       ${f1(camera.x)}, ${f1(camera.y)}, ${f1(camera.z)}`,
    `QUALITY      ${s.quality.toUpperCase()}`,
  ].join('\n')
}

function DebugReadout() {
  const preRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    let raf = 0
    let last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < INTERVAL_MS) return
      last = now
      if (preRef.current) preRef.current.textContent = snapshot()
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <pre
      ref={preRef}
      aria-hidden="true"
      className="mt-4 rounded-sm bg-panel/60 px-2.5 py-2 font-mono text-[10px] leading-relaxed text-hud-dim"
    />
  )
}

export function DebugPanel() {
  if (!DEBUG_ENABLED) return null
  return <DebugReadout />
}
