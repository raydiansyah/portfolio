import { beforeEach, describe, expect, it, vi } from 'vitest'
import { actions, attachEngine, type EngineHandle } from '../../src/features/harbor/controller'
import { harborStore } from '../../src/features/harbor/store'

function fakeEngine() {
  return {
    setInputEnabled: vi.fn(),
    setWaypoint: vi.fn(),
  } as unknown as EngineHandle & { setInputEnabled: ReturnType<typeof vi.fn> }
}

const lastInput = (e: ReturnType<typeof fakeEngine>) => e.setInputEnabled.mock.calls.at(-1)?.[0]

describe('boat input follows overlays', () => {
  let engine: ReturnType<typeof fakeEngine>

  beforeEach(() => {
    harborStore.set({ activePanel: null, mapOpen: false, menuOpen: false, waypoint: null, autopilot: false })
    engine = fakeEngine()
    attachEngine(engine)
  })

  it('re-enables steering after "Set waypoint only" closes the map', () => {
    actions.toggleMap(true)
    expect(lastInput(engine)).toBe(false)
    actions.navigateTo('about', false)
    expect(harborStore.get().mapOpen).toBe(false)
    expect(lastInput(engine)).toBe(true)
  })

  it('re-enables steering after "Sail there" closes the menu', () => {
    actions.toggleMenu(true)
    actions.navigateTo('contact', true)
    expect(lastInput(engine)).toBe(true)
  })

  it('keeps steering locked while a panel is still open', () => {
    harborStore.set({ activePanel: 'about' })
    actions.toggleMap(true)
    actions.toggleMap(false)
    expect(lastInput(engine)).toBe(false)
  })
})
