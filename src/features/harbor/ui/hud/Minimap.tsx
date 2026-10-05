import { useEffect, useRef, useState } from 'react'
import { actions } from '../../controller'
import { harborStore, telemetry } from '../../store'
import { DESTINATIONS, islandCentre } from '../../data/destinations'
import { SECRETS } from '../../data/discoveries'

const RANGE = 130 // meters from centre to edge
const FRAME_MS = 66 // ~15 fps
const SMALL_QUERY = '(max-width: 640px)'

type Palette = { hud: string; dim: string; lantern: string }

function readPalette(): Palette {
  const css = getComputedStyle(document.documentElement)
  return {
    hud: css.getPropertyValue('--hud').trim() || '#333',
    dim: css.getPropertyValue('--hud-dim').trim() || '#888',
    lantern: css.getPropertyValue('--lantern').trim() || '#c80',
  }
}

function draw(ctx: CanvasRenderingContext2D, size: number, colors: Palette) {
  const { x: bx, z: bz, yaw } = telemetry.boat
  const { discovered, secrets } = harborStore.get()
  const c = size / 2
  const scale = c / RANGE
  const sx = (wx: number) => c + (wx - bx) * scale
  const sy = (wz: number) => c - (wz - bz) * scale // north up

  ctx.clearRect(0, 0, size, size)

  // Islands
  ctx.fillStyle = colors.dim
  ctx.globalAlpha = 0.22
  for (const d of DESTINATIONS) {
    const ic = islandCentre(d)
    ctx.beginPath()
    ctx.arc(sx(ic.x), sy(ic.z), d.islandRadius * scale, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1

  // Discovered secrets
  ctx.fillStyle = colors.dim
  for (const s of SECRETS) {
    if (!secrets.includes(s.id)) continue
    ctx.fillRect(sx(s.position.x) - 1.5, sy(s.position.z) - 1.5, 3, 3)
  }

  // Waypoint path
  const path = telemetry.path
  if (path.length > 1) {
    ctx.strokeStyle = colors.lantern
    ctx.lineWidth = 1
    ctx.setLineDash([3, 3])
    ctx.beginPath()
    ctx.moveTo(sx(path[0].x), sy(path[0].z))
    for (let i = 1; i < path.length; i++) ctx.lineTo(sx(path[i].x), sy(path[i].z))
    ctx.stroke()
    ctx.setLineDash([])
  }

  // Harbors (clamped to edge when out of range)
  ctx.font = '9px "JetBrains Mono Variable", ui-monospace, monospace'
  ctx.textBaseline = 'middle'
  const edge = c - 5
  for (const d of DESTINATIONS) {
    const known = discovered.includes(d.id)
    const dx = (d.dock.x - bx) * scale
    const dy = -(d.dock.z - bz) * scale
    const over = Math.max(Math.abs(dx), Math.abs(dy)) / edge
    if (over > 1) {
      const ux = dx / over
      const uy = dy / over
      const len = Math.hypot(ux, uy) || 1
      ctx.strokeStyle = known ? colors.hud : colors.dim
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(c + ux, c + uy)
      ctx.lineTo(c + ux - (ux / len) * 4, c + uy - (uy / len) * 4)
      ctx.stroke()
      continue
    }
    const px = c + dx
    const py = c + dy
    ctx.beginPath()
    ctx.arc(px, py, 2.5, 0, Math.PI * 2)
    if (known) {
      ctx.fillStyle = colors.hud
      ctx.fill()
    } else {
      ctx.strokeStyle = colors.dim
      ctx.lineWidth = 1
      ctx.stroke()
    }
    ctx.fillStyle = known ? colors.hud : colors.dim
    ctx.fillText(known ? d.code : '?', px + 5, py)
  }

  // Boat
  ctx.save()
  ctx.translate(c, c)
  ctx.rotate(yaw) // canvas rotation is clockwise, matching yaw toward +X (east)
  ctx.fillStyle = colors.lantern
  ctx.beginPath()
  ctx.moveTo(0, -5)
  ctx.lineTo(3.5, 4)
  ctx.lineTo(-3.5, 4)
  ctx.closePath()
  ctx.fill()
  ctx.restore()

  // North marker
  ctx.fillStyle = colors.dim
  ctx.textAlign = 'center'
  ctx.fillText('N', c, 8)
  ctx.textAlign = 'start'
}

function useMinimapSize() {
  const [small, setSmall] = useState(() => window.matchMedia(SMALL_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(SMALL_QUERY)
    const onChange = () => setSmall(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return small ? 112 : 160
}

export function Minimap() {
  const size = useMinimapSize()
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let colors = readPalette()
    // Theme switches toggle `.dark` on <html>; refresh cached colors then.
    const observer = new MutationObserver(() => {
      colors = readPalette()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] })

    let raf = 0
    let last = 0
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick)
      if (now - last < FRAME_MS) return
      last = now
      draw(ctx, size, colors)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [size])

  return (
    <button
      type="button"
      aria-label="Open world map (M)"
      onClick={() => actions.toggleMap(true)}
      className="pointer-events-auto block overflow-hidden rounded-md border border-hud/15 bg-panel/50 transition-colors outline-none hover:border-hud/35 focus-visible:ring-2 focus-visible:ring-ring/60"
      style={{ width: size, height: size }}
    >
      <canvas ref={canvasRef} style={{ width: size, height: size }} className="block" />
    </button>
  )
}
