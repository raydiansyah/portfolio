import gsap from 'gsap'
import {
  AdditiveBlending, BoxGeometry, BufferAttribute, BufferGeometry, Color, Float32BufferAttribute, Group, InstancedMesh,
  Matrix4, MeshBasicMaterial, Points, ShaderMaterial, Vector3,
} from 'three'

/**
 * All warm lights in the world share one instanced lamp mesh and one glow
 * point cloud — no real point lights per lantern. Each lantern has a base
 * intensity, a flicker phase and a highlight value driven by gameplay.
 */

export interface Lantern {
  position: Vector3
  /** 0..1 base brightness (lighthouse lamps can exceed). */
  base: number
  owner: string | null
  /** Extra brightness for active / selected harbor (0..1). */
  highlight: number
  /** Multiplier for lanterns that can be hidden (project buoys). */
  visible: number
  /** Switch state: 1 = lit for the night, DAY_POWER = resting ember. Tweened on theme change. */
  power: number
  phase: number
}

/** Lanterns keep a faint ember in daylight so the harbors still read as places. */
export const DAY_POWER = 0.12

const glowVert = /* glsl */ `
attribute float aIntensity;
attribute float aSize;
varying float vIntensity;
void main() {
  vIntensity = aIntensity;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aSize * 320.0 / -mv.z;
  gl_Position = projectionMatrix * mv;
}
`

const glowFrag = /* glsl */ `
uniform vec3 uColor;
varying float vIntensity;
void main() {
  float d = length(gl_PointCoord - 0.5) * 2.0;
  float a = pow(max(1.0 - d, 0.0), 2.2) * vIntensity;
  gl_FragColor = vec4(uColor * a, a);
}
`

export const LANTERN_COLOR = new Color('#ffb562')

export class Lanterns {
  readonly group = new Group()
  readonly list: Lantern[] = []
  private lamps: InstancedMesh | null = null
  private glow: Points<BufferGeometry, ShaderMaterial> | null = null
  private intensity: Float32Array = new Float32Array(0)
  private color = new Color()
  private m = new Matrix4()
  private flicker: boolean

  constructor(reducedMotion: boolean) {
    this.flicker = !reducedMotion
  }

  add(position: Vector3, base = 1, owner: string | null = null) {
    const l: Lantern = { position, base, owner, highlight: 0, visible: 1, power: 1, phase: this.list.length * 1.37 }
    this.list.push(l)
    return l
  }

  /** Build GPU objects once every lantern has been registered. */
  build() {
    const n = this.list.length
    this.lamps = new InstancedMesh(new BoxGeometry(0.3, 0.38, 0.3), new MeshBasicMaterial({ color: '#ffffff' }), n)
    const m = new Matrix4()
    this.list.forEach((l, i) => {
      this.lamps!.setMatrixAt(i, m.makeTranslation(l.position.x, l.position.y, l.position.z))
      this.lamps!.setColorAt(i, LANTERN_COLOR)
    })
    this.lamps.frustumCulled = false

    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(this.list.flatMap((l) => l.position.toArray()), 3))
    this.intensity = new Float32Array(n)
    // BufferAttribute (not Float32BufferAttribute) so it shares `intensity` without copying.
    geo.setAttribute('aIntensity', new BufferAttribute(this.intensity, 1))
    geo.setAttribute('aSize', new Float32BufferAttribute(this.list.map((l) => (l.base > 1 ? 9 : 4.2)), 1))
    this.glow = new Points(
      geo,
      new ShaderMaterial({
        vertexShader: glowVert,
        fragmentShader: glowFrag,
        uniforms: { uColor: { value: LANTERN_COLOR.clone() } },
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
      }),
    )
    this.glow.frustumCulled = false
    this.group.add(this.lamps, this.glow)
  }

  /** Effective brightness of lantern `i` this frame. */
  value(i: number) {
    return this.intensity[i] ?? 0
  }

  /** Move a lantern (used by bobbing buoys). */
  setPosition(i: number, p: Vector3) {
    this.list[i].position.copy(p)
    if (!this.lamps || !this.glow) return
    this.lamps.setMatrixAt(i, this.m.makeTranslation(p.x, p.y, p.z))
    this.lamps.instanceMatrix.needsUpdate = true
    const pos = this.glow.geometry.getAttribute('position')
    pos.setXYZ(i, p.x, p.y, p.z)
    pos.needsUpdate = true
  }

  /** Set every lantern instantly (initial theme, no animation). */
  setAll(on: boolean) {
    for (const l of this.list) {
      gsap.killTweensOf(l)
      l.power = on ? 1 : DAY_POWER
    }
  }

  /**
   * Night: lanterns light up in a wave travelling outward from `origin` (the
   * boat), each with a brief ignition flicker. Day: they dim back to an ember.
   */
  ignite(on: boolean, origin: Vector3, startDelay = 0) {
    for (const l of this.list) {
      gsap.killTweensOf(l)
      const delay = startDelay + Math.min(2.4, l.position.distanceTo(origin) / 70)
      if (!on) {
        gsap.to(l, { power: DAY_POWER, duration: this.flicker ? 0.9 : 0.2, delay: this.flicker ? delay * 0.4 : 0, ease: 'power2.in' })
      } else if (!this.flicker) {
        gsap.to(l, { power: 1, duration: 0.2 })
      } else {
        gsap
          .timeline({ delay })
          .to(l, { power: 0.75, duration: 0.05 })
          .to(l, { power: 0.15, duration: 0.08 })
          .to(l, { power: 1, duration: 0.4, ease: 'power2.out' })
      }
    }
  }

  update(t: number) {
    if (!this.lamps || !this.glow) return
    this.list.forEach((l, i) => {
      const flick = this.flicker ? 0.9 + 0.06 * Math.sin(t * 7.3 + l.phase) + 0.04 * Math.sin(t * 13.1 + l.phase * 2) : 1
      // Highlight (active / nearby harbor) still reads as feedback in daylight.
      const v = (l.base * l.power * flick + l.highlight * (0.35 + l.power * 0.65)) * l.visible
      this.intensity[i] = v
      this.color.copy(LANTERN_COLOR).multiplyScalar(0.2 + Math.min(v, 1.2) * 0.75)
      this.lamps!.setColorAt(i, this.color)
    })
    this.lamps.instanceColor!.needsUpdate = true
    this.glow.geometry.getAttribute('aIntensity').needsUpdate = true
  }

  dispose() {
    this.lamps?.geometry.dispose()
    ;(this.lamps?.material as MeshBasicMaterial | undefined)?.dispose()
    this.glow?.geometry.dispose()
    this.glow?.material.dispose()
  }
}
