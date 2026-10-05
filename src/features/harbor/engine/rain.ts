import { BufferGeometry, Float32BufferAttribute, LineSegments, ShaderMaterial, Vector3, Color } from 'three'

/**
 * Rain as GPU-animated line segments in a box that follows the camera.
 * Positions are derived from a per-drop seed + time in the vertex shader, so
 * the CPU never touches the buffer after creation.
 */

const vert = /* glsl */ `
attribute vec3 aSeed;
attribute float aEnd;
uniform float uTime;
uniform vec3 uCenter;
uniform vec3 uBox;
uniform float uSpeed;
uniform float uLength;
varying float vAlpha;
void main() {
  vec3 p = aSeed * uBox;
  p.y = mod(p.y - uTime * uSpeed * (0.85 + aSeed.x * 0.3), uBox.y);
  // Wrap X/Z around the camera so the box is endless.
  vec3 base = uCenter - uBox * 0.5;
  p.xz = mod(p.xz - base.xz, uBox.xz) + base.xz;
  p.y += uCenter.y - uBox.y * 0.35;
  // Slight wind slant; the tail vertex trails up-wind.
  vec3 dir = normalize(vec3(0.12, -1.0, 0.05));
  p -= dir * uLength * aEnd;
  vAlpha = (1.0 - aEnd * 0.9) * smoothstep(0.0, 2.0, p.y);
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`

const frag = /* glsl */ `
uniform vec3 uColor;
uniform float uOpacity;
varying float vAlpha;
void main() {
  gl_FragColor = vec4(uColor, vAlpha * uOpacity);
}
`

export class Rain {
  readonly mesh: LineSegments<BufferGeometry, ShaderMaterial>
  readonly max: number

  constructor(count: number) {
    this.max = count
    const seeds = new Float32Array(count * 6)
    const ends = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      const s = [Math.random(), Math.random(), Math.random()]
      seeds.set(s, i * 6)
      seeds.set(s, i * 6 + 3)
      ends[i * 2] = 0
      ends[i * 2 + 1] = 1
    }
    const geo = new BufferGeometry()
    geo.setAttribute('position', new Float32BufferAttribute(new Float32Array(count * 6), 3))
    geo.setAttribute('aSeed', new Float32BufferAttribute(seeds, 3))
    geo.setAttribute('aEnd', new Float32BufferAttribute(ends, 1))
    const mat = new ShaderMaterial({
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uCenter: { value: new Vector3() },
        uBox: { value: new Vector3(70, 30, 70) },
        uSpeed: { value: 15 },
        uLength: { value: 0.55 },
        uColor: { value: new Color('#b9c6d6') },
        uOpacity: { value: 0.3 },
      },
    })
    this.mesh = new LineSegments(geo, mat)
    this.mesh.frustumCulled = false
  }

  /** Fraction of drops drawn (quality downgrade without rebuilding buffers). */
  setDensity(fraction: number) {
    this.mesh.geometry.setDrawRange(0, Math.floor(this.max * fraction) * 2)
  }

  update(t: number, center: Vector3, amount: number) {
    const u = this.mesh.material.uniforms
    u.uTime.value = t
    u.uCenter.value.copy(center)
    u.uOpacity.value = 0.3 * amount
    this.mesh.visible = amount > 0.01
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
