import type { InputDevice } from '../types'
import type { ControlInput } from './physics'

/**
 * Merges keyboard (WASD / arrows), pointer drag, wheel and virtual joystick
 * into one smoothed {throttle, steer}. Gameplay shortcuts (M, Esc, Enter, 1–6)
 * are handled by the React layer, not here.
 */

const KEYS: Record<string, [throttle: number, steer: number]> = {
  KeyW: [1, 0], ArrowUp: [1, 0],
  KeyS: [-1, 0], ArrowDown: [-1, 0],
  KeyA: [0, -1], ArrowLeft: [0, -1],
  KeyD: [0, 1], ArrowRight: [0, 1],
}

const DRAG_THRESHOLD = 6

export interface InputCallbacks {
  onDevice(device: InputDevice): void
  onFirstInput(): void
  /** Pointer released without dragging (screen coords relative to element). */
  onTap(x: number, y: number): void
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

export class InputController {
  enabled = true
  private pressed = new Set<string>()
  private wheel = 0
  private drag: { id: number; x0: number; y0: number; x: number; y: number; moved: boolean } | null = null
  private joystick = { x: 0, y: 0 }
  private smoothed: ControlInput = { throttle: 0, steer: 0 }
  private started = false
  private el: HTMLElement
  private cb: InputCallbacks
  private reduced: boolean

  constructor(el: HTMLElement, cb: InputCallbacks, reducedMotion: boolean) {
    this.el = el
    this.cb = cb
    this.reduced = reducedMotion
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    window.addEventListener('blur', this.onBlur)
    el.addEventListener('wheel', this.onWheel, { passive: false })
    el.addEventListener('pointerdown', this.onPointerDown)
    el.addEventListener('pointermove', this.onPointerMove)
    el.addEventListener('pointerup', this.onPointerUp)
    el.addEventListener('pointercancel', this.onPointerUp)
  }

  private first(device: InputDevice) {
    this.cb.onDevice(device)
    if (!this.started) {
      this.started = true
      this.cb.onFirstInput()
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!this.enabled || isTyping(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
    if (!(e.code in KEYS)) return
    // Arrow keys would otherwise scroll a focused panel/page.
    e.preventDefault()
    this.pressed.add(e.code)
    this.first('keyboard')
  }

  private onKeyUp = (e: KeyboardEvent) => {
    this.pressed.delete(e.code)
  }

  private onBlur = () => {
    this.pressed.clear()
    this.drag = null
  }

  private onWheel = (e: WheelEvent) => {
    if (!this.enabled) return
    e.preventDefault()
    // Scroll up = ahead, scroll down = brake / reverse. Normalise line/page deltas.
    const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1
    this.wheel = Math.max(-1, Math.min(1, this.wheel - e.deltaY * unit * 0.004))
    this.first('mouse')
  }

  private onPointerDown = (e: PointerEvent) => {
    if (!this.enabled || e.button !== 0) return
    this.drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, moved: false }
  }

  private onPointerMove = (e: PointerEvent) => {
    const d = this.drag
    if (!d || d.id !== e.pointerId) return
    d.x = e.clientX
    d.y = e.clientY
    if (!d.moved && Math.hypot(d.x - d.x0, d.y - d.y0) > DRAG_THRESHOLD) {
      d.moved = true
      this.el.setPointerCapture(e.pointerId)
      this.first(e.pointerType === 'touch' ? 'touch' : 'mouse')
    }
  }

  private onPointerUp = (e: PointerEvent) => {
    const d = this.drag
    if (!d || d.id !== e.pointerId) return
    if (!d.moved) {
      const r = this.el.getBoundingClientRect()
      this.cb.onTap(e.clientX - r.left, e.clientY - r.top)
    }
    this.drag = null
  }

  setJoystick(x: number, y: number) {
    this.joystick.x = x
    this.joystick.y = y
    if (x || y) this.first('touch')
  }

  /** True when the user is actively steering/throttling this frame (cancels autopilot). */
  get active() {
    return this.pressed.size > 0 || !!this.drag?.moved || Math.abs(this.wheel) > 0.05 ||
      Math.hypot(this.joystick.x, this.joystick.y) > 0.1
  }

  read(dt: number): ControlInput {
    let throttle = 0
    let steer = 0
    if (this.enabled) {
      for (const k of this.pressed) {
        throttle += KEYS[k][0]
        steer += KEYS[k][1]
      }
      if (this.drag?.moved) {
        steer += (this.drag.x - this.drag.x0) / 140
        throttle += -(this.drag.y - this.drag.y0) / 110
      }
      throttle += this.wheel + this.joystick.y
      steer += this.joystick.x
    }
    // Wheel impulse decays so a flick gives a burst, not a stuck throttle.
    this.wheel *= Math.exp(-1.6 * dt)
    if (Math.abs(this.wheel) < 0.01) this.wheel = 0

    throttle = Math.max(-1, Math.min(1, throttle))
    steer = Math.max(-1, Math.min(1, steer))
    // Smooth the raw input so keys feel like a throttle lever, not a switch.
    const k = Math.min(1, dt * (this.reduced ? 12 : 6))
    this.smoothed.throttle += (throttle - this.smoothed.throttle) * k
    this.smoothed.steer += (steer - this.smoothed.steer) * k
    return this.smoothed
  }

  reset() {
    this.pressed.clear()
    this.wheel = 0
    this.drag = null
    this.joystick.x = 0
    this.joystick.y = 0
  }

  dispose() {
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    window.removeEventListener('blur', this.onBlur)
    this.el.removeEventListener('wheel', this.onWheel)
    this.el.removeEventListener('pointerdown', this.onPointerDown)
    this.el.removeEventListener('pointermove', this.onPointerMove)
    this.el.removeEventListener('pointerup', this.onPointerUp)
    this.el.removeEventListener('pointercancel', this.onPointerUp)
  }
}
