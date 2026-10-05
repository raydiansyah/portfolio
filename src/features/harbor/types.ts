/** Shared types for the harbor world (engine <-> React contract). */

export type DestinationId = 'portfolio' | 'projects' | 'about' | 'experience' | 'services' | 'contact'

export type Vec2 = { x: number; z: number }

export interface Destination {
  id: DestinationId
  /** 1-based order used for "01 / 06" counters and number-key shortcuts. */
  index: number
  /** Short code drawn on the minimap. */
  code: string
  label: string
  tagline: string
  /** Pier tip in world space (meters). The boat berths just beyond it. */
  dock: Vec2
  /** Direction the pier points (radians, 0 = +Z), i.e. from island toward open water. */
  facing: number
  /** Radius of the island behind the pier. */
  islandRadius: number
}

export interface Secret {
  id: string
  label: string
  title: string
  body: string
  position: Vec2
}

/** Distance tiers for progressive discovery. 0 = hidden, 1 = marker, 2 = title, 3 = enter. */
export type Tier = 0 | 1 | 2 | 3

export type Phase = 'loading' | 'intro' | 'explore' | 'docking' | 'panel' | 'project'

export type PanelId = DestinationId | 'project-detail' | 'portfolio-list'

export type InputDevice = 'keyboard' | 'mouse' | 'touch'

export type QualityTier = 'high' | 'medium' | 'low'

/** Events the engine pushes to the UI layer. */
export type EngineEvent =
  | { type: 'progress'; value: number }
  | { type: 'ready' }
  | { type: 'intro-done' }
  | { type: 'first-input'; device: InputDevice }
  | { type: 'device'; device: InputDevice }
  | { type: 'nearest'; id: DestinationId; tier: Tier; distance: number }
  | { type: 'discovered'; id: DestinationId }
  | { type: 'secret'; id: string }
  | { type: 'arrived'; id: DestinationId }
  | { type: 'autopilot'; active: boolean }
  | { type: 'project-nearest'; index: number | null }
  | { type: 'moved'; distance: number }
  | { type: 'harbor-click'; id: DestinationId }
  | { type: 'project-click'; index: number }
