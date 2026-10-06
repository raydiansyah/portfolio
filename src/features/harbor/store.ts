import { useSyncExternalStore } from 'react'
import type { CameraViewId, DestinationId, InputDevice, PanelBack, PanelId, Phase, QualityTier, Tier } from './types'

/**
 * Low-frequency UI state shared between the engine and React.
 * High-frequency values (positions, heading, speed) live in `telemetry` and are
 * read by HUD widgets inside their own rAF loops to avoid React re-renders.
 */
export interface HarborState {
  phase: Phase
  loadProgress: number
  webgl: boolean
  reducedMotion: boolean
  quality: QualityTier
  inputDevice: InputDevice
  hasMoved: boolean
  introDone: boolean
  hintsVisible: boolean
  /** Nearest destination overall (drives the 01 / 06 counter). */
  nearest: { id: DestinationId; distance: number } | null
  /** Per-destination discovery tier (0 hidden … 3 enter). */
  tiers: Record<DestinationId, Tier>
  discovered: DestinationId[]
  secrets: string[]
  activePanel: PanelId | null
  /** Back target for the open panel (menu, map or the list it came from). */
  panelBack: PanelBack | null
  projectIndex: number
  projectNearest: number | null
  waypoint: DestinationId | null
  autopilot: boolean
  mapOpen: boolean
  menuOpen: boolean
  cameraView: CameraViewId
  toasts: Toast[]
}

export type Toast =
  | { key: number; kind: 'discovered'; id: DestinationId }
  | { key: number; kind: 'secret'; id: string }
  | { key: number; kind: 'arrived'; id: DestinationId }

const STORAGE_DISCOVERED = 'harbor:discovered'
const STORAGE_SECRETS = 'harbor:secrets'
export const STORAGE_VIEW = 'harbor:view'
/** Cycle order for the VIEW button, `C` key and right-click. */
export const CAMERA_VIEWS: CameraViewId[] = ['chase', 'close', 'aerial', 'cinematic']

function readView(): CameraViewId {
  try {
    const v = localStorage.getItem(STORAGE_VIEW) as CameraViewId | null
    return v && CAMERA_VIEWS.includes(v) ? v : 'chase'
  } catch {
    return 'chase'
  }
}

function readList<T extends string>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T[]) : []
  } catch {
    return []
  }
}

function writeList(key: string, list: string[]) {
  try {
    localStorage.setItem(key, JSON.stringify(list))
  } catch {
    /* storage unavailable: progress is session-only */
  }
}

const emptyTiers: Record<DestinationId, Tier> = {
  portfolio: 0,
  projects: 0,
  about: 0,
  experience: 0,
  services: 0,
  contact: 0,
}

let state: HarborState = {
  phase: 'loading',
  loadProgress: 0,
  webgl: true,
  reducedMotion: false,
  quality: 'high',
  inputDevice: 'keyboard',
  hasMoved: false,
  introDone: false,
  hintsVisible: true,
  nearest: null,
  tiers: { ...emptyTiers },
  discovered: readList<DestinationId>(STORAGE_DISCOVERED),
  secrets: readList<string>(STORAGE_SECRETS),
  activePanel: null,
  panelBack: null,
  projectIndex: 0,
  projectNearest: null,
  waypoint: null,
  autopilot: false,
  mapOpen: false,
  menuOpen: false,
  cameraView: readView(),
  toasts: [],
}

const listeners = new Set<() => void>()
let toastKey = 0

export const harborStore = {
  get: () => state,
  set(patch: Partial<HarborState> | ((s: HarborState) => Partial<HarborState>)) {
    const next = typeof patch === 'function' ? patch(state) : patch
    state = { ...state, ...next }
    listeners.forEach((l) => l())
  },
  subscribe(listener: () => void) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },
  markDiscovered(id: DestinationId) {
    if (state.discovered.includes(id)) return false
    const discovered = [...state.discovered, id]
    writeList(STORAGE_DISCOVERED, discovered)
    harborStore.set({ discovered })
    harborStore.pushToast({ kind: 'discovered', id })
    return true
  },
  markSecret(id: string) {
    if (state.secrets.includes(id)) return false
    const secrets = [...state.secrets, id]
    writeList(STORAGE_SECRETS, secrets)
    harborStore.set({ secrets })
    harborStore.pushToast({ kind: 'secret', id })
    return true
  },
  pushToast(toast: Omit<Toast, 'key'>) {
    const t = { ...toast, key: ++toastKey } as Toast
    harborStore.set((s) => ({ toasts: [...s.toasts, t].slice(-3) }))
  },
  dismissToast(key: number) {
    harborStore.set((s) => ({ toasts: s.toasts.filter((t) => t.key !== key) }))
  },
}

/** Subscribe to a slice of harbor state. Selectors must return stable values (primitives or stored refs). */
export function useHarbor<T>(selector: (s: HarborState) => T): T {
  return useSyncExternalStore(
    harborStore.subscribe,
    () => selector(state),
    () => selector(state),
  )
}

/** Projected screen label for a world anchor; written by the engine every frame. */
export interface LabelAnchor {
  x: number
  y: number
  visible: boolean
}

/** Mutable per-frame data written by the engine and read by HUD rAF loops. */
export const telemetry = {
  boat: { x: 0, z: 0, yaw: 0, speed: 0, momentum: 0 },
  camera: { x: 0, y: 0, z: 0 },
  /** Keyed by destination id. */
  labels: {} as Record<string, LabelAnchor>,
  /** Project buoy labels, by index. */
  projectLabels: [] as LabelAnchor[],
  /** Smoothed waypoint path (world XZ) for minimap / world map. */
  path: [] as { x: number; z: number }[],
  fps: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
}
