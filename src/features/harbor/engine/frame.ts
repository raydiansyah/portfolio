import { Color, Vector3, type PerspectiveCamera } from 'three'
import { DESTINATIONS } from '../data/destinations'
import { SECRETS, SECRET_RADIUS } from '../data/discoveries'
import { harborStore, telemetry, type LabelAnchor } from '../store'
import type { DestinationId, Tier } from '../types'
import type { BoatVisual } from './boat'
import { DISCOVER_TIER, tierFor } from './discovery'
import type { HarborVisual } from './docks'
import type { Lanterns } from './lanterns'
import type { BoatState } from './physics'
import type { Water } from './water'

/** Per-frame helpers kept out of HarborEngine to keep it focused on orchestration. */

export const HUD_COLOR_DARK = new Color('#e8dcc4')
export const HUD_COLOR_LIGHT = new Color('#2d3a44')

const v = new Vector3()

function project(camera: PerspectiveCamera, w: number, h: number, p: Vector3, out: LabelAnchor) {
  v.copy(p).project(camera)
  out.visible = v.z < 1 && Math.abs(v.x) < 1.15 && Math.abs(v.y) < 1.15
  out.x = (v.x * 0.5 + 0.5) * w
  // Keep cards clear of the compass strip and the bottom HUD.
  out.y = Math.min(h - 60, Math.max(300, (-v.y * 0.5 + 0.5) * h))
}

/** Write screen-space anchors for harbor and buoy labels into telemetry. */
export function projectLabels(
  camera: PerspectiveCamera,
  container: HTMLElement,
  harbors: HarborVisual[],
  buoys: Vector3[],
  projectMode: boolean,
) {
  const w = container.clientWidth
  const h = container.clientHeight
  for (const hv of harbors) {
    const a = (telemetry.labels[hv.id] ??= { x: 0, y: 0, visible: false })
    project(camera, w, h, v.copy(hv.marker).setY(hv.marker.y + 1.4), a)
  }
  buoys.forEach((b, i) => {
    const a = (telemetry.projectLabels[i] ??= { x: 0, y: 0, visible: false })
    if (!projectMode) {
      a.visible = false
      return
    }
    project(camera, w, h, b, a)
  })
}

/** Indices of the `n` lanterns nearest the camera (for water reflections). */
export function selectWaterLanterns(lanterns: Lanterns, camera: Vector3, n: number) {
  return lanterns.list
    .map((l, i) => ({ i, d: l.position.distanceToSquared(camera) }))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map((x) => x.i)
}

export interface DiscoveryResult {
  /** Destination newly discovered this frame (for the camera event). */
  discovered: DestinationId | null
}

/**
 * Update distance tiers, nearest harbor, secrets and project-buoy proximity,
 * pushing only changes to the store.
 */
export function updateDiscovery(
  boat: BoatState,
  tiers: Record<DestinationId, Tier>,
  locked: boolean,
  buoys: Vector3[] | null,
): DiscoveryResult {
  const store = harborStore.get()
  let nearest: { id: DestinationId; distance: number } | null = null
  let changed = false
  let discovered: DestinationId | null = null
  for (const d of DESTINATIONS) {
    const dist = Math.hypot(boat.x - d.dock.x, boat.z - d.dock.z)
    if (!nearest || dist < nearest.distance) nearest = { id: d.id, distance: dist }
    const prev = tiers[d.id]
    const next: Tier = locked ? 0 : tierFor(dist, prev)
    if (next === prev) continue
    tiers[d.id] = next
    changed = true
    if (next >= DISCOVER_TIER && harborStore.markDiscovered(d.id)) discovered = d.id
  }
  if (changed) harborStore.set({ tiers: { ...tiers } })
  if (nearest && store.nearest?.id !== nearest.id) harborStore.set({ nearest })

  for (const sec of SECRETS) {
    if (Math.hypot(boat.x - sec.position.x, boat.z - sec.position.z) < SECRET_RADIUS) harborStore.markSecret(sec.id)
  }

  if (buoys) {
    let idx: number | null = null
    let best = 12
    buoys.forEach((a, i) => {
      const d = Math.hypot(boat.x - a.x, boat.z - a.z)
      if (d < best) {
        best = d
        idx = i
      }
    })
    if (idx !== store.projectNearest) harborStore.set({ projectNearest: idx })
  }
  return { discovered }
}

