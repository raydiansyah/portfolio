import { DESTINATIONS, PIER_LENGTH, facingDir, islandCentre, WORLD_RADIUS } from '../data/destinations'
import { SECRETS } from '../data/discoveries'
import type { DestinationId } from '../types'
import type { Collider } from './colliders'

/**
 * Deterministic world layout shared by rendering, collision and navigation.
 * Everything is plain data so tests can build the nav grid without WebGL.
 */

export interface IslandLobe {
  x: number
  z: number
  r: number
}

export interface Island {
  id: string
  lobes: IslandLobe[]
  height: number
  /** Trees per 100 m² of top area (scaled by quality). */
  treeDensity: number
  kind: 'harbor' | 'filler' | 'secret' | 'portfolio'
}

export interface Pier {
  id: DestinationId | 'abandoned'
  root: { x: number; z: number }
  tip: { x: number; z: number }
  facing: number
  broken?: boolean
}

export interface Log {
  x: number
  z: number
  yaw: number
  length: number
}

export interface Rock {
  x: number
  z: number
  r: number
}

export interface Structure {
  x: number
  z: number
  yaw: number
}

export interface WorldLayout {
  islands: Island[]
  piers: Pier[]
  rocks: Rock[]
  logs: Log[]
  structures: Structure[]
  reeds: { x: number; z: number; r: number }[]
  projectBuoys: { x: number; z: number }[]
  colliders: Collider[]
}

/** Small seeded PRNG (mulberry32) so the world is identical on every load. */
export function rng(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function distToSegment(px: number, pz: number, ax: number, az: number, bx: number, bz: number) {
  const abx = bx - ax
  const abz = bz - az
  const t = Math.max(0, Math.min(1, ((px - ax) * abx + (pz - az) * abz) / (abx * abx + abz * abz || 1)))
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t))
}

const FILLER_ISLANDS: [number, number, number][] = [
  [-40, 40, 10], [50, 22, 9], [-62, -30, 12], [62, -52, 11], [-152, -40, 14], [162, -18, 12],
  [-30, -120, 10], [82, 122, 13], [-92, 142, 12], [152, 142, 10], [0, -72, 8], [-182, 92, 12],
  [190, -152, 11], [-172, -162, 13], [-205, 30, 9], [118, -200, 9],
]

function makeIsland(id: string, x: number, z: number, r: number, kind: Island['kind'], rand: () => number): Island {
  // Main lobe plus 1–2 smaller lobes gives organic outlines from simple circles.
  const lobes: IslandLobe[] = [{ x, z, r }]
  const extra = kind === 'secret' ? 1 : 1 + Math.floor(rand() * 2)
  for (let i = 0; i < extra; i++) {
    const a = rand() * Math.PI * 2
    const d = r * (0.45 + rand() * 0.25)
    lobes.push({ x: x + Math.sin(a) * d, z: z + Math.cos(a) * d, r: r * (0.45 + rand() * 0.2) })
  }
  return {
    id,
    lobes,
    height: kind === 'portfolio' ? 2.6 : 1.4 + rand() * 1.2,
    treeDensity: kind === 'secret' ? 0.4 : 1.1 + rand() * 0.8,
    kind,
  }
}

