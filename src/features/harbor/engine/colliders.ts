/** Simple 2D (XZ) collision world: circles for islands/rocks, capsules for piers/logs. */

export type Collider =
  | { kind: 'circle'; x: number; z: number; r: number }
  | { kind: 'capsule'; ax: number; az: number; bx: number; bz: number; r: number }

export interface Contact {
  /** Penetration depth (m). */
  depth: number
  /** Unit normal pointing out of the obstacle. */
  nx: number
  nz: number
}

function closestOnSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax
  const abz = bz - az
  const len2 = abx * abx + abz * abz
  const t = len2 > 0 ? Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / len2)) : 0
  return { x: ax + abx * t, z: az + abz * t }
}

/** Signed distance from point to collider surface (negative = inside). */
export function distanceTo(c: Collider, x: number, z: number): number {
  if (c.kind === 'circle') return Math.hypot(x - c.x, z - c.z) - c.r
  const p = closestOnSegment(x, z, c.ax, c.az, c.bx, c.bz)
  return Math.hypot(x - p.x, z - p.z) - c.r
}

/** Deepest contact between a circle (the boat) and any collider, or null. */
export function collide(colliders: Collider[], x: number, z: number, radius: number): Contact | null {
  let best: Contact | null = null
  for (const c of colliders) {
    let cx: number
    let cz: number
    let r: number
    if (c.kind === 'circle') {
      cx = c.x
      cz = c.z
      r = c.r
    } else {
      const p = closestOnSegment(x, z, c.ax, c.az, c.bx, c.bz)
      cx = p.x
      cz = p.z
      r = c.r
    }
    const dx = x - cx
    const dz = z - cz
    const d = Math.hypot(dx, dz)
    const depth = r + radius - d
    if (depth > 0 && (!best || depth > best.depth)) {
      // Degenerate centre overlap: push along +X.
      best = d > 1e-6 ? { depth, nx: dx / d, nz: dz / d } : { depth, nx: 1, nz: 0 }
    }
  }
  return best
}

/** True when a point is blocked once colliders are inflated by `inflate`. */
export function isBlocked(colliders: Collider[], x: number, z: number, inflate: number): boolean {
  for (const c of colliders) if (distanceTo(c, x, z) < inflate) return true
  return false
}
