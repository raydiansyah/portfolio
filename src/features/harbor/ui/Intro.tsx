import { useEffect, useState } from 'react'
import { useHarbor } from '../store'

const AUTO_HIDE_MS = 7000
/** The bar keeps moving between real milestones, easing toward (never past) this cap. */
const CREEP_CAP = 0.92
const CREEP_TAU_S = 6

/**
 * Displayed progress: the real value (chunk loaded, model bytes…) or a slow
 * time-based creep, whichever is higher, so the bar never sits still at 0%.
 */
function useCreep(active: boolean, real: number) {
  const [creep, setCreep] = useState(0)
  useEffect(() => {
    if (!active) return
    const start = performance.now()
    const id = window.setInterval(() => {
      const t = (performance.now() - start) / 1000
      setCreep(CREEP_CAP * (1 - Math.exp(-t / CREEP_TAU_S)))
    }, 120)
    return () => window.clearInterval(id)
  }, [active])
  return Math.max(real, creep)
}

/** Opening title card; fades once the visitor starts sailing (or after 7s). */
export function Intro() {
  const phase = useHarbor((s) => s.phase)
  const loadProgress = useHarbor((s) => s.loadProgress)
  const introDone = useHarbor((s) => s.introDone)
  const hasMoved = useHarbor((s) => s.hasMoved)
  const device = useHarbor((s) => s.inputDevice)
  const activePanel = useHarbor((s) => s.activePanel)
  const reducedMotion = useHarbor((s) => s.reducedMotion)
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!introDone) return
    const t = window.setTimeout(() => setTimedOut(true), AUTO_HIDE_MS)
    return () => window.clearTimeout(t)
  }, [introDone])

  const loading = phase === 'loading'
  const visible = (!introDone || !hasMoved) && !timedOut && !activePanel
  const shown = useCreep(loading, loadProgress)
  const pct = Math.round(Math.min(1, Math.max(0, loading ? shown : 1)) * 100)

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 text-center ${
        reducedMotion ? 'transition-opacity duration-200' : 'transition-[opacity,transform] duration-1000 ease-out'
      } ${visible ? 'opacity-100' : 'opacity-0'} ${!visible && !reducedMotion ? '-translate-y-1' : ''}`}
      aria-hidden={!visible}
    >
      <h1 className="text-4xl font-semibold tracking-tight text-balance text-hud uppercase md:text-7xl">
        Explore my world
      </h1>
      <p className="font-mono text-xs tracking-[0.12em] text-hud-dim md:text-sm">
        {device === 'touch' ? 'Use the joystick to navigate' : 'Use W A S D or drag to navigate'}
      </p>
      {loading && (
        <div className="mt-4 flex w-48 flex-col items-center gap-2" role="status">
          <div className="relative h-px w-full bg-hud/15">
            <div
              className="absolute inset-y-0 left-0 bg-hud transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="hud-label tabular-nums text-hud-dim">Loading world {pct}%</span>
        </div>
      )}
    </div>
  )
}
