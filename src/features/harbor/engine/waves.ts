/**
 * Calm wetland swell: a small sum of directional sine waves.
 * The same constants are injected into the water vertex shader (see WAVES_GLSL)
 * so boat bobbing on the CPU matches the rendered surface exactly.
 */

export interface Wave {
  /** Normalised travel direction in XZ. */
  dx: number
  dz: number
  amplitude: number
  wavelength: number
  speed: number
}

const norm = (x: number, z: number) => {
  const l = Math.hypot(x, z)
  return { dx: x / l, dz: z / l }
}

export const WAVES: Wave[] = [
  { ...norm(1, 0.35), amplitude: 0.14, wavelength: 26, speed: 1.6 },
  { ...norm(-0.45, 1), amplitude: 0.08, wavelength: 13, speed: 1.15 },
  { ...norm(0.7, -0.8), amplitude: 0.045, wavelength: 8.5, speed: 0.9 },
]

const TAU = Math.PI * 2

export function waveHeight(x: number, z: number, t: number, waves: Wave[] = WAVES): number {
  let h = 0
  for (const w of waves) {
    const k = TAU / w.wavelength
    h += w.amplitude * Math.sin(k * (w.dx * x + w.dz * z) - k * w.speed * t)
  }
  return h
}

/** Analytic surface normal (unnormalised slope form, then normalised). */
export function waveNormal(x: number, z: number, t: number, waves: Wave[] = WAVES) {
  let sx = 0
  let sz = 0
  for (const w of waves) {
    const k = TAU / w.wavelength
    const c = w.amplitude * k * Math.cos(k * (w.dx * x + w.dz * z) - k * w.speed * t)
    sx += c * w.dx
    sz += c * w.dz
  }
  const l = Math.hypot(sx, 1, sz)
  return { x: -sx / l, y: 1 / l, z: -sz / l }
}

/** GLSL mirror of `waveHeight` / slope, generated from the same constants. */
export const WAVES_GLSL = /* glsl */ `
const int WAVE_COUNT = ${WAVES.length};
const vec4 WAVE_DIR_AMP[WAVE_COUNT] = vec4[](${WAVES.map(
  (w) => `vec4(${w.dx.toFixed(5)}, ${w.dz.toFixed(5)}, ${w.amplitude.toFixed(4)}, 0.0)`,
).join(', ')});
const vec2 WAVE_K_SPEED[WAVE_COUNT] = vec2[](${WAVES.map(
  (w) => `vec2(${(TAU / w.wavelength).toFixed(5)}, ${w.speed.toFixed(4)})`,
).join(', ')});

// Returns height in .x and slope (dh/dx, dh/dz) in .yz
vec3 waveSample(vec2 p, float t) {
  vec3 r = vec3(0.0);
  for (int i = 0; i < WAVE_COUNT; i++) {
    vec4 da = WAVE_DIR_AMP[i];
    vec2 ks = WAVE_K_SPEED[i];
    float ph = ks.x * dot(da.xy, p) - ks.x * ks.y * t;
    r.x += da.z * sin(ph);
    float c = da.z * ks.x * cos(ph);
    r.yz += c * da.xy;
  }
  return r;
}
`
