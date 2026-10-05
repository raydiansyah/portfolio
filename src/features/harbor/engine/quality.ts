import type { QualityTier } from '../types'

export interface QualitySettings {
  tier: QualityTier
  dprCap: number
  antialias: boolean
  shadows: boolean
  rain: number
  vegetation: number
  waterSegments: number
  birds: number
  ripples: number
  wakePoints: number
}

const PRESETS: Record<QualityTier, Omit<QualitySettings, 'tier'>> = {
  high: { dprCap: 1.75, antialias: true, shadows: true, rain: 5000, vegetation: 1, waterSegments: 192, birds: 12, ripples: 32, wakePoints: 24 },
  medium: { dprCap: 1.25, antialias: false, shadows: false, rain: 2000, vegetation: 0.6, waterSegments: 128, birds: 6, ripples: 24, wakePoints: 20 },
  low: { dprCap: 1, antialias: false, shadows: false, rain: 800, vegetation: 0.35, waterSegments: 96, birds: 0, ripples: 16, wakePoints: 16 },
}

export function settingsFor(tier: QualityTier, reducedMotion: boolean): QualitySettings {
  const s = { tier, ...PRESETS[tier] }
  if (reducedMotion) {
    s.rain = Math.round(s.rain * 0.3)
    s.birds = 0
  }
  return s
}

/** Heuristic first guess; the FPS monitor can still step down at runtime. */
export function detectTier(): QualityTier {
  const nav = navigator as Navigator & { deviceMemory?: number }
  const coarse = matchMedia('(pointer: coarse)').matches
  const small = Math.min(screen.width, screen.height) < 700
  const cores = nav.hardwareConcurrency ?? 4
  const memory = nav.deviceMemory ?? 8
  if (coarse && (small || memory <= 4)) return 'low'
  if (coarse || cores <= 4 || memory <= 4) return 'medium'
  return 'high'
}

export function hasWebGL(): boolean {
  if (new URLSearchParams(location.search).has('nowebgl')) return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

/** Rolling FPS average; reports when it stays below a floor long enough to warrant a downgrade. */
export class FpsMonitor {
  fps = 60
  private frames = 0
  private elapsed = 0
  private lowFor = 0

  /** Returns true when a downgrade is recommended. */
  tick(dt: number): boolean {
    this.frames++
    this.elapsed += dt
    if (this.elapsed < 1) return false
    this.fps = this.frames / this.elapsed
    this.frames = 0
    this.elapsed = 0
    this.lowFor = this.fps < 40 ? this.lowFor + 1 : 0
    if (this.lowFor >= 3) {
      this.lowFor = -5 // give the new settings time to settle
      return true
    }
    return false
  }
}

export const nextLowerTier = (t: QualityTier): QualityTier | null => (t === 'high' ? 'medium' : t === 'medium' ? 'low' : null)
