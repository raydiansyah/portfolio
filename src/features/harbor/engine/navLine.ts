import { BufferGeometry, Color, Float32BufferAttribute, Mesh, ShaderMaterial } from 'three'
import type { Point } from './navigation'

/**
 * Subtle dashed ribbon on the water showing the waypoint route.
 * Low opacity, theme-tinted, slowly flowing toward the destination — never neon.
 */

const vert = /* glsl */ `
attribute float aDist;
attribute float aSide;
varying float vDist;
varying float vSide;
void main() {
  vDist = aDist;
  vSide = aSide;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const frag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
uniform float uTime;
uniform float uTotal;
varying float vDist;
varying float vSide;
void main() {
  float dash = step(0.45, fract(vDist / 2.4 - uTime * 0.35));
  float edge = 1.0 - abs(vSide);
  // Fade in near the boat and out near the destination.
  float ends = smoothstep(0.0, 6.0, vDist) * smoothstep(0.0, 8.0, uTotal - vDist);
  gl_FragColor = vec4(uColor, dash * edge * ends * uOpacity);
}
`

const WIDTH = 0.45
const STEP = 1.2

export class NavLine {
  readonly mesh: Mesh<BufferGeometry, ShaderMaterial>

  constructor() {
    this.mesh = new Mesh(
      new BufferGeometry(),
      new ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uColor: { value: new Color('#e8dcc4') },
          uOpacity: { value: 0 },
          uTime: { value: 0 },
          uTotal: { value: 1 },
        },
      }),
    )
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 2
  }

  /** Rebuild the ribbon from a polyline (resampled so it can follow the swell). */
  setPath(path: Point[] | null) {
    const geo = this.mesh.geometry
    if (!path || path.length < 2) {
      this.mesh.visible = false
      return
    }
    const pts: Point[] = []
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]
      const b = path[i]
      const n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / STEP))
      for (let k = 0; k < n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, z: a.z + ((b.z - a.z) * k) / n })
    }
    pts.push(path[path.length - 1])

    const pos: number[] = []
    const dist: number[] = []
    const side: number[] = []
    const idx: number[] = []
    let total = 0
    pts.forEach((p, i) => {
      const prev = pts[Math.max(0, i - 1)]
      const next = pts[Math.min(pts.length - 1, i + 1)]
      const dx = next.x - prev.x
      const dz = next.z - prev.z
      const l = Math.hypot(dx, dz) || 1
      const nx = -dz / l
      const nz = dx / l
      if (i > 0) total += Math.hypot(p.x - prev.x, p.z - prev.z)
      pos.push(p.x + nx * WIDTH, 0.32, p.z + nz * WIDTH, p.x - nx * WIDTH, 0.32, p.z - nz * WIDTH)
      dist.push(total, total)
      side.push(1, -1)
      if (i > 0) {
        const a = (i - 1) * 2
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
      }
    })
    geo.setAttribute('position', new Float32BufferAttribute(pos, 3))
    geo.setAttribute('aDist', new Float32BufferAttribute(dist, 1))
    geo.setAttribute('aSide', new Float32BufferAttribute(side, 1))
    geo.setIndex(idx)
    geo.computeBoundingSphere()
    this.mesh.material.uniforms.uTotal.value = total
    this.mesh.visible = true
  }

  update(t: number, opacity: number, color: Color) {
    const u = this.mesh.material.uniforms
    u.uTime.value = t
    u.uOpacity.value = opacity
    u.uColor.value.copy(color)
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
