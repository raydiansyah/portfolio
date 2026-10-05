import { describe, expect, it } from 'vitest'
import { DESTINATIONS, berthPoint } from '../../src/features/harbor/data/destinations'
import { collide, isBlocked } from '../../src/features/harbor/engine/colliders'
import { buildLayout, WORLD_RADIUS } from '../../src/features/harbor/engine/layout'
import { buildGrid, findPath, lineOfSight } from '../../src/features/harbor/engine/navigation'
import { createAutopilot, pursue } from '../../src/features/harbor/engine/autopilot'
import { DEFAULT_BOAT, createBoatState, stepBoat } from '../../src/features/harbor/engine/physics'

const layout = buildLayout()
const grid = buildGrid(layout.colliders, WORLD_RADIUS, 2, DEFAULT_BOAT.radius + 1)

describe('world layout', () => {
  it('is deterministic', () => {
    expect(buildLayout().colliders).toEqual(layout.colliders)
  })

  it('keeps the spawn and every berth free', () => {
    expect(isBlocked(layout.colliders, 0, 0, DEFAULT_BOAT.radius)).toBe(false)
    for (const d of DESTINATIONS) {
      const b = berthPoint(d)
      expect(collide(layout.colliders, b.x, b.z, DEFAULT_BOAT.radius), d.id).toBeNull()
    }
  })

  it('places four project buoys in open water', () => {
    expect(layout.projectBuoys).toHaveLength(4)
    for (const p of layout.projectBuoys) expect(isBlocked(layout.colliders, p.x, p.z, 1)).toBe(false)
  })
})

describe('navigation', () => {
  it('finds a collision-free path from spawn to every harbor', () => {
    for (const d of DESTINATIONS) {
      const path = findPath(grid, { x: 0, z: 0 }, berthPoint(d))
      expect(path, d.id).not.toBeNull()
      for (let i = 1; i < path!.length; i++) expect(lineOfSight(grid, path![i - 1], path![i])).toBe(true)
    }
  })

  it('autopilot reaches a harbor by sailing the physics model', () => {
    const target = berthPoint(DESTINATIONS[2])
    const path = findPath(grid, { x: 0, z: 0 }, target)!
    const ap = createAutopilot(path)
    const boat = createBoatState()
    for (let t = 0; t < 120 && !ap.done; t += 1 / 30) {
      stepBoat(boat, pursue(ap, boat), 1 / 30, DEFAULT_BOAT, layout.colliders)
    }
    expect(ap.done).toBe(true)
    expect(Math.hypot(boat.x - target.x, boat.z - target.z)).toBeLessThan(4)
  })
})
