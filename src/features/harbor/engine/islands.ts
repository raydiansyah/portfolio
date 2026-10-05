import {
  BufferGeometry, Color, ConeGeometry, CylinderGeometry, DoubleSide, FrontSide, Float32BufferAttribute, Group,
  IcosahedronGeometry, InstancedMesh, Matrix4, Mesh, MeshLambertMaterial, Quaternion, Vector3,
  type IUniform,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import type { EnvState } from './theme'
import { rng, type Island, type WorldLayout } from './layout'

/** Island terrain (one merged mesh) + instanced trees, bushes and reeds swaying in the wind. */

export interface WindUniforms {
  uTime: IUniform<number>
  uWind: IUniform<number>
}

const RINGS = 8
const SEGMENTS = 30

/** Height profile across a lobe: flat-ish top, soft shore, underwater skirt. */
function profile(f: number, h: number) {
  const top = h * (1 - smoothstep(0.45, 1.02, f))
  const skirt = -1.4 * smoothstep(0.95, 1.25, f)
  return top + skirt
}

function smoothstep(a: number, b: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export function groundHeight(island: Island, x: number, z: number) {
  let best = -Infinity
  for (const l of island.lobes) best = Math.max(best, profile(Math.hypot(x - l.x, z - l.z) / l.r, island.height))
  return best
}

const SAND = new Color('#7a6f58')
const MUD = new Color('#4f4a3b')
const GRASS_A = new Color('#4a6338')
const GRASS_B = new Color('#5d7543')

function lobeGeometry(x: number, z: number, r: number, h: number, rand: () => number) {
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  const tmp = new Color()
  pos.push(x, h * 1.02, z)
  col.push(GRASS_A.r, GRASS_A.g, GRASS_A.b)
  for (let i = 1; i <= RINGS; i++) {
    const f = (i / RINGS) * 1.25
    for (let s = 0; s < SEGMENTS; s++) {
      const a = (s / SEGMENTS) * Math.PI * 2
      const jitter = 1 + (rand() - 0.5) * 0.16
      const rr = f * r * jitter
      const y = profile(f, h) + (f < 0.9 ? (rand() - 0.5) * 0.25 : 0)
      pos.push(x + Math.sin(a) * rr, y, z + Math.cos(a) * rr)
      if (y < 0.15) tmp.copy(MUD)
      else if (y < 0.55) tmp.copy(SAND)
      else tmp.copy(GRASS_A).lerp(GRASS_B, rand())
      col.push(tmp.r, tmp.g, tmp.b)
    }
  }
  for (let s = 0; s < SEGMENTS; s++) idx.push(0, 1 + s, 1 + ((s + 1) % SEGMENTS))
  for (let i = 1; i < RINGS; i++) {
    const a0 = 1 + (i - 1) * SEGMENTS
    const b0 = 1 + i * SEGMENTS
    for (let s = 0; s < SEGMENTS; s++) {
      const s1 = (s + 1) % SEGMENTS
      idx.push(a0 + s, b0 + s, b0 + s1, a0 + s, b0 + s1, a0 + s1)
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

function colorize(g: BufferGeometry, c: Color) {
  const n = g.getAttribute('position').count
  const arr = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3)
  g.setAttribute('color', new Float32BufferAttribute(arr, 3))
  return g.index ? g.toNonIndexed() : g
}

function treeGeometry() {
  const trunk = colorize(new CylinderGeometry(0.12, 0.2, 1.8, 5).translate(0, 0.9, 0), new Color('#4a3a2c'))
  const c1 = colorize(new ConeGeometry(1.25, 2.8, 7).translate(0, 2.7, 0), new Color('#2f4a2e'))
  const c2 = colorize(new ConeGeometry(0.9, 2.2, 7).translate(0, 3.8, 0), new Color('#37563a'))
  return mergeGeometries([trunk, c1, c2])!
}

function bushGeometry() {
  const trunk = colorize(new CylinderGeometry(0.1, 0.16, 0.8, 5).translate(0, 0.4, 0), new Color('#4a3a2c'))
  const crown = colorize(new IcosahedronGeometry(1.15, 0).scale(1, 0.8, 1).translate(0, 1.4, 0), new Color('#3f5b35'))
  return mergeGeometries([trunk, crown])!
}

/** A clump of 7 thin blades, tip colour fading to dry straw. */
function reedGeometry() {
  const pos: number[] = []
  const col: number[] = []
  const base = new Color('#36482e')
  const tip = new Color('#a39a6c')
  const rand = rng(7)
  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2
    const d = rand() * 0.5
    const x = Math.sin(a) * d
    const z = Math.cos(a) * d
    const h = 1.5 + rand() * 1.1
    const lean = (rand() - 0.5) * 0.5
    const w = 0.07
    pos.push(x - w, -0.3, z, x + w, -0.3, z, x + lean, h, z + lean * 0.5)
    col.push(base.r, base.g, base.b, base.r, base.g, base.b, tip.r, tip.g, tip.b)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new Float32BufferAttribute(pos, 3))
  g.setAttribute('color', new Float32BufferAttribute(col, 3))
  g.computeVertexNormals()
  return g
}

/** Inject a height-weighted sway into an instanced Lambert material. */
function windMaterial(wind: WindUniforms, stiffness: number, doubleSided = false) {
  const mat = new MeshLambertMaterial({ vertexColors: true, side: doubleSided ? DoubleSide : FrontSide })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = wind.uTime
    shader.uniforms.uWind = wind.uWind
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        float hgt = max(position.y, 0.0);
        vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
        float ph = dot(ip, vec2(0.21, 0.13));
        float sway = (sin(uTime * 1.3 + ph) * 0.6 + sin(uTime * 2.2 + ph * 1.7) * 0.4) * uWind * hgt * hgt * ${stiffness.toFixed(4)};
        transformed.x += sway;
        transformed.z += sway * 0.6;`,
      )
  }
  return mat
}

export class Islands {
  readonly group = new Group()
  private materials: MeshLambertMaterial[] = []

  constructor(layout: WorldLayout, wind: WindUniforms, vegetation: number, shadows: boolean) {
    const rand = rng(42)
    const terrain = mergeGeometries(
      layout.islands.flatMap((isl) => isl.lobes.map((l) => lobeGeometry(l.x, l.z, l.r, isl.height, rand))),
    )!
    const terrainMat = new MeshLambertMaterial({ vertexColors: true })
    const land = new Mesh(terrain, terrainMat)
    land.receiveShadow = shadows
    land.name = 'islands'
    this.materials.push(terrainMat)

    // Scatter vegetation on island tops, avoiding the pier root zone.
    const trees: Matrix4[] = []
    const bushes: Matrix4[] = []
    const m = new Matrix4()
    const q = new Quaternion()
    const up = new Vector3(0, 1, 0)
    for (const isl of layout.islands) {
      const main = isl.lobes[0]
      const area = isl.lobes.reduce((s, l) => s + Math.PI * l.r * l.r, 0)
      const count = Math.round((area / 100) * isl.treeDensity * vegetation)
      for (let i = 0; i < count; i++) {
        const lobe = isl.lobes[Math.floor(rand() * isl.lobes.length)] ?? main
        const a = rand() * Math.PI * 2
        const d = Math.sqrt(rand()) * lobe.r * 0.7
        const x = lobe.x + Math.sin(a) * d
        const z = lobe.z + Math.cos(a) * d
        const y = groundHeight(isl, x, z)
        if (y < 0.6) continue
        const s = 0.75 + rand() * 0.8
        q.setFromAxisAngle(up, rand() * Math.PI * 2)
        m.compose(new Vector3(x, y - 0.1, z), q, new Vector3(s, s * (0.85 + rand() * 0.4), s))
        ;(rand() < 0.62 ? trees : bushes).push(m.clone())
      }
    }

    const reeds: Matrix4[] = []
    for (const patch of layout.reeds) {
      const n = Math.max(1, Math.round(patch.r * 1.6 * vegetation))
      for (let i = 0; i < n; i++) {
        const a = rand() * Math.PI * 2
        const d = Math.sqrt(rand()) * patch.r
        const s = 0.7 + rand() * 0.6
        q.setFromAxisAngle(up, rand() * Math.PI * 2)
        m.compose(new Vector3(patch.x + Math.sin(a) * d, 0, patch.z + Math.cos(a) * d), q, new Vector3(s, s, s))
        reeds.push(m.clone())
      }
    }

    const make = (geo: BufferGeometry, mats: Matrix4[], mat: MeshLambertMaterial, cast: boolean) => {
      const im = new InstancedMesh(geo, mat, Math.max(1, mats.length))
      mats.forEach((mm, i) => im.setMatrixAt(i, mm))
      im.count = mats.length
      im.castShadow = cast && shadows
      im.computeBoundingSphere()
      this.materials.push(mat)
      return im
    }

    this.group.add(
      land,
      make(treeGeometry(), trees, windMaterial(wind, 0.004), true),
      make(bushGeometry(), bushes, windMaterial(wind, 0.012), true),
      make(reedGeometry(), reeds, windMaterial(wind, 0.03, true), false),
    )
  }

  applyEnv(env: EnvState) {
    for (const mat of this.materials) mat.color.copy(env.foliage)
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose()
    })
    this.materials.forEach((m) => m.dispose())
  }
}

