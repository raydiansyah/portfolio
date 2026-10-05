import type { ControlInput } from './physics'
import type { Point } from './navigation'

/** Pure-pursuit follower over a smoothed path. */

export interface AutopilotState {
  path: Point[]
  /** Index of the segment currently being followed. */
  segment: number
  done: boolean
}

export function createAutopilot(path: Point[]): AutopilotState {
  return { path, segment: 0, done: path.length < 2 }
}

const wrapAngle = (a: number) => Math.atan2(Math.sin(a), Math.cos(a))

export interface PursuitOptions {
  lookahead: number
  arriveRadius: number
  slowRadius: number
}

const DEFAULTS: PursuitOptions = { lookahead: 10, arriveRadius: 2.5, slowRadius: 26 }

/** Project the boat onto the path and pick a carrot point `lookahead` meters ahead. */
function carrot(ap: AutopilotState, x: number, z: number, lookahead: number): Point {
  const { path } = ap
  // Advance segment when we are past its end.
  while (ap.segment < path.length - 2) {
    const a = path[ap.segment]
    const b = path[ap.segment + 1]
    const abx = b.x - a.x
    const abz = b.z - a.z
    const t = ((x - a.x) * abx + (z - a.z) * abz) / (abx * abx + abz * abz || 1)
    if (t < 1) break
    ap.segment++
  }
  let remaining = lookahead
  let px = x
  let pz = z
  for (let i = ap.segment + 1; i < path.length; i++) {
    const p = path[i]
    const d = Math.hypot(p.x - px, p.z - pz)
    if (d >= remaining) {
      const t = remaining / d
      return { x: px + (p.x - px) * t, z: pz + (p.z - pz) * t }
    }
    remaining -= d
    px = p.x
    pz = p.z
  }
  return path[path.length - 1]
}

export function pursue(
  ap: AutopilotState,
  boat: { x: number; z: number; yaw: number; speed: number },
  opts: Partial<PursuitOptions> = {},
): ControlInput {
  const o = { ...DEFAULTS, ...opts }
  if (ap.done) return { throttle: boat.speed > 0.3 ? -0.6 : 0, steer: 0 }

  const end = ap.path[ap.path.length - 1]
  const distEnd = Math.hypot(end.x - boat.x, end.z - boat.z)
  if (distEnd < o.arriveRadius) {
    ap.done = true
    return { throttle: -0.6, steer: 0 }
  }

  const target = carrot(ap, boat.x, boat.z, o.lookahead)
  const desired = Math.atan2(target.x - boat.x, target.z - boat.z)
  const err = wrapAngle(desired - boat.yaw)
  const steer = Math.max(-1, Math.min(1, err * 1.8))

  // Ease off on sharp turns and when approaching the berth.
  const turnFactor = 1 - Math.min(0.75, Math.abs(err) / Math.PI)
  const approach = Math.min(1, distEnd / o.slowRadius)
  const targetSpeed = 9 * Math.max(0.2, approach) * turnFactor
  const throttle = boat.speed < targetSpeed ? 1 : boat.speed > targetSpeed + 1 ? -0.5 : 0.15

  return { throttle, steer }
}
