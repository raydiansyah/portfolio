import type { Tier } from '../types'

/** Distance thresholds (m) for marker / title / enter. */
export const TIER_DISTANCES = [25, 15, 8] as const
/** Hysteresis band so labels don't flicker at a boundary. */
export const TIER_HYSTERESIS = 1.5

/**
 * Tier for a distance, sticky around boundaries: to go up a tier you must be
 * inside the threshold; to drop you must be beyond threshold + hysteresis.
 */
export function tierFor(distance: number, previous: Tier): Tier {
  let raw: Tier = 0
  if (distance < TIER_DISTANCES[2]) raw = 3
  else if (distance < TIER_DISTANCES[1]) raw = 2
  else if (distance < TIER_DISTANCES[0]) raw = 1

  if (raw >= previous) return raw
  // Dropping: only allow it once clearly past the previous tier's threshold.
  const threshold = TIER_DISTANCES[previous - 1]
  return distance > threshold + TIER_HYSTERESIS ? raw : previous
}

/** A destination counts as discovered once its title tier is reached. */
export const DISCOVER_TIER: Tier = 2
