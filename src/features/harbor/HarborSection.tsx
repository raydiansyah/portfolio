import { useEffect, useRef, useState } from 'react'
import { actions, attachEngine, bindHistory, getEngine, panelFromHash } from './controller'
import { DESTINATIONS } from './data/destinations'
import { FEATURED_PROJECTS, PROJECTS } from './data/content'
import { harborStore, useHarbor } from './store'
import type { HarborEngine, Intent } from './engine/HarborEngine'
import { detectTier, hasWebGL } from './engine/quality'
import ContentPanel from './ui/ContentPanel'
import DestinationMenu from './ui/DestinationMenu'
import EnterButton from './ui/EnterButton'
import Fallback from './ui/Fallback'
import HarborLabels from './ui/HarborLabels'
import Hud from './ui/Hud'
import Joystick from './ui/Joystick'
import ProjectIslandHud from './ui/ProjectIslandHud'
import WorldMap from './ui/WorldMap'

interface Props {
  isDark: boolean
  onToggleTheme: () => void
}

const isTypingTarget = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName))

/** Engine intents (taps on harbors/buoys, Enter key) become UI actions here. */
function handleIntent(intent: Intent) {
  const s = harborStore.get()
  if (s.activePanel || s.phase === 'docking') return
  if (intent.type === 'project') {
    actions.viewProject(PROJECTS.indexOf(FEATURED_PROJECTS[intent.index]))
    return
  }
  if (s.phase === 'project' && intent.id === 'portfolio') return
  // Close enough to enter -> dock; otherwise sail there.
  if (s.tiers[intent.id] === 3) void actions.enter(intent.id)
  else actions.navigateTo(intent.id, true)
}

/**
 * The whole page: one pinned, full-viewport section hosting the 3D harbor,
 * its HUD and the content overlays. WebGL-less browsers get a static fallback.
 */
export default function HarborSection({ isDark, onToggleTheme }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const engineRef = useRef<HarborEngine | null>(null)
  const [webgl] = useState(hasWebGL)
  const [touch, setTouch] = useState(() => matchMedia('(pointer: coarse)').matches)
  const phase = useHarbor((s) => s.phase)
  const darkRef = useRef(isDark)
  darkRef.current = isDark

  // Environment flags: reduced motion, touch, WebGL availability.
  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)')
    const coarse = matchMedia('(pointer: coarse)')
    const sync = () => {
      harborStore.set({ reducedMotion: motion.matches, webgl, inputDevice: coarse.matches ? 'touch' : harborStore.get().inputDevice })
      setTouch(coarse.matches)
    }
    sync()
    motion.addEventListener('change', sync)
    coarse.addEventListener('change', sync)
    return () => {
      motion.removeEventListener('change', sync)
      coarse.removeEventListener('change', sync)
    }
  }, [webgl])

  // Engine lifecycle. Loaded lazily so the HUD paints before three.js is parsed.
  useEffect(() => {
    if (!webgl || !host.current) return
    let cancelled = false
    const container = host.current
    void import('./engine/HarborEngine').then(async ({ HarborEngine }) => {
      if (cancelled) return
      const engine = await HarborEngine.create({
        container,
        isDark: darkRef.current,
        reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
        tier: detectTier(),
        onIntent: handleIntent,
      })
      if (cancelled) return engine.dispose()
      engineRef.current = engine
      attachEngine(engine)
    })
    return () => {
      cancelled = true
      attachEngine(null)
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [webgl])

  useEffect(() => {
    engineRef.current?.setTheme(isDark)
  }, [isDark])

  // Deep links + Back button.
  useEffect(() => {
    // Dev-only handle for manual testing from the console; stripped from production builds.
    if (import.meta.env.DEV) Object.assign(window, { __harbor: { actions, harborStore, getEngine } })
    const panel = panelFromHash()
    if (panel) actions.openPanel(panel)
    return bindHistory()
  }, [])

  // Global shortcuts: M map, Esc close/cancel, Enter interact, 1–6 waypoint.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return
      const s = harborStore.get()
      const overlayOpen = !!s.activePanel || s.mapOpen || s.menuOpen
      if (e.key === 'Escape') {
        if (s.autopilot && !overlayOpen) actions.clearWaypoint()
        return // dialogs close themselves on Escape
      }
      if (overlayOpen) return
      if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        actions.toggleMap(true)
      } else if (e.key === 'Enter' && !(e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement)) {
        actions.interact()
      } else if (/^[1-6]$/.test(e.key)) {
        actions.navigateTo(DESTINATIONS[Number(e.key) - 1].id, false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!webgl) {
    return (
      <>
        <Fallback />
        <ContentPanel />
        <DestinationMenu />
      </>
    )
  }

  return (
    <main className="h-dvh w-full">
      <section
        aria-label="Explore the portfolio by boat"
        className="sticky top-0 h-dvh w-full overflow-hidden bg-[#1e2733] select-none [html:not(.dark)_&]:bg-[#d2dce1]"
      >
        <button
          type="button"
          onClick={() => actions.toggleMenu(true)}
          className="hud-label absolute left-4 top-4 z-50 -translate-y-24 rounded-md border bg-panel px-4 py-3 text-hud backdrop-blur-sm transition-transform focus-visible:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Skip exploration — open menu
        </button>

        <div ref={host} className="absolute inset-0" aria-busy={phase === 'loading'} />
        <HarborLabels />
        <ProjectIslandHud />
        <Hud isDark={isDark} onToggleTheme={onToggleTheme} />
        {touch && (
          <>
            <Joystick />
            <EnterButton />
          </>
        )}
      </section>
      <ContentPanel />
      <DestinationMenu />
      <WorldMap />
    </main>
  )
}