/** Wake samples behind the stern and radial ripples on braking, tight turns and idling. */
export class WaterFx {
  private wakeTimer = 0
  private rippleTimer = 0
  private rainTimer = 0
  private lastSpeed = 0
  private stern = new Vector3()

  update(dt: number, t: number, s: BoatState, boat: BoatVisual, water: Water, rain: number) {
    const speed = Math.abs(s.speed)
    this.wakeTimer -= dt
    if (speed > 0.6 && this.wakeTimer <= 0) {
      boat.stern(s, this.stern)
      water.addWake(this.stern.x, this.stern.z, t, Math.min(1, speed / 9))
      this.wakeTimer = 0.32
    }

    this.rippleTimer -= dt
    const decel = (this.lastSpeed - s.speed) / Math.max(dt, 1e-3)
    this.lastSpeed = s.speed
    if (this.rippleTimer <= 0) {
      if (decel > 2.2 || (Math.abs(s.yawRate) > 0.45 && speed > 3)) {
        water.addRipple(s.x, s.z, t, 1.4)
        this.rippleTimer = 0.35
      } else if (speed < 0.4) {
        water.addRipple(s.x + Math.sin(t) * 1.5, s.z + Math.cos(t) * 1.5, t, 1.1)
        this.rippleTimer = 2.4
      }
    }

    // Rain drops land around the boat (that is where the camera looks).
    this.rainTimer -= dt
    while (rain > 0.05 && this.rainTimer <= 0) {
      const a = Math.random() * Math.PI * 2
      const r = Math.sqrt(Math.random()) * 34
      water.addRipple(s.x + Math.sin(a) * r, s.z + Math.cos(a) * r, t, 0.45)
      this.rainTimer += 1 / (16 * rain)
    }
    if (rain <= 0.05) this.rainTimer = 0
  }
}

/** Copy the selected lanterns' positions + live intensity into the water uniforms. */
export function syncWaterLanterns(water: Water, lanterns: Lanterns, indices: number[]) {
  water.lanterns.forEach((u, i) => {
    const li = indices[i]
    if (li === undefined) return u.set(0, 0, 0, 0)
    const p = lanterns.list[li].position
    u.set(p.x, p.y, p.z, lanterns.value(li))
  })
}

/** Input hints fade once the controls are understood and reappear once, briefly, after a long idle. */
export class HintTracker {
  private idle = 0
  private reshown = false

  update(dt: number, moved: number, steered: boolean, active: boolean, exploring: boolean) {
    const visible = harborStore.get().hintsVisible
    if (visible && moved > 40 && steered && !this.reshown) harborStore.set({ hintsVisible: false })
    this.idle = active ? 0 : this.idle + dt
    if (!visible && !this.reshown && this.idle > 20 && exploring) {
      this.reshown = true
      harborStore.set({ hintsVisible: true })
      setTimeout(() => harborStore.set({ hintsVisible: false }), 5000)
    }
  }
}

/** What Enter / the touch ENTER button should act on: nearest buoy in project mode, else a harbor in enter range. */
export function nearestIntent(tiers: Record<DestinationId, Tier>, projectMode: boolean) {
  const near = harborStore.get().projectNearest
  if (projectMode && near !== null) return { type: 'project' as const, index: near }
  const id = (Object.keys(tiers) as DestinationId[]).find((k) => tiers[k] === 3)
  return id ? { type: 'harbor' as const, id } : null
}
