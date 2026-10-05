import {
  ACESFilmicToneMapping, DirectionalLight, PCFShadowMap, Raycaster, SRGBColorSpace, Vector2, Vector3,
  WebGLRenderer, type PerspectiveCamera,
} from 'three'
import { harborStore, telemetry } from '../store'
import type { DestinationId, QualityTier } from '../types'
import type { HarborVisual } from './docks'
import { settingsFor, type QualitySettings } from './quality'
import type { Rain } from './rain'

/** One-time renderer / light configuration and small stateless helpers for the engine. */

export function createRenderer(container: HTMLElement, s: QualitySettings) {
  const renderer = new WebGLRenderer({ antialias: s.antialias, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, s.dprCap))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.shadowMap.enabled = s.shadows
  renderer.shadowMap.type = PCFShadowMap
  const canvas = renderer.domElement
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', 'A small boat on a quiet wetland with six harbors, one for each part of the portfolio.')
  canvas.style.touchAction = 'none'
  canvas.style.display = 'block'
  container.appendChild(canvas)
  renderer.setSize(container.clientWidth, container.clientHeight)
  return renderer
}

/** Tight shadow frustum that follows the boat (only the nearby scene casts). */
export function configureSun(sun: DirectionalLight, shadows: boolean) {
  sun.castShadow = shadows
  if (!shadows) return
  sun.shadow.mapSize.set(1024, 1024)
  const c = sun.shadow.camera
  c.left = c.bottom = -28
  c.right = c.top = 28
  c.near = 1
  c.far = 140
  sun.shadow.bias = -0.0006
}

/** Resolve once the web fonts used on canvas-drawn signs are available (bounded wait). */
export function loadSignFonts() {
  const fonts = Promise.allSettled([
    document.fonts.load('600 64px "Inter Variable"'),
    document.fonts.load('500 22px "JetBrains Mono Variable"'),
  ])
  return Promise.race([fonts, new Promise((r) => setTimeout(r, 1500))])
}

const raycaster = new Raycaster()
const ndc = new Vector2()
const hit = new Vector3()

export type Pick = { type: 'harbor'; id: DestinationId } | { type: 'project'; index: number } | null

/** Screen tap -> harbor (hit box) or project buoy (proximity to ray). */
export function pick(
  x: number,
  y: number,
  container: HTMLElement,
  camera: PerspectiveCamera,
  harbors: HarborVisual[],
  buoys: Vector3[] | null,
): Pick {
  ndc.set((x / container.clientWidth) * 2 - 1, -(y / container.clientHeight) * 2 + 1)
  raycaster.setFromCamera(ndc, camera)
  const ray = raycaster.ray
  if (buoys) {
    const i = buoys.findIndex((a) => ray.distanceSqToPoint(a) < 9)
    if (i >= 0) return { type: 'project', index: i }
  }
  let best: { id: DestinationId; d: number } | null = null
  for (const h of harbors) {
    if (!ray.intersectBox(h.hitBox, hit)) continue
    const d = hit.distanceTo(ray.origin)
    if (!best || d < best.d) best = { id: h.id, d }
  }
  return best ? { type: 'harbor', id: best.id } : null
}

export function writeDebugTelemetry(renderer: WebGLRenderer, fps: number, camera: PerspectiveCamera) {
  const info = renderer.info
  telemetry.fps = fps
  telemetry.drawCalls = info.render.calls
  telemetry.triangles = info.render.triangles
  telemetry.geometries = info.memory.geometries
  telemetry.textures = info.memory.textures
  telemetry.camera.x = camera.position.x
  telemetry.camera.y = camera.position.y
  telemetry.camera.z = camera.position.z
}

/** Resolve on the first animation frame where `done()` is true, or after `timeout` ms. */
export function waitUntil(done: () => boolean, timeout: number) {
  const started = performance.now()
  return new Promise<void>((resolve) => {
    const check = () => (done() || performance.now() - started > timeout ? resolve() : requestAnimationFrame(check))
    check()
  })
}

/** Cheap runtime downgrade after sustained low FPS: resolution, shadows, rain density. */
export function downgrade(tier: QualityTier, reduced: boolean, renderer: WebGLRenderer, sun: DirectionalLight, rain: Rain) {
  const settings = settingsFor(tier, reduced)
  renderer.setPixelRatio(Math.min(devicePixelRatio, settings.dprCap))
  sun.castShadow = false
  rain.setDensity(tier === 'medium' ? 0.4 : 0.16)
  harborStore.set({ quality: tier })
  return settings
}
