import { Color, Mesh, PlaneGeometry, ShaderMaterial, Vector3, Vector4 } from 'three'
import type { EnvState } from './theme'
import { WAVES_GLSL } from './waves'

/**
 * Water surface: vertex swell shared with CPU bobbing, fragment-level detail
 * normals, fresnel sky reflection, moon/sun specular, lantern reflection streaks,
 * rain + boat ripples and the boat wake — all analytic, no render targets.
 */

export const NOISE_GLSL = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x), mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
`

const vertexShader = /* glsl */ `
${WAVES_GLSL}
uniform float uTime;
varying vec3 vWorld;
varying vec2 vSlope;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec3 w = waveSample(world.xz, uTime);
  world.y += w.x;
  vWorld = world.xyz;
  vSlope = w.yz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const fragmentShader = /* glsl */ `
#define RIPPLES __RIPPLES__
#define WAKE __WAKE__
#define LANTERNS 16
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uZenith;
uniform vec3 uHorizon;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform float uSpec;
uniform float uSparkle;
uniform float uRain;
uniform vec3 uFogColor;
uniform float uFogDensity;
uniform vec4 uRipples[RIPPLES];
uniform vec4 uWake[WAKE];
uniform vec4 uLanterns[LANTERNS];
uniform vec3 uLanternColor;
uniform float uLantern;
varying vec3 vWorld;
varying vec2 vSlope;
${NOISE_GLSL}

// Small-scale normal detail from two scrolling noise fields (finite differences).
vec2 detailSlope(vec2 p) {
  float e = 0.15;
  vec2 q1 = p * 0.55 + vec2(uTime * 0.05, uTime * 0.03);
  vec2 q2 = p * 1.7 - vec2(uTime * 0.08, -uTime * 0.06);
  float h = vnoise(q1) + 0.5 * vnoise(q2);
  float hx = vnoise(q1 + vec2(e, 0)) + 0.5 * vnoise(q2 + vec2(e, 0));
  float hz = vnoise(q1 + vec2(0, e)) + 0.5 * vnoise(q2 + vec2(0, e));
  return vec2(hx - h, hz - h) / e;
}

void main() {
  vec2 p = vWorld.xz;
  vec2 slope = vSlope + detailSlope(p) * (0.035 + 0.03 * uRain);
  float foam = 0.0;

  // Radial ripples: rain drops (fast fade) and boat (wider, slower).
  for (int i = 0; i < RIPPLES; i++) {
    vec4 r = uRipples[i];
    float age = uTime - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 3.0) continue;
    vec2 d = p - r.xy;
    float dist = length(d);
    float speed = r.w > 1.0 ? 2.4 : 1.1;
    float radius = age * speed;
    float x = dist - radius;
    float env = exp(-x * x * 6.0) * (1.0 - age / 3.0) * min(r.w, 2.0);
    slope += (d / max(dist, 1e-3)) * sin(x * 14.0) * env * 0.35;
    foam += env * 0.05;
  }

  // Wake: trail of stern samples; foam band widens and fades with age.
  for (int i = 0; i < WAKE; i++) {
    vec4 w = uWake[i];
    float age = uTime - w.z;
    if (w.w <= 0.0 || age < 0.0 || age > 6.0) continue;
    float width = 0.45 + age * 0.4;
    vec2 d = p - w.xy;
    float dist2 = dot(d, d);
    float fade = (1.0 - age / 6.0) * w.w;
    float body = exp(-dist2 / (width * width)) * fade;
    // Two diverging crests either side of the track.
    float crest = exp(-pow(sqrt(dist2) - width * 1.3, 2.0) * 3.0) * fade;
    foam += body * 0.22 + crest * 0.08;
    slope += normalize(d + 1e-4) * crest * 0.18;
  }

  vec3 N = normalize(vec3(-slope.x, 1.0, -slope.y));
  vec3 V = normalize(cameraPosition - vWorld);
  vec3 R = reflect(-V, N);
  float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);

  vec3 sky = mix(uHorizon, uZenith, smoothstep(0.0, 0.55, R.y));
  vec3 body = mix(uDeep, uShallow, clamp(0.35 + vSlope.x * 0.8, 0.0, 1.0));
  vec3 col = mix(body, sky, clamp(fres * 0.9, 0.0, 1.0));

  float sd = max(dot(R, uSunDir), 0.0);
  col += uSunColor * (pow(sd, 220.0) * 2.2 + pow(sd, 18.0) * 0.12) * uSpec;

  // Morning glitter: sparse high-frequency highlights near the sun path.
  float glint = step(0.985, vnoise(p * 3.1 + uTime * 0.7)) * pow(sd, 6.0);
  col += uSunColor * glint * uSparkle * 1.4;

  // Lantern reflections: streaks stretched along the camera->lantern line on the water.
  for (int i = 0; i < LANTERNS; i++) {
    vec4 L = uLanterns[i];
    if (L.w <= 0.0) continue;
    vec2 cl = L.xz - cameraPosition.xz;
    float len = length(cl);
    vec2 dir = cl / max(len, 1e-3);
    vec2 cp = p - cameraPosition.xz;
    float t = dot(cp, dir) / len;
    float perp = abs(cp.x * dir.y - cp.y * dir.x);
    float wob = (vnoise(p * vec2(1.3, 4.0) + uTime * 0.6) - 0.5) * 0.6;
    float streak = exp(-pow(perp + wob * 0.6, 2.0) * 4.0) * smoothstep(0.55, 0.92, t) * smoothstep(1.04, 0.98, t);
    col += uLanternColor * streak * min(L.w, 1.2) * uLantern * 0.32 * (0.5 + 0.5 * fres);
  }

  // Foam takes the horizon tone so it stays dim at night and bright in the morning.
  col = mix(col, uHorizon * 1.35 + 0.03, clamp(foam, 0.0, 0.5));

  float dist = length(cameraPosition - vWorld);
  float fog = 1.0 - exp(-uFogDensity * uFogDensity * dist * dist);
  col = mix(col, uFogColor, fog);

  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`

