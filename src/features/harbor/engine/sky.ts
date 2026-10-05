import {
  BackSide, Color, DoubleSide, Group, Mesh, PlaneGeometry, ShaderMaterial, SphereGeometry, Vector3,
} from 'three'
import type { EnvState } from './theme'
import { NOISE_GLSL } from './water'

/** Gradient sky dome with moon/sun disc + stars, and world-space cloud / mist layers. */

const skyVert = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize(position);
  vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position = p.xyww; // pin to far plane
}
`

const skyFrag = /* glsl */ `
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uFog;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSize;
uniform float uStars;
uniform float uTime;
varying vec3 vDir;
${NOISE_GLSL}
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 col = mix(uHorizon, uZenith, smoothstep(-0.02, 0.6, h));
  // Fog band hugging the horizon so the water edge dissolves.
  col = mix(col, uFog, smoothstep(0.18, -0.02, h));

  float sd = dot(d, uSunDir);
  float disc = smoothstep(cos(uSize), cos(uSize * 0.85), sd);
  float halo = pow(max(sd, 0.0), 40.0) * 0.35 + pow(max(sd, 0.0), 6.0) * 0.08;
  col += uSunColor * (disc * 1.6 + halo);

  if (uStars > 0.0 && h > 0.05) {
    // Sparse point stars: one candidate per cell, drawn as a small soft dot.
    vec2 uv = vec2(atan(d.z, d.x), asin(h)) * 160.0;
    vec2 cell = floor(uv);
    float s = hash12(cell);
    vec2 centre = cell + 0.5 + (vec2(hash12(cell + 7.1), hash12(cell + 3.3)) - 0.5) * 0.6;
    float dotMask = smoothstep(0.16, 0.0, length(uv - centre));
    float twinkle = 0.6 + 0.4 * sin(uTime * 2.0 + s * 40.0);
    col += step(0.996, s) * dotMask * twinkle * uStars * smoothstep(0.05, 0.35, h);
  }
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const layerVert = /* glsl */ `
varying vec3 vWorld;
varying vec2 vLocal;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  vLocal = position.xy;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const layerFrag = /* glsl */ `
uniform float uTime;
uniform float uOpacity;
uniform float uScale;
uniform float uCover;
uniform vec2 uWind;
uniform vec3 uColor;
uniform vec3 uShade;
uniform float uHalf;
varying vec3 vWorld;
varying vec2 vLocal;
${NOISE_GLSL}
void main() {
  vec2 p = vWorld.xz * uScale + uWind * uTime;
  float n = fbm(p);
  float a = smoothstep(uCover, uCover + 0.28, n);
  // Fade toward the plane edge so the layer never shows a border.
  float edge = 1.0 - smoothstep(uHalf * 0.55, uHalf, length(vLocal));
  vec3 col = mix(uShade, uColor, smoothstep(uCover, uCover + 0.5, n));
  gl_FragColor = vec4(col, a * uOpacity * edge);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

const WHITE = new Color(1, 1, 1)

interface LayerConfig {
  height: number
  size: number
  scale: number
  cover: number
  wind: [number, number]
  opacity: number
}

class Layer {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>
  readonly config: LayerConfig
  constructor(config: LayerConfig) {
    this.config = config
    const geo = new PlaneGeometry(config.size, config.size, 1, 1)
    const mat = new ShaderMaterial({
      vertexShader: layerVert,
      fragmentShader: layerFrag,
      transparent: true,
      depthWrite: false,
      side: DoubleSide,
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0 },
        uScale: { value: config.scale },
        uCover: { value: config.cover },
        uWind: { value: config.wind },
        uColor: { value: new Color() },
        uShade: { value: new Color() },
        uHalf: { value: config.size / 2 },
      },
    })
    this.mesh = new Mesh(geo, mat)
    this.mesh.rotation.x = -Math.PI / 2
    this.mesh.position.y = config.height
    this.mesh.frustumCulled = false
  }
}

export class Sky {
  readonly group = new Group()
  private dome: Mesh<SphereGeometry, ShaderMaterial>
  private clouds: Layer[]
  private mist: Layer
  private cloudsAnimated: boolean

  constructor(reducedMotion: boolean) {
    this.cloudsAnimated = !reducedMotion
    const dome = new Mesh(
      new SphereGeometry(900, 32, 16),
      new ShaderMaterial({
        vertexShader: skyVert,
        fragmentShader: skyFrag,
        side: BackSide,
        depthWrite: false,
        uniforms: {
          uZenith: { value: new Color() },
          uHorizon: { value: new Color() },
          uFog: { value: new Color() },
          uSunDir: { value: new Vector3(0, 1, 0) },
          uSunColor: { value: new Color() },
          uSize: { value: 0.02 },
          uStars: { value: 0 },
          uTime: { value: 0 },
        },
      }),
    )
    dome.renderOrder = -10
    dome.frustumCulled = false
    this.dome = dome

    // Three cloud decks at different heights/speeds give parallax as the camera moves.
    this.clouds = [
      new Layer({ height: 120, size: 1400, scale: 0.0045, cover: 0.5, wind: [0.018, 0.006], opacity: 0.75 }),
      new Layer({ height: 170, size: 1600, scale: 0.0032, cover: 0.55, wind: [0.011, 0.004], opacity: 0.6 }),
      new Layer({ height: 240, size: 1900, scale: 0.0022, cover: 0.58, wind: [0.006, 0.002], opacity: 0.5 }),
    ]
    // Low drifting mist just above the water.
    this.mist = new Layer({ height: 1.6, size: 360, scale: 0.03, cover: 0.42, wind: [0.05, 0.02], opacity: 0.32 })

    this.group.add(dome, ...this.clouds.map((l) => l.mesh), this.mist.mesh)
  }

  update(t: number, camera: Vector3) {
    this.dome.position.copy(camera)
    this.dome.material.uniforms.uTime.value = t
    const ct = this.cloudsAnimated ? t : 0
    for (const l of this.clouds) {
      l.mesh.position.x = camera.x
      l.mesh.position.z = camera.z
      l.mesh.material.uniforms.uTime.value = ct
    }
    this.mist.mesh.position.x = camera.x
    this.mist.mesh.position.z = camera.z
    this.mist.mesh.material.uniforms.uTime.value = ct
  }

  applyEnv(env: EnvState) {
    const u = this.dome.material.uniforms
    u.uZenith.value.copy(env.skyZenith)
    u.uHorizon.value.copy(env.skyHorizon)
    u.uFog.value.copy(env.fogColor)
    u.uSunDir.value.copy(env.sunDir)
    u.uSunColor.value.copy(env.sunColor).multiplyScalar(0.6 + env.sunIntensity * 0.25)
    u.uSize.value = env.celestialSize
    u.uStars.value = env.stars
    for (const l of this.clouds) {
      const cu = l.mesh.material.uniforms
      cu.uOpacity.value = l.config.opacity * env.clouds
      cu.uColor.value.copy(env.cloudColor)
      cu.uShade.value.copy(env.cloudColor).lerp(env.skyZenith, 0.45)
    }
    const mu = this.mist.mesh.material.uniforms
    mu.uOpacity.value = this.mist.config.opacity * env.mist
    mu.uColor.value.copy(env.fogColor).lerp(WHITE, 0.08)
    mu.uShade.value.copy(env.fogColor)
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof Mesh) {
        o.geometry.dispose()
        o.material.dispose()
      }
    })
  }
}
