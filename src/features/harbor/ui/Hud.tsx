import { Moon, Sun } from 'lucide-react'
import { actions } from '../controller'
import { useHarbor } from '../store'
import { DESTINATIONS, DESTINATION_BY_ID } from '../data/destinations'
import { PROFILE } from '../data/content'
import { DebugPanel } from './DebugPanel'
import { Intro } from './Intro'
import { Compass } from './hud/Compass'
import { DiscoveryProgress } from './hud/DiscoveryProgress'
import { EngineMeter } from './hud/EngineMeter'
import { InputHints } from './hud/InputHints'
import { Minimap } from './hud/Minimap'
import { Toasts } from './hud/Toasts'

const pad = (n: number) => String(n).padStart(2, '0')

const SAFE_PAD =
  'pt-[max(1.25rem,env(safe-area-inset-top))] pr-[max(1.25rem,env(safe-area-inset-right))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pl-[max(1.25rem,env(safe-area-inset-left))] ' +
  'md:pt-[max(2rem,env(safe-area-inset-top))] md:pr-[max(2rem,env(safe-area-inset-right))] md:pb-[max(2rem,env(safe-area-inset-bottom))] md:pl-[max(2rem,env(safe-area-inset-left))]'

const GHOST_BTN =
  'pointer-events-auto inline-flex h-11 min-w-11 items-center justify-center rounded-md px-2 text-hud outline-none transition-colors hover:bg-hud/5 focus-visible:ring-2 focus-visible:ring-ring/60'

export default function Hud({ isDark, onToggleTheme }: { isDark: boolean; onToggleTheme: () => void }) {
  const phase = useHarbor((s) => s.phase)
  const nearest = useHarbor((s) => s.nearest)
  const activePanel = useHarbor((s) => s.activePanel)
  const mapOpen = useHarbor((s) => s.mapOpen)
  const device = useHarbor((s) => s.inputDevice)
  const discoveredCount = useHarbor((s) => s.discovered.length)

  const loading = phase === 'loading'
  const covered = activePanel !== null || mapOpen
  // Secondary HUD fades away behind panels/map and while the world loads.
  const fade = `transition-opacity duration-500 ${covered || loading ? 'pointer-events-none opacity-0' : 'opacity-100'}`
  const nearestDest = nearest ? DESTINATION_BY_ID[nearest.id] : null

  return (
    <div className={`pointer-events-none absolute inset-0 select-none ${SAFE_PAD}`}>
      <div className="relative h-full w-full">
        {/* Top-left: identity */}
        <div className="absolute top-0 left-0">
          <p className="text-sm font-semibold tracking-tight text-hud uppercase md:text-base">{PROFILE.name}</p>
          <p className="hud-label mt-1 text-hud-dim">{PROFILE.role}</p>
          {import.meta.env.DEV && <DebugPanel />}
        </div>

        {/* Top-center: heading tape */}
        <div className={`absolute top-0 left-1/2 hidden -translate-x-1/2 sm:block ${fade}`}>
          <Compass />
        </div>

        {/* Top-right: controls + nearest destination */}
        <div className="absolute top-0 right-0 flex flex-col items-end">
          <div className="-mt-2.5 -mr-2 flex items-center gap-1">
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={isDark ? 'Switch to light world' : 'Switch to dark world'}
              aria-pressed={isDark}
              className={GHOST_BTN}
            >
              {isDark ? <Sun className="size-4" aria-hidden="true" /> : <Moon className="size-4" aria-hidden="true" />}
            </button>
            <button
              type="button"
              onClick={() => actions.toggleMenu(true)}
              aria-haspopup="dialog"
              className={`${GHOST_BTN} hud-label px-3`}
            >
              Menu
            </button>
          </div>
          {nearestDest && (
            <div className={`mt-3 text-right ${fade}`} aria-live="off">
              <p className="font-mono text-xs tabular-nums text-hud">
                {pad(nearestDest.index)} <span className="text-hud-dim">/ {pad(DESTINATIONS.length)}</span>
              </p>
              <p className="hud-label mt-1 text-hud-dim">{nearestDest.label}</p>
            </div>
          )}
        </div>

        {/* Bottom-left: input hints (lifted above the touch joystick) */}
        {/* On touch the joystick owns the bottom-left corner, so hints move under the name. */}
        <div className={`absolute left-0 ${device === 'touch' ? 'top-20' : 'bottom-0'} ${fade}`}>
          <InputHints />
        </div>

        {/* Bottom-center: tagline until the first discovery */}
        <p
          className={`hud-label absolute bottom-0 left-1/2 hidden -translate-x-1/2 text-hud-dim transition-opacity duration-700 md:block ${
            covered || loading || discoveredCount > 0 ? 'opacity-0' : 'opacity-100'
          }`}
          aria-hidden={discoveredCount > 0}
        >
          Explore the world
        </p>

        {/* Bottom-right: progress, engine, minimap */}
        <div className={`absolute right-0 bottom-0 flex flex-col items-end gap-4 ${fade}`}>
          <DiscoveryProgress className="order-1" />
          <EngineMeter className="order-2 w-28 sm:order-3 sm:w-40" />
          <div className="order-3 sm:order-2">
            <Minimap />
          </div>
        </div>
      </div>

      <div className={fade}>
        <Toasts />
      </div>
      <Intro />
    </div>
  )
}
