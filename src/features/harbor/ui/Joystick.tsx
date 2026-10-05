import { useRef } from 'react'
import type { PointerEvent } from 'react'
import { getEngine } from '../controller'
import { harborStore } from '../store'

const BASE = 120
const KNOB = 48
/** Max knob travel from centre, in px. */
const TRAVEL = (BASE - KNOB) / 2
const DEAD_ZONE = 0.12

/** Virtual thumbstick for touch devices: x = steer (right +1), y = throttle (up +1). */
export default function Joystick() {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const pointerId = useRef<number | null>(null)

  const update = (clientX: number, clientY: number) => {
    const base = baseRef.current
    const knob = knobRef.current
    if (!base || !knob) return
    const r = base.getBoundingClientRect()
    let dx = (clientX - (r.left + r.width / 2)) / TRAVEL
    let dy = (clientY - (r.top + r.height / 2)) / TRAVEL
    // Clamp to the unit circle.
    const len = Math.hypot(dx, dy)
    if (len > 1) {
      dx /= len
      dy /= len
    }
    knob.style.transform = `translate(${dx * TRAVEL}px, ${dy * TRAVEL}px)`
    const active = Math.min(len, 1) >= DEAD_ZONE
    // Screen y grows downward; pushing up means forward (+1).
    getEngine()?.setJoystick(active ? dx : 0, active ? -dy : 0)
  }

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (pointerId.current !== null) return
    pointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    if (knobRef.current) knobRef.current.style.transition = 'none'
    const s = harborStore.get()
    if (s.inputDevice !== 'touch' || !s.hasMoved) harborStore.set({ inputDevice: 'touch', hasMoved: true })
    update(e.clientX, e.clientY)
  }

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId === pointerId.current) update(e.clientX, e.clientY)
  }

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerId.current) return
    pointerId.current = null
    const knob = knobRef.current
    if (knob) {
      // Spring back to centre.
      knob.style.transition = 'transform 220ms cubic-bezier(0.34, 1.56, 0.64, 1)'
      knob.style.transform = 'translate(0px, 0px)'
    }
    getEngine()?.setJoystick(0, 0)
  }

  return (
    <div
      ref={baseRef}
      aria-label="Boat joystick: drag to steer and throttle"
      role="application"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
      className="absolute bottom-[calc(1.5rem+env(safe-area-inset-bottom))] left-6 flex items-center justify-center rounded-full border border-border bg-panel/40 select-none"
      style={{ width: BASE, height: BASE, touchAction: 'none' }}
    >
      <div
        ref={knobRef}
        className="rounded-full border border-hud/40 bg-panel will-change-transform"
        style={{ width: KNOB, height: KNOB }}
      />
    </div>
  )
}
