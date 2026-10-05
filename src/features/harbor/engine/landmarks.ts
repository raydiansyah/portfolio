import {
  AdditiveBlending, BoxGeometry, BufferGeometry, CanvasTexture, Color, ConeGeometry, CylinderGeometry,
  DoubleSide, Float32BufferAttribute, Group, Mesh, MeshBasicMaterial, MeshLambertMaterial, PlaneGeometry,
  SphereGeometry, SRGBColorSpace, Vector3,
} from 'three'
import { DESTINATION_BY_ID, facingDir } from '../data/destinations'
import { SECRETS } from '../data/discoveries'
import { FEATURED_PROJECTS } from '../data/content'
import type { EnvState } from './theme'
import type { Lanterns } from './lanterns'
import type { WoodBuilder } from './docks'
import { groundHeight } from './islands'
import type { WorldLayout } from './layout'
import { waveHeight } from './waves'

/** Portfolio Island set dressing, project buoys and the easter-egg landmarks. */

const mats = {
  white: new MeshLambertMaterial({ color: '#d9d4c7' }),
  stripe: new MeshLambertMaterial({ color: '#8c4a3a' }),
  dark: new MeshLambertMaterial({ color: '#34302b' }),
  wall: new MeshLambertMaterial({ color: '#7d6a55' }),
  roof: new MeshLambertMaterial({ color: '#3f3833' }),
  stone: new MeshLambertMaterial({ color: '#77786f', flatShading: true }),
  leaf: new MeshLambertMaterial({ color: '#36533a', flatShading: true }),
  buoy: new MeshLambertMaterial({ color: '#9a5442' }),
  window: new MeshBasicMaterial({ color: '#ffbf73' }),
}

function boardTexture(lines: [string, string, string]) {
  const canvas = document.createElement('canvas')
  canvas.width = 384
  canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e9e2d3'
  ctx.fillRect(0, 0, 384, 256)
  ctx.fillStyle = '#2b2824'
  ctx.font = '500 22px "JetBrains Mono Variable", ui-monospace, monospace'
  ctx.fillText(lines[0], 26, 48)
  ctx.font = '700 46px "Inter Variable", system-ui, sans-serif'
  ctx.fillText(lines[1], 24, 136)
  ctx.font = '400 22px "Inter Variable", system-ui, sans-serif'
  ctx.fillStyle = '#5b5650'
  ctx.fillText(lines[2], 26, 190)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  return tex
}

