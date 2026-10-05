import { useHarbor } from '../../store'
import type { InputDevice } from '../../types'

type Hint = { keys: string[]; action: string }

const HINTS: Record<InputDevice, Hint[]> = {
  keyboard: [
    { keys: ['W', 'A', 'S', 'D'], action: 'Move' },
    { keys: ['M'], action: 'Map' },
    { keys: ['ESC'], action: 'Close' },
  ],
  mouse: [
    { keys: ['DRAG'], action: 'Steer' },
    { keys: ['SCROLL'], action: 'Move' },
    { keys: ['M'], action: 'Map' },
  ],
  touch: [
    { keys: ['JOYSTICK'], action: 'Move' },
    { keys: ['TAP'], action: 'Interact' },
  ],
}

export function InputHints({ className = '' }: { className?: string }) {
  const device = useHarbor((s) => s.inputDevice)
  const visible = useHarbor((s) => s.hintsVisible)

  return (
    <div
      className={`flex flex-col gap-2 transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'} ${className}`}
      aria-hidden={!visible}
    >
      <ul className="flex flex-col gap-1.5" aria-label="Controls">
        {HINTS[device].map((hint) => (
          <li key={hint.action + hint.keys.join()} className="flex items-center gap-3">
            <span className="flex gap-1">
              {hint.keys.map((k) => (
                <kbd
                  key={k}
                  className="inline-flex h-5 min-w-5 items-center justify-center rounded-[3px] border border-hud/25 px-1 font-mono text-[10px] leading-none text-hud"
                >
                  {k}
                </kbd>
              ))}
            </span>
            <span className="hud-label text-hud-dim">{hint.action}</span>
          </li>
        ))}
      </ul>
      <span className="hud-label text-hud-dim/70">Explore</span>
    </div>
  )
}
