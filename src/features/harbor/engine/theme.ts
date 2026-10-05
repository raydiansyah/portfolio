import gsap from 'gsap'
import { Color, Vector3 } from 'three'

/**
 * Two world presets (night rain / clear morning) and a staged blender.
 * Each value belongs to a group; groups are tweened with offsets so the world
 * changes in order: lighting -> sky -> weather -> water (never an instant swap).
 */

export interface EnvState {
  // lighting
  sunDir: Vector3
  sunColor: Color
  sunIntensity: number
  hemiSky: Color
  hemiGround: Color
  hemiIntensity: number
  lantern: number
  foliage: Color
  exposure: number
  // sky
  skyZenith: Color
  skyHorizon: Color
  fogColor: Color
  fogDensity: number
  stars: number
  celestialSize: number
  // weather
  rain: number
  clouds: number
  cloudColor: Color
  birds: number
  mist: number
  // water
  waterDeep: Color
  waterShallow: Color
  waterSpec: number
  sparkle: number
}

type Group = 'lighting' | 'sky' | 'weather' | 'water'

const GROUP_OF: Record<keyof EnvState, Group> = {
  sunDir: 'lighting', sunColor: 'lighting', sunIntensity: 'lighting', hemiSky: 'lighting',
  hemiGround: 'lighting', hemiIntensity: 'lighting', lantern: 'lighting', foliage: 'lighting', exposure: 'lighting',
  skyZenith: 'sky', skyHorizon: 'sky', fogColor: 'sky', fogDensity: 'sky', stars: 'sky', celestialSize: 'sky',
  rain: 'weather', clouds: 'weather', cloudColor: 'weather', birds: 'weather', mist: 'weather',
  waterDeep: 'water', waterShallow: 'water', waterSpec: 'water', sparkle: 'water',
}

const c = (hex: string) => new Color(hex)
const v = (x: number, y: number, z: number) => new Vector3(x, y, z).normalize()

export const NIGHT: EnvState = {
  sunDir: v(-0.45, 0.5, 0.75),
  sunColor: c('#a9bcd9'),
  sunIntensity: 0.8,
  hemiSky: c('#6d809e'),
  hemiGround: c('#161d24'),
  hemiIntensity: 0.95,
  lantern: 1,
  foliage: c('#95a2aa'),
  exposure: 1.18,
  skyZenith: c('#0a111c'),
  skyHorizon: c('#2b3644'),
  fogColor: c('#1e2733'),
  fogDensity: 0.0115,
  stars: 0.55,
  celestialSize: 0.018,
  rain: 1,
  clouds: 0.55,
  cloudColor: c('#2a323e'),
  birds: 0,
  mist: 0.9,
  waterDeep: c('#05090e'),
  waterShallow: c('#16212c'),
  waterSpec: 0.7,
  sparkle: 0,
}

export const MORNING: EnvState = {
  sunDir: v(0.55, 0.62, 0.35),
  sunColor: c('#fff1da'),
  sunIntensity: 2.3,
  hemiSky: c('#d4e3ef'),
  hemiGround: c('#6c7457'),
  hemiIntensity: 0.95,
  lantern: 0.12,
  foliage: c('#ffffff'),
  exposure: 1,
  skyZenith: c('#79a2c6'),
  skyHorizon: c('#e0e8ea'),
  fogColor: c('#d2dce1'),
  fogDensity: 0.0062,
  stars: 0,
  celestialSize: 0.028,
  rain: 0,
  clouds: 0.95,
  cloudColor: c('#ffffff'),
  birds: 1,
  mist: 0.22,
  waterDeep: c('#2f5263'),
  waterShallow: c('#7da2a6'),
  waterSpec: 1,
  sparkle: 1,
}

/** Mix 0 = night, 1 = morning, per group. */
export type ThemeMix = Record<Group, number>

export const GROUP_TIMING: Record<Group, { delay: number; duration: number }> = {
  lighting: { delay: 0, duration: 0.8 },
  sky: { delay: 0.4, duration: 1.0 },
  weather: { delay: 0.8, duration: 1.0 },
  water: { delay: 1.2, duration: 1.2 },
}

export function createEnv(): EnvState {
  const e = {} as Record<string, unknown>
  for (const [k, val] of Object.entries(NIGHT)) e[k] = typeof val === 'number' ? val : (val as Color | Vector3).clone()
  return e as unknown as EnvState
}

/** Write the blended state into `out` (allocation-free; called every frame during transitions). */
export function blendEnv(out: EnvState, mix: ThemeMix) {
  const o = out as unknown as Record<string, unknown>
  for (const key of Object.keys(NIGHT) as (keyof EnvState)[]) {
    const t = mix[GROUP_OF[key]]
    const a = NIGHT[key]
    const b = MORNING[key]
    if (typeof a === 'number') o[key] = a + ((b as number) - a) * t
    else if (a instanceof Color) (o[key] as Color).lerpColors(a, b as Color, t)
    else (o[key] as Vector3).lerpVectors(a as Vector3, b as Vector3, t).normalize()
  }
}

/** Tween every group toward night (0) or morning (1) with its staged delay. */
export function tweenTheme(mix: ThemeMix, isDark: boolean, reduced: boolean, onUpdate: () => void) {
  const target = isDark ? 0 : 1
  for (const g of Object.keys(GROUP_TIMING) as Group[]) {
    const { delay, duration } = GROUP_TIMING[g]
    gsap.killTweensOf(mix, g)
    gsap.to(mix, {
      [g]: target,
      delay: reduced ? 0 : delay,
      duration: reduced ? 0.3 : duration,
      ease: 'power2.inOut',
      onUpdate,
    })
  }
}
