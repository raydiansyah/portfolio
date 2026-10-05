import { collide, type Collider } from './colliders'

/**
 * Boat dynamics, kept free of three.js so it can be unit tested.
 * Model: scalar forward speed along heading + a decaying "kick" vector used for
 * collision bounces, plus yaw rate with inertia.
 */

export interface BoatParams {
  acceleration: number
  maxSpeed: number
  reverseSpeed: number
  /** Max yaw rate at cruising speed (rad/s). */
  turnSpeed: number
  /** Linear drag (1/s) applied when coasting. */
  drag: number
  /** Quadratic resistance coefficient. */
  waterResistance: number
  /** How quickly yaw rate follows steering input (1/s). Lower = more inertia. */
  turnResponse: number
  brake: number
  radius: number
  worldRadius: number
}

export const DEFAULT_BOAT: BoatParams = {
  acceleration: 3.6,
  maxSpeed: 9,
  reverseSpeed: 4,
  turnSpeed: 0.9,
  drag: 0.25,
  waterResistance: 0.012,
  turnResponse: 2.2,
  brake: 7,
  radius: 2.6,
  worldRadius: 240,
}

/** Fraction of impact speed returned as a sideways bounce. Low on purpose: no arcade pinball. */
const RESTITUTION = 0.3

export interface BoatState {
  x: number
  z: number
  yaw: number
  speed: number
  yawRate: number
  kickX: number
  kickZ: number
}

export interface ControlInput {
  /** -1 (reverse/brake) .. 1 (full ahead). */
  throttle: number
  /** -1 (port / screen left) .. 1 (starboard / screen right). */
  steer: number
}

export interface StepResult {
  collided: boolean
  impact: number
}

export function createBoatState(x = 0, z = 0, yaw = 0): BoatState {
  return { x, z, yaw, speed: 0, yawRate: 0, kickX: 0, kickZ: 0 }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function stepBoat(
  s: BoatState,
  input: ControlInput,
  dt: number,
  p: BoatParams,
  colliders: Collider[],
): StepResult {
  const throttle = clamp(input.throttle, -1, 1)
  const steer = clamp(input.steer, -1, 1)

  // Longitudinal: thrust, braking when opposing motion, then drag + quadratic resistance.
  if (throttle > 0) {
    s.speed += p.acceleration * throttle * dt
  } else if (throttle < 0) {
    s.speed += (s.speed > 0.05 ? p.brake : p.acceleration * 0.6) * throttle * dt
  }
  const resist = p.drag * s.speed + p.waterResistance * s.speed * Math.abs(s.speed)
  s.speed -= resist * dt
  s.speed = clamp(s.speed, -p.reverseSpeed, p.maxSpeed)
  if (throttle === 0 && Math.abs(s.speed) < 0.02) s.speed = 0

  // Steering authority grows with speed (rudder needs flow) but never drops to zero.
  const authority = Math.max(0.2, Math.min(1, Math.abs(s.speed) / (p.maxSpeed * 0.5)))
  const dir = s.speed < -0.1 ? -1 : 1
  // Positive steer = starboard (screen right). Yaw grows toward +X, which is
  // screen-left for the follow camera looking along +Z, so starboard lowers yaw.
  const targetRate = -steer * p.turnSpeed * authority * dir
  s.yawRate += (targetRate - s.yawRate) * Math.min(1, p.turnResponse * dt)
  s.yaw += s.yawRate * dt

  const fx = Math.sin(s.yaw)
  const fz = Math.cos(s.yaw)
  s.x += (fx * s.speed + s.kickX) * dt
  s.z += (fz * s.speed + s.kickZ) * dt

  const kickDecay = Math.exp(-3 * dt)
  s.kickX *= kickDecay
  s.kickZ *= kickDecay

  // Soft world boundary: steer back gently instead of a hard wall.
  const r = Math.hypot(s.x, s.z)
  if (r > p.worldRadius) {
    const over = r - p.worldRadius
    s.x -= (s.x / r) * over * Math.min(1, 2 * dt)
    s.z -= (s.z / r) * over * Math.min(1, 2 * dt)
    s.speed *= 1 - Math.min(1, 0.8 * dt)
  }

  const c = collide(colliders, s.x, s.z, p.radius)
  if (!c) return { collided: false, impact: 0 }

  // Resolve penetration, lose most speed, add a soft bounce along the normal.
  s.x += c.nx * c.depth
  s.z += c.nz * c.depth
  const vx = fx * s.speed
  const vz = fz * s.speed
  const into = vx * c.nx + vz * c.nz
  let impact = 0
  if (into < 0) {
    impact = -into
    s.speed *= 0.4
    s.kickX += c.nx * impact * RESTITUTION
    s.kickZ += c.nz * impact * RESTITUTION
  }
  return { collided: true, impact }
}