/** Gable roof prism (width along X, depth along Z). */
function roofGeometry(w: number, d: number, h: number) {
  const x = w / 2
  const z = d / 2
  const pos = [
    -x, 0, -z, x, 0, -z, 0, h, -z, // back gable
    -x, 0, z, 0, h, z, x, 0, z, // front gable
    -x, 0, -z, 0, h, -z, 0, h, z, -x, 0, -z, 0, h, z, -x, 0, z, // left slope
    x, 0, -z, x, 0, z, 0, h, z, x, 0, -z, 0, h, z, 0, h, -z, // right slope
  ]
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

export class Landmarks {
  readonly group = new Group()
  /** Lantern index per project buoy. */
  readonly buoyLanterns: number[] = []
  readonly buoyAnchors: Vector3[] = []
  private buoys: Group[] = []
  private beams: Mesh<ConeGeometry, MeshBasicMaterial>[] = []
  private boardMats: MeshLambertMaterial[] = []
  /** 0 = sunk, 1 = floating (tweened by the engine). */
  buoyRise = { value: 0 }

  constructor(layout: WorldLayout, wood: WoodBuilder, lanterns: Lanterns, shadows: boolean) {
    const ground = (id: string, x: number, z: number) => {
      const isl = layout.islands.find((i) => i.id === id)
      return isl ? groundHeight(isl, x, z) : 0
    }

    // Portfolio Island: lighthouse, workshop, project boards.
    const pf = DESTINATION_BY_ID.portfolio
    const f = facingDir(pf.facing)
    const side = { x: f.z, z: -f.x }
    const centre = { x: pf.dock.x - f.x * 27, z: pf.dock.z - f.z * 27 }
    this.lighthouse(centre.x + side.x * 9, centre.z + side.z * 9, ground('harbor-portfolio', centre.x + side.x * 9, centre.z + side.z * 9), 1, lanterns)
    this.house(centre.x - side.x * 7, centre.z - side.z * 7, ground('harbor-portfolio', centre.x - side.x * 7, centre.z - side.z * 7), pf.facing, lanterns, 'portfolio')

    FEATURED_PROJECTS.forEach((p, i) => {
      const off = (i - 1.5) * 4.2
      const bx = pf.dock.x - f.x * 16 + side.x * (off + (off > 0 ? 3 : -3))
      const bz = pf.dock.z - f.z * 16 + side.z * (off + (off > 0 ? 3 : -3))
      const y = Math.max(0.8, ground('harbor-portfolio', bx, bz))
      const mat = new MeshLambertMaterial({ map: boardTexture([`PROJECT ${String(i + 1).padStart(2, '0')}`, p.title, p.category]) })
      this.boardMats.push(mat)
      const board = new Mesh(new PlaneGeometry(2.4, 1.6), mat)
      board.position.set(bx, y + 1.9, bz)
      board.rotation.y = pf.facing
      this.group.add(board)
      wood.add(new Vector3(bx, y + 0.6, bz), new Vector3(0.14, 2.4, 0.14), pf.facing, 0.6)
    })

    // Project buoys (hidden underwater until Portfolio is entered).
    layout.projectBuoys.forEach((b) => {
      const g = new Group()
      const body = new Mesh(new CylinderGeometry(0.55, 0.75, 1.3, 10), mats.buoy)
      body.position.y = 0.3
      const band = new Mesh(new CylinderGeometry(0.57, 0.6, 0.25, 10), mats.white)
      band.position.y = 0.55
      const mast = new Mesh(new CylinderGeometry(0.05, 0.05, 1.2, 5), mats.dark)
      mast.position.y = 1.5
      g.add(body, band, mast)
      g.position.set(b.x, -4, b.z)
      body.castShadow = shadows
      this.buoys.push(g)
      this.group.add(g)
      this.buoyAnchors.push(new Vector3(b.x, 2.6, b.z))
      const l = lanterns.add(new Vector3(b.x, -2, b.z), 0.9, 'buoy')
      l.visible = 0
      this.buoyLanterns.push(lanterns.list.length - 1)
    })

    // Easter eggs.
    for (const s of SECRETS) {
      const { x, z } = s.position
      if (s.id === 'lighthouse') this.lighthouse(x, z, ground('secret-lighthouse', x, z), 0.75, lanterns)
      if (s.id === 'cabin') this.house(x, z, ground('secret-cabin', x, z), 0.6, lanterns, 'cabin')
      if (s.id === 'floating-sign') this.floatingSign(x, z, wood)
      if (s.id === 'hidden-island') this.stoneCircle(x, z, ground('secret-hidden-island', x, z))
    }
  }

  private lighthouse(x: number, z: number, y: number, scale: number, lanterns: Lanterns) {
    const h = 14 * scale
    const g = new Group()
    const segments = 5
    for (let i = 0; i < segments; i++) {
      const r0 = (1.6 - (i / segments) * 0.6) * scale
      const r1 = (1.6 - ((i + 1) / segments) * 0.6) * scale
      const seg = new Mesh(new CylinderGeometry(r1, r0, h / segments, 14), i % 2 ? mats.stripe : mats.white)
      seg.position.y = (i + 0.5) * (h / segments)
      seg.castShadow = true
      g.add(seg)
    }
    const top = new Mesh(new CylinderGeometry(1.1 * scale, 1.1 * scale, 0.3, 12), mats.dark)
    top.position.y = h + 0.15
    const cap = new Mesh(new ConeGeometry(1.15 * scale, 1.4 * scale, 12), mats.dark)
    cap.position.y = h + 2.1 * scale
    g.add(top, cap)
    lanterns.add(new Vector3(x, y + h + 0.95 * scale, z), 2.2, 'lighthouse')

    // Slow rotating beam, visible only at night.
    const beam = new Mesh(
      new ConeGeometry(2.6 * scale, 46 * scale, 16, 1, true).translate(0, -23 * scale, 0).rotateZ(Math.PI / 2),
      new MeshBasicMaterial({ color: '#ffd29a', transparent: true, opacity: 0.08, blending: AdditiveBlending, depthWrite: false, side: DoubleSide }),
    )
    beam.position.y = h + 0.95 * scale
    this.beams.push(beam)
    g.add(beam)
    g.position.set(x, y - 0.2, z)
    this.group.add(g)
  }

  private house(x: number, z: number, y: number, yaw: number, lanterns: Lanterns, owner: string) {
    const g = new Group()
    const walls = new Mesh(new BoxGeometry(4.2, 2.6, 3.4), mats.wall)
    walls.position.y = 1.3
    walls.castShadow = true
    const roof = new Mesh(roofGeometry(4.6, 3.8, 1.5), mats.roof)
    roof.position.y = 2.6
    roof.rotation.y = Math.PI / 2
    const win = new Mesh(new PlaneGeometry(0.8, 0.7), mats.window)
    win.position.set(0, 1.5, 1.71)
    g.add(walls, roof, win)
    g.position.set(x, y - 0.1, z)
    g.rotation.y = yaw
    this.group.add(g)
    const wp = new Vector3(0, 1.5, 2.2).applyAxisAngle(new Vector3(0, 1, 0), yaw).add(g.position)
    lanterns.add(wp, 0.5, owner)
  }

  private floatingSign(x: number, z: number, wood: WoodBuilder) {
    wood.add(new Vector3(x, 0.6, z), new Vector3(0.16, 3.2, 0.16), 0, 0.6)
    const mat = new MeshLambertMaterial({ map: boardTexture(['NOTICE', 'SLOW IS', 'SMOOTH']) })
    this.boardMats.push(mat)
    const board = new Mesh(new PlaneGeometry(1.8, 1.2), mat)
    board.position.set(x, 2.2, z)
    board.rotation.y = -Math.PI / 2
    this.group.add(board)
  }

  private stoneCircle(x: number, z: number, y: number) {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2
      const stone = new Mesh(new BoxGeometry(0.6, 1.4 + (i % 3) * 0.3, 0.4), mats.stone)
      stone.position.set(x + Math.sin(a) * 3.2, y + 0.6, z + Math.cos(a) * 3.2)
      stone.rotation.y = a
      this.group.add(stone)
    }
    const trunk = new Mesh(new CylinderGeometry(0.25, 0.4, 3.2, 6), mats.dark)
    trunk.position.set(x, y + 1.6, z)
    const crown = new Mesh(new SphereGeometry(2.4, 7, 5), mats.leaf)
    crown.position.set(x, y + 4.2, z)
    crown.scale.y = 0.8
    this.group.add(trunk, crown)
  }

  update(t: number, lanterns: Lanterns, reduced: boolean) {
    const rise = this.buoyRise.value
    this.buoys.forEach((g, i) => {
      const a = this.buoyAnchors[i]
      const y = (rise - 1) * 4 + waveHeight(a.x, a.z, t) * rise
      g.position.y = y
      g.rotation.z = reduced ? 0 : Math.sin(t * 1.1 + i) * 0.06 * rise
      const li = this.buoyLanterns[i]
      lanterns.list[li].visible = rise
      lanterns.setPosition(li, TMP.set(a.x, y + 2.15, a.z))
    })
    for (const b of this.beams) b.rotation.y = reduced ? 0.6 : t * 0.35
  }

  applyEnv(env: EnvState) {
    for (const b of this.beams) {
      b.material.opacity = 0.09 * env.lantern
      b.visible = env.lantern > 0.05
    }
    WIN.copy(LIT).multiplyScalar(0.4 + env.lantern * 0.6)
    mats.window.color.copy(WIN)
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose()
    })
    this.boardMats.forEach((m) => {
      m.map?.dispose()
      m.dispose()
    })
    this.beams.forEach((b) => b.material.dispose())
    Object.values(mats).forEach((m) => m.dispose())
  }
}

const TMP = new Vector3()
const LIT = new Color('#ffbf73')
const WIN = new Color()
