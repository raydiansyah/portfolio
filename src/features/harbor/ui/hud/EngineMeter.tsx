import { useEffect, useRef } from 'react'
import { telemetry } from '../../store'

const SEGMENTS = 10
const MS_TO_KN = 1.94

export function EngineMeter({ className = '' }: { className?: string }) {
  const segRefs = useRef<(HTMLSpanElement | null)[]>([])
  const pctRef = useRef<HTMLSpanElement>(null)
  const speedRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    let raf = 0
    let lastLit = -1
    let lastPct = ''
    let lastSpeed = ''
    const tick = () => {
      raf = requestAnimationFrame(tick)
      const { momentum, speed } = telemetry.boat
      const m = Math.min(1, Math.max(0, momentum))
      const lit = Math.round(m * SEGMENTS)
      if (lit !== lastLit) {
        lastLit = lit
        segRefs.current.forEach((el, i) => {
          if (el) el.style.opacity = i < lit ? '0.9' : '0.18'
        })
      }
      const pct = speed < -0.05 ? 'REV' : `${String(Math.round(m * 100)).padStart(3, ' ')}%`
      if (pct !== lastPct && pctRef.current) {
        lastPct = pct
        pctRef.current.textContent = pct
      }
      const kn = `${String(Math.min(99, Math.round(Math.abs(speed) * MS_TO_KN))).padStart(2, '0')} kn`
      if (kn !== lastSpeed && speedRef.current) {
        lastSpeed = kn
        speedRef.current.textContent = kn
      }
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className={`flex flex-col gap-1.5 ${className}`} aria-hidden="true">
      <div className="flex items-baseline justify-between gap-4">
        <span className="hud-label text-hud-dim">Engine</span>
        <span ref={pctRef} className="min-w-[4ch] text-right font-mono text-[11px] tabular-nums text-hud-dim">
          {'  0%'}
        </span>
      </div>
      <div className="flex items-end gap-[3px]">
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <span
            key={i}
            ref={(el) => {
              segRefs.current[i] = el
            }}
            className="h-2.5 w-[3px] bg-hud opacity-20 transition-opacity duration-150"
          />
        ))}
        <span ref={speedRef} className="ml-auto pl-3 font-mono text-xs tabular-nums text-hud">
          00 kn
        </span>
      </div>
    </div>
  )
}
