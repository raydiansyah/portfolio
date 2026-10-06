import { PROJECTS } from './data/content'
import { CAMERA_VIEWS, STORAGE_VIEW, harborStore } from './store'
import type { CameraViewId, DestinationId, PanelBack, PanelId } from './types'

/** Imperative surface the React layer may call on the engine. */
export interface EngineHandle {
  setTheme(isDark: boolean): void
  setJoystick(x: number, y: number): void
  setInputEnabled(enabled: boolean): void
  /** Sail to the berth and resolve when the boat has settled. */
  dockAt(id: DestinationId): Promise<void>
  /** Return camera/boat control after a panel closes. */
  undock(): void
  setWaypoint(id: DestinationId | null, auto: boolean): void
  cancelAutopilot(): void
  enterProjectMode(): Promise<void>
  leaveProjectMode(): void
  /** Dock/enter the nearest harbor or project buoy if in ENTER range. */
  interactNearest(): void
  skipIntro(): void
  setCameraView(id: CameraViewId): void
  dispose(): void
}

let engine: EngineHandle | null = null
/** True while a panel added a history entry, so Back closes it. */
let pushedHistory = false

export function attachEngine(e: EngineHandle | null) {
  engine = e
}

export function getEngine() {
  return engine
}

function setHash(panel: PanelId | null) {
  const hash = panel && panel !== 'project-detail' ? `#${panel === 'portfolio-list' ? 'portfolio' : panel}` : ''
  if (panel && !pushedHistory) {
    history.pushState({ harborPanel: true }, '', hash || location.pathname)
    pushedHistory = true
  } else {
    history.replaceState(history.state, '', hash || location.pathname)
  }
}

const LIST_PANELS: PanelId[] = ['projects', 'portfolio', 'portfolio-list']

/**
 * Back target for a panel about to open: a project picked from a list returns
 * to that list (Prev/Next between projects keeps it); anything opened from the
 * menu or map returns there.
 */
function backFor(current: PanelId | null, currentBack: PanelBack | null, next: PanelId, from?: 'menu' | 'map'): PanelBack | null {
  if (next === 'project-detail' && current && LIST_PANELS.includes(current)) return { kind: 'panel', panel: current, back: currentBack }
  if (next === 'project-detail' && current === 'project-detail') return currentBack
  return from ? { kind: from } : null
}

/**
 * Boat controls are live only when no overlay (panel, map, menu) covers the
 * world. Derive it from state instead of toggling per action, so an overlay
 * closed by another action (e.g. picking a waypoint closes the map) can never
 * leave the boat locked.
 */
function syncInput() {
  const s = harborStore.get()
  engine?.setInputEnabled(!s.activePanel && !s.mapOpen && !s.menuOpen)
}

/**
 * User intents. Every path works without the engine (WebGL fallback / skip
 * exploration) by opening content panels directly.
 */
export const actions = {
  /** Sail into a destination: dock cinematic, then open its content. */
  async enter(id: DestinationId) {
    const s = harborStore.get()
    if (s.phase === 'docking') return
    if (!engine) return actions.openPanel(id === 'portfolio' ? 'portfolio-list' : id)

    harborStore.set({ phase: 'docking', mapOpen: false, menuOpen: false, waypoint: null })
    await engine.dockAt(id)
    if (id === 'portfolio') {
      await engine.enterProjectMode()
      harborStore.set({ phase: 'project' })
      return
    }
    actions.openPanel(id)
  },

  /**
   * Open content directly (menu, deep link, fallback, buoy detail).
   * `from` names the overlay that opened it so the panel can offer Back.
   */
  openPanel(panel: PanelId, projectIndex?: number, from?: 'menu' | 'map') {
    harborStore.set((s) => ({
      activePanel: panel,
      panelBack: backFor(s.activePanel, s.panelBack, panel, from),
      projectIndex: projectIndex ?? s.projectIndex,
      phase: s.phase === 'project' && panel === 'project-detail' ? 'project' : 'panel',
      menuOpen: false,
      mapOpen: false,
    }))
    syncInput()
    setHash(panel)
  },

  /** Back button: return to the list, menu or map the panel was opened from. */
  back() {
    const b = harborStore.get().panelBack
    if (!b) return actions.closePanel()
    if (b.kind === 'panel') {
      harborStore.set({ activePanel: b.panel, panelBack: b.back, phase: 'panel' })
      setHash(b.panel)
      return
    }
    actions.closePanel()
    if (b.kind === 'menu') actions.toggleMenu(true)
    else actions.toggleMap(true)
  },

  closePanel(fromHistory = false) {
    const s = harborStore.get()
    if (!s.activePanel) return
    const inProject = s.activePanel === 'project-detail' && s.phase === 'project'
    harborStore.set({ activePanel: null, panelBack: null, phase: inProject ? 'project' : 'explore' })
    if (pushedHistory && !fromHistory) {
      pushedHistory = false
      history.back()
    } else {
      pushedHistory = false
      history.replaceState(null, '', location.pathname)
    }
    syncInput()
    if (!inProject) engine?.undock()
  },

  viewProject(index: number) {
    actions.openPanel('project-detail', index)
    const slug = PROJECTS[index]?.id
    if (slug) void import('./data/live').then((m) => m.trackProjectView(slug))
  },

  leaveProjects() {
    engine?.leaveProjectMode()
    harborStore.set({ phase: 'explore', projectNearest: null })
  },

  navigateTo(id: DestinationId, auto: boolean) {
    harborStore.set({ waypoint: id, autopilot: auto, mapOpen: false, menuOpen: false })
    syncInput()
    engine?.setWaypoint(id, auto)
  },

  clearWaypoint() {
    harborStore.set({ waypoint: null, autopilot: false })
    engine?.setWaypoint(null, false)
  },

  toggleMap(open?: boolean) {
    const next = open ?? !harborStore.get().mapOpen
    harborStore.set({ mapOpen: next, menuOpen: false })
    syncInput()
  },

  toggleMenu(open?: boolean) {
    const next = open ?? !harborStore.get().menuOpen
    harborStore.set({ menuOpen: next, mapOpen: false })
    syncInput()
  },

  interact() {
    engine?.interactNearest()
  },

  setCameraView(id: CameraViewId) {
    harborStore.set({ cameraView: id })
    try {
      localStorage.setItem(STORAGE_VIEW, id)
    } catch {
      /* storage unavailable */
    }
    engine?.setCameraView(id)
  },

  cycleCameraView() {
    const i = CAMERA_VIEWS.indexOf(harborStore.get().cameraView)
    actions.setCameraView(CAMERA_VIEWS[(i + 1) % CAMERA_VIEWS.length])
  },
}

/** Back/forward: closing the history entry closes the panel. */
export function bindHistory() {
  const onPop = () => {
    if (harborStore.get().activePanel) actions.closePanel(true)
  }
  window.addEventListener('popstate', onPop)
  return () => window.removeEventListener('popstate', onPop)
}

const PANEL_HASHES: PanelId[] = ['portfolio', 'projects', 'about', 'experience', 'services', 'contact']

/** Deep link support: `/#about` opens the About panel on load. */
export function panelFromHash(): PanelId | null {
  const h = location.hash.replace('#', '') as PanelId
  if (!PANEL_HASHES.includes(h)) return null
  return h === 'portfolio' ? 'portfolio-list' : h
}
