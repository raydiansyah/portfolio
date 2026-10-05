import { describe, expect, it } from 'vitest'
import { tierFor } from '../../src/features/harbor/engine/discovery'
import { DEFAULT_BOAT, createBoatState, stepBoat } from '../../src/features/harbor/engine/physics'
import { waveHeight, waveNormal } from '../../src/features/harbor/engine/waves'
import { collide } from '../../src/features/harbor/engine/colliders'

// Open sea: no world boundary interference for long runs.
const OPEN = { ...DEFAULT_BOAT, worldRadius: 1e6 }

const step = (s: ReturnType<typeof createBoatState>, throttle: number, steer: number, seconds: number) => {
  for (let t = 0; t < seconds; t += 1 / 60) stepBoat(s, { throttle, steer }, 1 / 60, OPEN, [])
}

describe('boat physics', () => {
  it('accelerates gradually and respects max speed', () => {
    const s = createBoatState()
    step(s, 1, 0, 0.5)
    expect(s.speed).toBeGreaterThan(1)
    expect(s.speed).toBeLessThan(4)
    step(s, 1, 0, 30)
    expect(s.speed).toBeLessThanOrEqual(DEFAULT_BOAT.maxSpeed)
    expect(s.speed).toBeGreaterThan(DEFAULT_BOAT.maxSpeed * 0.6)
  })

  it('coasts to a stop instead of stopping instantly', () => {
    const s = createBoatState()
    step(s, 1, 0, 5)
    const cruising = s.speed
    step(s, 0, 0, 0.5)
    expect(s.speed).toBeGreaterThan(cruising * 0.7)
    step(s, 0, 0, 30)
    expect(s.speed).toBeLessThan(0.1)
  })

  it('brakes then reverses up to reverse speed', () => {
    const s = createBoatState()
    step(s, 1, 0, 3)
    step(s, -1, 0, 10)
    expect(s.speed).toBeLessThan(0)
    expect(s.speed).toBeGreaterThanOrEqual(-DEFAULT_BOAT.reverseSpeed)
  })

  it('turns with inertia', () => {
    const s = createBoatState()
    step(s, 1, 0, 3)
    step(s, 1, 1, 0.05)
    const early = s.yawRate
    step(s, 1, 1, 1.5)
    expect(s.yawRate).toBeGreaterThan(early)
    expect(s.yaw).toBeGreaterThan(0)
  })

  it('cannot pass through an obstacle and loses speed on impact', () => {
    const s = createBoatState()
    const wall = [{ kind: 'circle' as const, x: 0, z: 20, r: 5 }]
    for (let t = 0; t < 10; t += 1 / 60) stepBoat(s, { throttle: 1, steer: 0 }, 1 / 60, DEFAULT_BOAT, wall)
    expect(collide(wall, s.x, s.z, DEFAULT_BOAT.radius - 0.01)).toBeNull()
    expect(s.z).toBeLessThan(20)
  })
})

describe('discovery tiers', () => {
  it('maps distance to tiers', () => {
    expect(tierFor(40, 0)).toBe(0)
    expect(tierFor(20, 0)).toBe(1)
    expect(tierFor(12, 0)).toBe(2)
    expect(tierFor(5, 0)).toBe(3)
  })

  it('applies hysteresis when moving away', () => {
    expect(tierFor(8.5, 3)).toBe(3)
    expect(tierFor(10, 3)).toBe(2)
    expect(tierFor(25.5, 1)).toBe(1)
    expect(tierFor(27, 1)).toBe(0)
  })
})

describe('waves', () => {
  it('stays within a calm amplitude and has upward normals', () => {
    for (let i = 0; i < 50; i++) {
      const h = waveHeight(i * 3.1, i * -1.7, i * 0.37)
      expect(Math.abs(h)).toBeLessThan(0.3)
      expect(waveNormal(i, i, i).y).toBeGreaterThan(0.95)
    }
  })
})
