import gsap from 'gsap'
import { PerspectiveCamera, Vector3 } from 'three'
import type { CameraViewId } from '../types'
import type { BoatState } from './physics'

/**
 * Third-person follow camera with inertia. The follow pose lags the boat
 * (position + heading smoothing). Three layers combine:
 *  - `params`: the active view preset (chase / close / aerial / cinematic), tweened on change
 *  - `extra`:  additive offsets used by cinematic events (discovery widen, dock zoom)
 *  - `orbit`:  free user orbit from right-drag, easing back behind the boat while sailing
 * Cinematic shots blend toward a `focus` pose whose values are tweened externally.
 */

export interface RigParams {
  distance: number
  height: number
  lookAhead: number
  lookHeight: number
  fov: number
  /** Angle of the camera around the boat relative to straight behind (radians). */
  side: number
}

export const VIEWS: Record<CameraViewId, RigParams> = {
  chase: { distance: 18, height: 6.8, lookAhead: 7, lookHeight: 1.6, fov: 50, side: 0 },
  close: { distance: 10, height: 3.4, lookAhead: 5, lookHeight: 2, fov: 55, side: 0 },
  aerial: { distance: 26, height: 30, lookAhead: 10, lookHeight: 0, fov: 45, side: 0 },
  cinematic: { distance: 15, height: 2.4, lookAhead: 3, lookHeight: 2.2, fov: 42, side: 0.9 },
}

export const VIEW_ORDER: CameraViewId[] = ['chase', 'close', 'aerial', 'cinematic']

/** Default follow preset (also used by cinematics as the reference framing). */
export const FOLLOW = VIEWS.chase

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))
const ORBIT_YAW_PER_PX = 0.006
const ORBIT_PITCH_PER_PX = 0.004
/** Seconds without orbit input before the camera starts drifting back behind the boat. */
const RECENTER_DELAY = 2.5

export class CameraRig {
  readonly camera: PerspectiveCamera
  params: RigParams = { ...FOLLOW }
  extra = { distance: 0, height: 0, fov: 0 }
  orbit = { yaw: 0, pitch: 0 }
  view: CameraViewId = 'chase'
  /** Cinematic override: weight 0 = pure follow, 1 = pure focus pose. */
  focus = { weight: 0, pos: new Vector3(), look: new Vector3() }
  /** Partial look-at bias toward a point of interest (e.g. a discovered harbor). */
  bias = { weight: 0, point: new Vector3() }
  shake = 0

  private yaw = 0
  private sinceOrbit = Infinity
  private followPos = new Vector3()
  private followLook = new Vector3()
  private desired = new Vector3()
  private look = new Vector3()
  private tmp = new Vector3()
  private initialised = false
  private reduced: boolean
  /** Portrait screens see less horizontally; pull the camera back to keep the boat in context. */
  private framing = 1

  constructor(aspect: number, reducedMotion: boolean) {
    this.camera = new PerspectiveCamera(FOLLOW.fov, aspect, 0.3, 1400)
    this.reduced = reducedMotion
    this.resize(aspect)
  }

  /** Ease to another view preset; also clears any free orbit. */
  setView(id: CameraViewId) {
    this.view = id
    gsap.killTweensOf(this.params)
    gsap.killTweensOf(this.orbit)
    const duration = this.reduced ? 0.25 : 1.1
    gsap.to(this.params, { ...VIEWS[id], duration, ease: 'power3.inOut' })
    gsap.to(this.orbit, { yaw: 0, pitch: 0, duration, ease: 'power3.inOut' })
  }

  /** Right-drag orbit (pixels). */
  orbitBy(dx: number, dy: number) {
    gsap.killTweensOf(this.orbit)
    this.orbit.yaw = wrap(this.orbit.yaw - dx * ORBIT_YAW_PER_PX)
    this.orbit.pitch = Math.max(-0.25, Math.min(1.2, this.orbit.pitch + dy * ORBIT_PITCH_PER_PX))
    this.sinceOrbit = 0
  }

  /** Where the follow camera would sit for a given boat pose (used to seed intro tweens). */
  followPose(boat: BoatState, outPos: Vector3, outLook: Vector3) {
    const p = this.params
    const a = boat.yaw + p.side
    outPos.set(boat.x - Math.sin(a) * p.distance, p.height, boat.z - Math.cos(a) * p.distance)
    outLook.set(boat.x + Math.sin(boat.yaw) * p.lookAhead, p.lookHeight, boat.z + Math.cos(boat.yaw) * p.lookAhead)
  }

  update(dt: number, boat: BoatState, t: number) {
    const p = this.params
    if (!this.initialised) {
      this.yaw = boat.yaw
      this.followPose(boat, this.followPos, this.followLook)
      this.initialised = true
    }
    // Heading lags the boat so turns read as a smooth cinematic swing.
    const yawK = this.reduced ? 6 : 2.2
    this.yaw += wrap(boat.yaw - this.yaw) * (1 - Math.exp(-yawK * dt))

    // Free orbit drifts back behind the boat once the user is sailing again.
    this.sinceOrbit += dt
    if (this.sinceOrbit > RECENTER_DELAY && Math.abs(boat.speed) > 2) {
      const k = Math.exp(-0.7 * dt)
      this.orbit.yaw *= k
      this.orbit.pitch *= k
    }

    const dist = (p.distance + this.extra.distance) * this.framing
    const a = this.yaw + p.side + this.orbit.yaw
    const height = Math.min(dist * 2.5, Math.max(1.5, (p.height + this.extra.height) * this.framing + this.orbit.pitch * dist))
    this.desired.set(boat.x - Math.sin(a) * dist, height, boat.z - Math.cos(a) * dist)
    this.followPos.lerp(this.desired, 1 - Math.exp(-(this.reduced ? 10 : 4) * dt))

    const fx = Math.sin(this.yaw)
    const fz = Math.cos(this.yaw)
    const ahead = p.lookAhead + Math.max(0, boat.speed) * 0.35
    this.tmp.set(boat.x + fx * ahead, p.lookHeight, boat.z + fz * ahead)
    if (this.bias.weight > 0) this.tmp.lerp(this.bias.point, this.bias.weight)
    this.followLook.lerp(this.tmp, 1 - Math.exp(-(this.reduced ? 12 : 5) * dt))

    const w = this.focus.weight
    this.camera.position.lerpVectors(this.followPos, this.focus.pos, w)
    this.look.lerpVectors(this.followLook, this.focus.look, w)

    if (this.shake > 0.001 && !this.reduced) {
      this.camera.position.x += Math.sin(t * 43) * this.shake * 0.12
      this.camera.position.y += Math.sin(t * 37 + 1) * this.shake * 0.08
    }
    this.shake *= Math.exp(-6 * dt)
    // Never dip below the water surface.
    this.camera.position.y = Math.max(this.camera.position.y, 1.2)
    this.camera.lookAt(this.look)

    const fov = p.fov + this.extra.fov
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov
      this.camera.updateProjectionMatrix()
    }
  }

  /** Current look target (for seeding focus tweens without a jump). */
  currentLook(out: Vector3) {
    return out.copy(this.look)
  }

  resize(aspect: number) {
    this.camera.aspect = aspect
    this.framing = aspect < 1 ? Math.min(1.6, 1 + (1 - aspect) * 0.9) : 1
    this.camera.updateProjectionMatrix()
  }
}
