import { actions } from '../controller'
import { useHarbor } from '../store'

/** Touch-only interact button; sits left of the minimap column. */
export default function EnterButton() {
  const enabled = useHarbor(
    (s) => Object.values(s.tiers).some((t) => t === 3) || (s.phase === 'project' && s.projectNearest !== null),
  )

  return (
    <button
      type="button"
      onClick={() => actions.interact()}
      disabled={!enabled}
      aria-label="Enter nearest destination"
      className="absolute right-[calc(112px+2.5rem)] bottom-[calc(1.5rem+env(safe-area-inset-bottom))] flex size-16 items-center justify-center rounded-full border border-hud/40 bg-panel font-mono text-[11px] tracking-[0.18em] text-hud uppercase backdrop-blur-sm transition-opacity select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:border-lantern active:text-lantern disabled:opacity-35"
      style={{ touchAction: 'manipulation' }}
    >
      Enter
    </button>
  )
}
