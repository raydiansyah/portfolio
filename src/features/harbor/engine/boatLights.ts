import gsap from 'gsap'
import {
  AdditiveBlending, Box3, CanvasTexture, Color, Group, Mesh, MeshBasicMaterial, PointLight, SphereGeometry, Sprite,
  SpriteMaterial, Vector3,
} from 'three'

/**
 * Visible ship lights: masthead (white), port (red), starboard (green), stern
 * (white) and a warm deck lamp that actually lights the hull. They switch on
 * with a short ignition flicker when the world turns to night.
 *
 * Boat-local frame: bow = +Z, up = +Y. The follow camera sees local +X on the
 * left, so port (left side when facing the bow) is +X.
 */

const DAY_POWER = 0
const DECK_LAMP_INTENSITY = 3.2

interface ShipLight {
  core: Mesh<SphereGeometry, MeshBasicMaterial>
  glow: Sprite
  color: Color
  size: number
}

let glowTexture: CanvasTexture | null = null

/** Shared soft radial sprite used for every light halo. */
function glowMap() {
  if (glowTexture) return glowTexture
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,0.45)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  glowTexture = new CanvasTexture(c)
  return glowTexture
}

export class BoatLights {
  readonly group = new Group()
  readonly deckLamp = new PointLight('#ffb766', 0, 18, 1.6)
  /** 0 = off (day), 1 = fully on (night). Tweened by `ignite`. */
  readonly power = { value: 0 }
  private lights: ShipLight[] = []
  private reduced: boolean

  constructor(reducedMotion: boolean) {
    this.reduced = reducedMotion
    const spec: [string, number][] = [
      ['#fff4e0', 0.9], // masthead
      ['#ff4a3d', 0.7], // port
      ['#3dff8a', 0.7], // starboard
      ['#fff4e0', 0.6], // stern
    ]
    for (const [hex, size] of spec) {
      const color = new Color(hex)
      const core = new Mesh(new SphereGeometry(0.09, 8, 6), new MeshBasicMaterial({ color: color.clone(), toneMapped: false }))
      const glow = new Sprite(
        new SpriteMaterial({ map: glowMap(), color: color.clone(), blending: AdditiveBlending, depthWrite: false, transparent: true }),
      )
      glow.scale.setScalar(size)
      this.group.add(core, glow)
      this.lights.push({ core, glow, color, size })
    }
    this.group.add(this.deckLamp)
    // Proxy-hull bounds until the GLB arrives.
    this.place(new Box3(new Vector3(-1.1, -0.3, -3.3), new Vector3(1.1, 3, 4.2)))
  }

  /** Position lights from the hull's local bounding box (called again once the GLB replaces the proxy). */
  place(box: Box3) {
    const { min, max } = box
    const height = max.y - min.y
    const deckY = min.y + height * 0.32
    const midZ = (min.z + max.z) / 2
    const halfWidth = (max.x - min.x) / 2
    const anchors: [number, number, number][] = [
      [0, max.y - height * 0.04, midZ + (max.z - midZ) * 0.15], // masthead
      [halfWidth * 0.92, deckY, midZ + (max.z - midZ) * 0.2], // port (+X)
      [-halfWidth * 0.92, deckY, midZ + (max.z - midZ) * 0.2], // starboard (-X)
      [0, deckY, min.z + 0.15], // stern
    ]
    this.lights.forEach((l, i) => {
      const [x, y, z] = anchors[i]
      l.core.position.set(x, y, z)
      l.glow.position.set(x, y, z)
    })
    this.deckLamp.position.set(0, deckY + height * 0.18, midZ + (max.z - midZ) * 0.35)
  }

  /** Set instantly (initial theme). */
  set(on: boolean) {
    gsap.killTweensOf(this.power)
    this.power.value = on ? 1 : DAY_POWER
  }

  /** Switch on with an ignition flicker, or fade off for daylight. */
  ignite(on: boolean, delay = 0) {
    gsap.killTweensOf(this.power)
    if (!on) {
      gsap.to(this.power, { value: DAY_POWER, duration: this.reduced ? 0.2 : 0.8, delay, ease: 'power2.in' })
      return
    }
    if (this.reduced) {
      gsap.to(this.power, { value: 1, duration: 0.2, delay })
      return
    }
    gsap
      .timeline({ delay })
      .to(this.power, { value: 0.7, duration: 0.05 })
      .to(this.power, { value: 0.08, duration: 0.07 })
      .to(this.power, { value: 0.9, duration: 0.1 })
      .to(this.power, { value: 0.45, duration: 0.06 })
      .to(this.power, { value: 1, duration: 0.35, ease: 'power2.out' })
  }

  update() {
    const p = this.power.value
    this.group.visible = p > 0.005
    for (const l of this.lights) {
      l.core.material.color.copy(l.color).multiplyScalar(0.25 + p * 1.6)
      l.glow.material.opacity = p
      l.glow.scale.setScalar(l.size * (0.6 + p * 0.4))
    }
    this.deckLamp.intensity = DECK_LAMP_INTENSITY * p
  }

  dispose() {
    for (const l of this.lights) {
      l.core.geometry.dispose()
      l.core.material.dispose()
      l.glow.material.dispose()
    }
    glowTexture?.dispose()
    glowTexture = null
  }
}
