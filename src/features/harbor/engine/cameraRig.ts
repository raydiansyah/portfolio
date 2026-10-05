import { PerspectiveCamera, Vector3 } from 'three'
import type { BoatState } from './physics'

/**
 * Third-person follow camera with inertia. The follow pose lags the boat
 * (position + heading smoothing); cinematic events blend toward a `focus`
 * pose whose values are tweened externally (GSAP), so every transition is eased.
 */

export interface RigParams {
  distance: number
  height: number
  lookAhead: number
  lookHeight: number
  fov: number
}

export const FOLLOW: RigParams = { distance: 18, height: 6.8, lookAhead: 7, lookHeight: 1.6, fov: 50 }

const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export class CameraRig {
  readonly camera: PerspectiveCamera
  /** Live follow parameters (tweenable: widen on discovery, etc.). */
  params: RigParams = { ...FOLLOW }
  /** Cinematic override: weight 0 = pure follow, 1 = pure focus pose. */
  focus = { weight: 0, pos: new Vector3(), look: new Vector3() }
  /** Partial look-at bias toward a point of interest (e.g. a discovered harbor). */
  bias = { weight: 0, point: new Vector3() }
  shake = 0

  private yaw = 0
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

  /** Where the follow camera would sit for a given boat pose (used to seed intro tweens). */
  followPose(boat: BoatState, outPos: Vector3, outLook: Vector3) {
    const fx = Math.sin(boat.yaw)
    const fz = Math.cos(boat.yaw)
    outPos.set(boat.x - fx * this.params.distance, this.params.height, boat.z - fz * this.params.distance)
    outLook.set(boat.x + fx * this.params.lookAhead, this.params.lookHeight, boat.z + fz * this.params.lookAhead)
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
    const fx = Math.sin(this.yaw)
    const fz = Math.cos(this.yaw)
    const speedAhead = Math.max(0, boat.speed) * 0.35

    const dist = p.distance * this.framing
    this.desired.set(boat.x - fx * dist, p.height * this.framing, boat.z - fz * dist)
    this.followPos.lerp(this.desired, 1 - Math.exp(-(this.reduced ? 10 : 4) * dt))

    this.tmp.set(boat.x + fx * (p.lookAhead + speedAhead), p.lookHeight, boat.z + fz * (p.lookAhead + speedAhead))
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

    if (Math.abs(this.camera.fov - p.fov) > 0.01) {
      this.camera.fov = p.fov
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
