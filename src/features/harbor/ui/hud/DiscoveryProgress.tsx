import { useEffect, useState } from 'react'
import { useHarbor } from '../../store'
import { DESTINATIONS } from '../../data/destinations'
import { SECRETS } from '../../data/discoveries'

const FLASH_MS = 2200
const pad = (n: number) => String(n).padStart(2, '0')

export function DiscoveryProgress({ className = '' }: { className?: string }) {
  const count = useHarbor((s) => s.discovered.length)
  const secretCount = useHarbor((s) => s.secrets.length)
  const reducedMotion = useHarbor((s) => s.reducedMotion)
  const total = DESTINATIONS.length

  // Flash "+1 DISCOVERED" whenever the count grows (derived during render, cleared by timer).
  const [prevCount, setPrevCount] = useState(count)
  const [flash, setFlash] = useState(0)
  if (count !== prevCount) {
    setPrevCount(count)
    if (count > prevCount) setFlash(count)
  }
  useEffect(() => {
    if (!flash) return
    const t = window.setTimeout(() => setFlash(0), FLASH_MS)
    return () => window.clearTimeout(t)
  }, [flash])

  return (
    <div className={`flex w-40 flex-col gap-1.5 ${className}`}>
      <div className="flex items-baseline justify-between">
        <span className="hud-label text-hud-dim">World explored</span>
        <span
          aria-hidden="true"
          key={flash}
          className={`font-mono text-[10px] tracking-[0.14em] text-lantern ${
            flash ? (reducedMotion ? '' : 'animate-in fade-in slide-in-from-bottom-1 duration-500') : 'opacity-0'
          }`}
        >
          {flash ? '+1 DISCOVERED' : ''}
        </span>
      </div>
      <p className="font-mono text-xs tabular-nums text-hud">
        {pad(count)} / {pad(total)} <span className="text-hud-dim">DESTINATIONS</span>
      </p>
      <div
        className="relative h-px w-full bg-hud/15"
        role="progressbar"
        aria-label="Destinations discovered"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={count}
      >
        <div
          className={`absolute inset-y-0 left-0 bg-hud ${reducedMotion ? '' : 'transition-[width] duration-700 ease-out'}`}
          style={{ width: `${(count / total) * 100}%` }}
        />
      </div>
      {secretCount > 0 && (
        <span className="hud-label text-hud-dim">
          Secrets {secretCount}/{SECRETS.length}
        </span>
      )}
    </div>
  )
}
