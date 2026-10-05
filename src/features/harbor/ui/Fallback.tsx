import { actions } from '../controller'
import { PROFILE } from '../data/content'
import { DESTINATIONS } from '../data/destinations'

const pad = (n: number) => String(n).padStart(2, '0')

/** Static editorial index shown when WebGL is unavailable. */
export function Fallback() {
  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex max-w-4xl flex-col px-6 py-16 md:py-24">
        <p className="hud-label text-muted-foreground">{PROFILE.location}</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight uppercase md:text-6xl">{PROFILE.name}</h1>
        <p className="mt-2 font-mono text-sm text-muted-foreground">{PROFILE.role}</p>
        <p className="mt-10 max-w-md text-sm leading-relaxed text-muted-foreground">
          Your browser can&apos;t render the 3D harbor, so here is the map.
        </p>

        <nav aria-label="Destinations" className="mt-10 border-t border-border">
          <ul className="grid md:grid-cols-2 md:gap-x-10">
            {DESTINATIONS.map((d) => (
              <li key={d.id} className="border-b border-border">
                <button
                  type="button"
                  onClick={() => actions.openPanel(d.id === 'portfolio' ? 'portfolio-list' : d.id)}
                  className="group flex min-h-11 w-full items-baseline gap-4 py-5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                >
                  <span className="hud-label text-muted-foreground">{pad(d.index)}</span>
                  <span className="flex flex-col">
                    <span className="text-xl font-semibold tracking-tight uppercase transition-colors group-hover:text-lantern">
                      {d.label}
                    </span>
                    <span className="mt-1 text-sm text-muted-foreground">{d.tagline}</span>
                  </span>
                  <span aria-hidden className="ml-auto font-mono text-muted-foreground transition-transform group-hover:translate-x-1">
                    →
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </main>
  )
}

export default Fallback
