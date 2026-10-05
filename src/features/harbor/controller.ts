import { CAMERA_VIEWS, STORAGE_VIEW, harborStore } from './store'
import type { CameraViewId, DestinationId, PanelId } from './types'

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

  /** Open content directly (menu, deep link, fallback, buoy detail). */
  openPanel(panel: PanelId, projectIndex?: number) {
    engine?.setInputEnabled(false)
    harborStore.set((s) => ({
      activePanel: panel,
      projectIndex: projectIndex ?? s.projectIndex,
      phase: s.phase === 'project' && panel === 'project-detail' ? 'project' : 'panel',
      menuOpen: false,
      mapOpen: false,
    }))
    setHash(panel)
  },

  closePanel(fromHistory = false) {
    const s = harborStore.get()
    if (!s.activePanel) return
    const inProject = s.activePanel === 'project-detail' && s.phase === 'project'
    harborStore.set({ activePanel: null, phase: inProject ? 'project' : 'explore' })
    if (pushedHistory && !fromHistory) {
      pushedHistory = false
      history.back()
    } else {
      pushedHistory = false
      history.replaceState(null, '', location.pathname)
    }
    engine?.setInputEnabled(true)
    if (!inProject) engine?.undock()
  },

  viewProject(index: number) {
    actions.openPanel('project-detail', index)
  },

  leaveProjects() {
    engine?.leaveProjectMode()
    harborStore.set({ phase: 'explore', projectNearest: null })
  },

  navigateTo(id: DestinationId, auto: boolean) {
    harborStore.set({ waypoint: id, autopilot: auto, mapOpen: false, menuOpen: false })
    engine?.setWaypoint(id, auto)
  },

  clearWaypoint() {
    harborStore.set({ waypoint: null, autopilot: false })
    engine?.setWaypoint(null, false)
  },

  toggleMap(open?: boolean) {
    const next = open ?? !harborStore.get().mapOpen
    harborStore.set({ mapOpen: next, menuOpen: false })
    engine?.setInputEnabled(!next && !harborStore.get().activePanel)
  },

  toggleMenu(open?: boolean) {
    const next = open ?? !harborStore.get().menuOpen
    harborStore.set({ menuOpen: next, mapOpen: false })
    engine?.setInputEnabled(!next && !harborStore.get().activePanel)
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