export interface WaterOptions {
  segments: number
  ripples: number
  wakePoints: number
}

export class Water {
  readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>
  readonly ripples: Vector4[]
  readonly wake: Vector4[]
  readonly lanterns: Vector4[]
  private rippleCursor = 0
  private wakeCursor = 0

  constructor(opts: WaterOptions) {
    // Large plane that follows the camera in whole-cell steps so vertices don't swim.
    const geo = new PlaneGeometry(700, 700, opts.segments, opts.segments)
    geo.rotateX(-Math.PI / 2)
    this.ripples = Array.from({ length: opts.ripples }, () => new Vector4(0, 0, -100, 0))
    this.wake = Array.from({ length: opts.wakePoints }, () => new Vector4(0, 0, -100, 0))
    this.lanterns = Array.from({ length: 16 }, () => new Vector4())
    const mat = new ShaderMaterial({
      vertexShader,
      fragmentShader: fragmentShader
        .replace('__RIPPLES__', String(opts.ripples))
        .replace('__WAKE__', String(opts.wakePoints)),
      uniforms: {
        uTime: { value: 0 },
        uDeep: { value: new Color() },
        uShallow: { value: new Color() },
        uZenith: { value: new Color() },
        uHorizon: { value: new Color() },
        uSunDir: { value: new Vector3(0, 1, 0) },
        uSunColor: { value: new Color() },
        uSpec: { value: 1 },
        uSparkle: { value: 0 },
        uRain: { value: 0 },
        uFogColor: { value: new Color() },
        uFogDensity: { value: 0.01 },
        uRipples: { value: this.ripples },
        uWake: { value: this.wake },
        uLanterns: { value: this.lanterns },
        uLanternColor: { value: new Color('#ffb15c') },
        uLantern: { value: 1 },
      },
    })
    this.mesh = new Mesh(geo, mat)
    this.mesh.frustumCulled = false
    this.mesh.name = 'water'
    this.cell = 700 / opts.segments
  }

  private cell: number

  /** strength: ~0.4 rain drop, >1 boat ripple (also selects ring speed in the shader). */
  addRipple(x: number, z: number, t: number, strength: number) {
    this.ripples[this.rippleCursor].set(x, z, t, strength)
    this.rippleCursor = (this.rippleCursor + 1) % this.ripples.length
  }

  addWake(x: number, z: number, t: number, strength: number) {
    this.wake[this.wakeCursor].set(x, z, t, strength)
    this.wakeCursor = (this.wakeCursor + 1) % this.wake.length
  }

  update(t: number, camX: number, camZ: number) {
    this.mesh.material.uniforms.uTime.value = t
    this.mesh.position.set(Math.round(camX / this.cell) * this.cell, 0, Math.round(camZ / this.cell) * this.cell)
  }

  applyEnv(env: EnvState) {
    const u = this.mesh.material.uniforms
    u.uDeep.value.copy(env.waterDeep)
    u.uShallow.value.copy(env.waterShallow)
    u.uZenith.value.copy(env.skyZenith)
    u.uHorizon.value.copy(env.skyHorizon)
    u.uSunDir.value.copy(env.sunDir)
    u.uSunColor.value.copy(env.sunColor).multiplyScalar(Math.min(1.4, env.sunIntensity))
    u.uSpec.value = env.waterSpec
    u.uSparkle.value = env.sparkle
    u.uRain.value = env.rain
    u.uFogColor.value.copy(env.fogColor)
    u.uFogDensity.value = env.fogDensity
    u.uLantern.value = env.lantern
  }

  dispose() {
    this.mesh.geometry.dispose()
    this.mesh.material.dispose()
  }
}
