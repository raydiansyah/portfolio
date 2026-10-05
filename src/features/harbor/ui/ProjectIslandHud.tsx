import { useEffect, useRef } from 'react'
import { actions } from '../controller'
import { FEATURED_PROJECTS, PROJECTS } from '../data/content'
import { telemetry, useHarbor } from '../store'

const KEYFRAMES = `@keyframes harbor-label-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`

const pad = (n: number) => String(n).padStart(2, '0')

/** HUD for Portfolio Island: buoy labels + a top bar with list/leave actions. */
export default function ProjectIslandHud() {
  const phase = useHarbor((s) => s.phase)
  const activePanel = useHarbor((s) => s.activePanel)
  if (phase !== 'project' || activePanel !== null) return null
  return <ProjectIslandLayer />
}

function ProjectIslandLayer() {
  const nearest = useHarbor((s) => s.projectNearest)
  const reducedMotion = useHarbor((s) => s.reducedMotion)
  const anchors = useRef<(HTMLDivElement | null)[]>([])

  // Per-frame placement from engine-projected buoy anchors.
  useEffect(() => {
    let raf = 0
    const tick = () => {
      anchors.current.forEach((el, i) => {
        if (!el) return
        const a = telemetry.projectLabels[i]
        if (!a || !a.visible) {
          el.style.visibility = 'hidden'
          return
        }
        el.style.visibility = 'visible'
        el.style.transform = `translate3d(${a.x}px, ${a.y}px, 0) translate(-50%, -100%)`
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  const enter = reducedMotion ? undefined : { animation: 'harbor-label-in 200ms ease-out both' }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <style>{KEYFRAMES}</style>

      {FEATURED_PROJECTS.map((project, i) => {
        const code = `Project ${pad(i + 1)}`
        const isNearest = nearest === i
        return (
          <div
            key={project.id}
            ref={(el) => {
              anchors.current[i] = el
            }}
            className="absolute top-0 left-0 pb-2 will-change-transform"
            style={{ visibility: 'hidden' }}
          >
            {isNearest ? (
              <div key="card" style={enter} className="w-[220px] rounded-md border border-border bg-panel p-4 backdrop-blur-sm">
                <span className="hud-label text-hud-dim">{code}</span>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-hud">{project.title}</h3>
                <p className="mt-0.5 text-xs text-hud-dim">{project.category}</p>
                <button
                  type="button"
                  onClick={() => actions.viewProject(PROJECTS.indexOf(project))}
                  aria-label={`View project ${project.title}`}
                  className="pointer-events-auto mt-4 inline-flex min-h-11 w-full items-center justify-between rounded-sm border border-hud/40 px-3 font-mono text-[11px] tracking-[0.18em] text-hud uppercase transition-colors hover:border-lantern hover:text-lantern focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  View project <span aria-hidden>→</span>
                </button>
              </div>
            ) : (
              <div key="marker" style={enter} className="flex flex-col items-center gap-1.5">
                <span className="hud-label text-hud-dim">{code}</span>
                <span className="block size-1.5 rounded-full border border-hud" />
              </div>
            )}
          </div>
        )
      })}

      <div className="absolute top-24 left-1/2 w-[min(calc(100%-2rem),560px)] -translate-x-1/2">
        <div className="pointer-events-auto flex flex-col gap-3 rounded-md border border-border bg-panel px-4 py-3 backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="hud-label text-hud">Project Island</p>
            <p className="mt-0.5 text-xs text-hud-dim">Sail to a buoy to view a project</p>
          </div>
          <div className="flex gap-2">
            <BarButton onClick={() => actions.openPanel('portfolio-list')}>List view</BarButton>
            <BarButton onClick={() => actions.leaveProjects()}>← Leave island</BarButton>
          </div>
        </div>
      </div>
    </div>
  )
}

function BarButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center rounded-sm border border-border px-3 font-mono text-[11px] tracking-[0.14em] text-hud uppercase transition-colors hover:border-lantern hover:text-lantern focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
    >
      {children}
    </button>
  )
}