export function buildLayout(): WorldLayout {
  const rand = rng(1979)
  const islands: Island[] = []
  const piers: Pier[] = []

  for (const d of DESTINATIONS) {
    const c = islandCentre(d)
    const kind = d.id === 'portfolio' ? 'portfolio' : 'harbor'
    const island = makeIsland(`harbor-${d.id}`, c.x, c.z, d.islandRadius, kind, rand)
    // Keep extra lobes away from the pier so the berth stays reachable.
    const f = facingDir(d.facing)
    island.lobes = island.lobes.filter(
      (l, i) => i === 0 || (l.x - c.x) * f.x + (l.z - c.z) * f.z < d.islandRadius * 0.2,
    )
    islands.push(island)
    piers.push({
      id: d.id,
      root: { x: d.dock.x - f.x * PIER_LENGTH, z: d.dock.z - f.z * PIER_LENGTH },
      tip: { ...d.dock },
      facing: d.facing,
    })
  }

  FILLER_ISLANDS.forEach(([x, z, r], i) => islands.push(makeIsland(`filler-${i}`, x, z, r, 'filler', rand)))

  // Easter-egg landmarks: some need their own ground.
  for (const s of SECRETS) {
    if (s.id === 'lighthouse' || s.id === 'cabin') {
      islands.push(makeIsland(`secret-${s.id}`, s.position.x, s.position.z, 7, 'secret', rand))
    } else if (s.id === 'hidden-island') {
      islands.push(makeIsland(`secret-${s.id}`, s.position.x, s.position.z, 9, 'secret', rand))
    } else if (s.id === 'abandoned-dock') {
      const facing = Math.PI * 0.85
      const f = facingDir(facing)
      islands.push(makeIsland('secret-abandoned', s.position.x - f.x * 14, s.position.z - f.z * 14, 8, 'secret', rand))
      piers.push({
        id: 'abandoned',
        root: { x: s.position.x - f.x * 8, z: s.position.z - f.z * 8 },
        tip: { x: s.position.x, z: s.position.z },
        facing,
        broken: true,
      })
    }
  }

  // Rocks: clusters hugging shorelines plus a few in open water.
  const rocks: Rock[] = []
  for (const isl of islands) {
    const n = 2 + Math.floor(rand() * 4)
    const main = isl.lobes[0]
    for (let i = 0; i < n; i++) {
      const a = rand() * Math.PI * 2
      const d = main.r + 1 + rand() * 3
      rocks.push({ x: main.x + Math.sin(a) * d, z: main.z + Math.cos(a) * d, r: 0.6 + rand() * 1.4 })
    }
  }
  const openRocks: [number, number][] = [[-20, 60], [30, -30], [-110, -20], [100, -10], [-50, -170], [140, 90]]
  openRocks.forEach(([x, z]) => rocks.push({ x, z, r: 1.4 + rand() * 1.2 }))

  const logs: Log[] = [
    [24, 40], [-70, 10], [90, -70], [-130, -80], [40, -130], [-60, 110], [170, 30], [-140, 20],
  ].map(([x, z]) => ({ x, z, yaw: rand() * Math.PI, length: 4 + rand() * 3 }))

  const structures: Structure[] = [
    [-28, 18], [36, -12], [-84, -64], [96, 92], [-120, 110],
  ].map(([x, z]) => ({ x, z, yaw: rand() * Math.PI }))

  // Reed patches ring the shorelines.
  const reeds: WorldLayout['reeds'] = []
  for (const isl of islands) {
    for (const l of isl.lobes) {
      const n = 3 + Math.floor(rand() * 4)
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2
        reeds.push({ x: l.x + Math.sin(a) * (l.r + 0.5), z: l.z + Math.cos(a) * (l.r + 0.5), r: 1.5 + rand() * 2.5 })
      }
    }
  }

  // Project buoys sit in the bay in front of Portfolio Island.
  const portfolio = DESTINATIONS[0]
  const projectBuoys = [
    [-24, 16], [-10, 28], [16, 28], [30, 16],
  ].map(([dx, dz]) => ({ x: portfolio.dock.x + dx, z: portfolio.dock.z - dz }))

  // Keep the spawn, every pier and every berth approach free of small obstacles.
  const keepClear = (x: number, z: number, margin: number) => {
    if (Math.hypot(x, z) < 14 + margin) return false
    return !piers.some((p) => {
      const f = facingDir(p.facing)
      const berth = { x: p.tip.x + f.x * 8, z: p.tip.z + f.z * 8 }
      const nearBerth = Math.hypot(x - berth.x, z - berth.z) < 12 + margin
      const nearPier = distToSegment(x, z, p.root.x, p.root.z, p.tip.x, p.tip.z) < 5 + margin
      return nearBerth || nearPier
    })
  }
  const clearRocks = rocks.filter((r) => keepClear(r.x, r.z, r.r))
  const clearLogs = logs.filter((l) => keepClear(l.x, l.z, l.length / 2))
  const clearStructures = structures.filter((s) => keepClear(s.x, s.z, 2.2))
  rocks.length = 0
  rocks.push(...clearRocks)
  logs.length = 0
  logs.push(...clearLogs)
  structures.length = 0
  structures.push(...clearStructures)

  const colliders: Collider[] = [
    ...islands.flatMap((i) => i.lobes.map((l) => ({ kind: 'circle' as const, x: l.x, z: l.z, r: l.r }))),
    ...piers.map((p) => ({
      kind: 'capsule' as const, ax: p.root.x, az: p.root.z, bx: p.tip.x, bz: p.tip.z, r: 1.4,
    })),
    ...rocks.map((r) => ({ kind: 'circle' as const, x: r.x, z: r.z, r: r.r })),
    ...logs.map((l) => {
      const hx = (Math.sin(l.yaw) * l.length) / 2
      const hz = (Math.cos(l.yaw) * l.length) / 2
      return { kind: 'capsule' as const, ax: l.x - hx, az: l.z - hz, bx: l.x + hx, bz: l.z + hz, r: 0.4 }
    }),
    ...structures.map((s) => ({ kind: 'circle' as const, x: s.x, z: s.z, r: 2.2 })),
    ...SECRETS.filter((s) => s.id === 'floating-sign').map((s) => ({
      kind: 'circle' as const, x: s.position.x, z: s.position.z, r: 1,
    })),
  ]

  return { islands, piers, rocks, logs, structures, reeds, projectBuoys, colliders }
}

export { WORLD_RADIUS }
