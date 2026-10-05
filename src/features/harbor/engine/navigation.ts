import { isBlocked, type Collider } from './colliders'

/**
 * Coarse occupancy grid + A* for auto-navigation. The world is small and
 * static, so the grid is built once; a search over ~58k cells takes a few ms.
 */

export interface NavGrid {
  size: number
  cell: number
  origin: number
  blocked: Uint8Array
}

export interface Point {
  x: number
  z: number
}

export function buildGrid(colliders: Collider[], worldRadius: number, cell: number, inflate: number): NavGrid {
  const size = Math.ceil((worldRadius * 2) / cell)
  const origin = -worldRadius
  const blocked = new Uint8Array(size * size)
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      const x = origin + (i + 0.5) * cell
      const z = origin + (j + 0.5) * cell
      const outside = Math.hypot(x, z) > worldRadius - inflate
      blocked[j * size + i] = outside || isBlocked(colliders, x, z, inflate) ? 1 : 0
    }
  }
  return { size, cell, origin, blocked }
}

const toCell = (g: NavGrid, v: number) => Math.max(0, Math.min(g.size - 1, Math.floor((v - g.origin) / g.cell)))
const toWorld = (g: NavGrid, i: number) => g.origin + (i + 0.5) * g.cell

/** Nearest free cell (spiral search) — start/goal may sit inside an inflated obstacle. */
function nearestFree(g: NavGrid, i: number, j: number): [number, number] | null {
  if (!g.blocked[j * g.size + i]) return [i, j]
  for (let r = 1; r < 12; r++) {
    for (let dj = -r; dj <= r; dj++) {
      for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue
        const ni = i + di
        const nj = j + dj
        if (ni < 0 || nj < 0 || ni >= g.size || nj >= g.size) continue
        if (!g.blocked[nj * g.size + ni]) return [ni, nj]
      }
    }
  }
  return null
}

/** Binary min-heap keyed by f-score. */
class Heap {
  private items: number[] = []
  private scores: Float32Array
  constructor(scores: Float32Array) {
    this.scores = scores
  }
  get length() {
    return this.items.length
  }
  push(v: number) {
    const a = this.items
    a.push(v)
    let i = a.length - 1
    while (i > 0) {
      const p = (i - 1) >> 1
      if (this.scores[a[p]] <= this.scores[a[i]]) break
      ;[a[p], a[i]] = [a[i], a[p]]
      i = p
    }
  }
  pop(): number {
    const a = this.items
    const top = a[0]
    const last = a.pop()!
    if (a.length) {
      a[0] = last
      let i = 0
      for (;;) {
        const l = i * 2 + 1
        const r = l + 1
        let m = i
        if (l < a.length && this.scores[a[l]] < this.scores[a[m]]) m = l
        if (r < a.length && this.scores[a[r]] < this.scores[a[m]]) m = r
        if (m === i) break
        ;[a[m], a[i]] = [a[i], a[m]]
        i = m
      }
    }
    return top
  }
}

const SQRT2 = Math.SQRT2
const DIRS: [number, number, number][] = [
  [1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1],
  [1, 1, SQRT2], [1, -1, SQRT2], [-1, 1, SQRT2], [-1, -1, SQRT2],
]

export function findPath(g: NavGrid, from: Point, to: Point): Point[] | null {
  const s = nearestFree(g, toCell(g, from.x), toCell(g, from.z))
  const e = nearestFree(g, toCell(g, to.x), toCell(g, to.z))
  if (!s || !e) return null
  const n = g.size * g.size
  const start = s[1] * g.size + s[0]
  const goal = e[1] * g.size + e[0]

  const gScore = new Float32Array(n).fill(Infinity)
  const fScore = new Float32Array(n).fill(Infinity)
  const came = new Int32Array(n).fill(-1)
  const closed = new Uint8Array(n)
  const heap = new Heap(fScore)

  // Octile distance heuristic.
  const h = (c: number) => {
    const dx = Math.abs((c % g.size) - e[0])
    const dz = Math.abs(Math.floor(c / g.size) - e[1])
    return Math.max(dx, dz) + (SQRT2 - 1) * Math.min(dx, dz)
  }

  gScore[start] = 0
  fScore[start] = h(start)
  heap.push(start)

  while (heap.length) {
    const cur = heap.pop()
    if (cur === goal) break
    if (closed[cur]) continue
    closed[cur] = 1
    const ci = cur % g.size
    const cj = Math.floor(cur / g.size)
    for (const [di, dj, cost] of DIRS) {
      const ni = ci + di
      const nj = cj + dj
      if (ni < 0 || nj < 0 || ni >= g.size || nj >= g.size) continue
      const nb = nj * g.size + ni
      if (g.blocked[nb] || closed[nb]) continue
      // No corner cutting through blocked diagonals.
      if (di && dj && (g.blocked[cj * g.size + ni] || g.blocked[nj * g.size + ci])) continue
      const tentative = gScore[cur] + cost
      if (tentative < gScore[nb]) {
        came[nb] = cur
        gScore[nb] = tentative
        fScore[nb] = tentative + h(nb)
        heap.push(nb)
      }
    }
  }

  if (came[goal] === -1 && goal !== start) return null
  const cells: number[] = []
  for (let c = goal; c !== -1; c = came[c]) cells.push(c)
  cells.reverse()
  const pts = cells.map((c) => ({ x: toWorld(g, c % g.size), z: toWorld(g, Math.floor(c / g.size)) }))
  pts[0] = { ...from }
  pts[pts.length - 1] = { ...to }
  return smoothPath(g, pts)
}

/** Grid line-of-sight by sampling along the segment at half-cell steps. */
export function lineOfSight(g: NavGrid, a: Point, b: Point): boolean {
  const d = Math.hypot(b.x - a.x, b.z - a.z)
  const steps = Math.max(1, Math.ceil(d / (g.cell * 0.5)))
  for (let k = 1; k < steps; k++) {
    const t = k / steps
    const i = toCell(g, a.x + (b.x - a.x) * t)
    const j = toCell(g, a.z + (b.z - a.z) * t)
    if (g.blocked[j * g.size + i]) return false
  }
  return true
}

/** String pulling: keep only the points needed to preserve line of sight. */
export function smoothPath(g: NavGrid, pts: Point[]): Point[] {
  if (pts.length <= 2) return pts
  const out: Point[] = [pts[0]]
  let anchor = 0
  for (let k = 2; k < pts.length; k++) {
    if (!lineOfSight(g, pts[anchor], pts[k])) {
      out.push(pts[k - 1])
      anchor = k - 1
    }
  }
  out.push(pts[pts.length - 1])
  return out
}
