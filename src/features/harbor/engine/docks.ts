import {
  Box3, BoxGeometry, CanvasTexture, Color, Euler, Group, InstancedMesh, Matrix4, Mesh, MeshBasicMaterial,
  MeshLambertMaterial, OctahedronGeometry, PlaneGeometry, Quaternion, SRGBColorSpace, Vector3, type IUniform,
} from 'three'
import { DESTINATIONS, facingDir } from '../data/destinations'
import type { DestinationId, Tier } from '../types'
import type { EnvState } from './theme'
import type { Lanterns } from './lanterns'
import { rng, type WorldLayout } from './layout'

/** Piers, stilt structures, harbor signs and floating markers. */

export const DECK_HEIGHT = 0.85

interface WoodPiece {
  p: Vector3
  s: Vector3
  yaw: number
  tilt?: number
  shade: number
}

/** Collects box pieces, then renders them as one instanced mesh with a gentle bob. */
export class WoodBuilder {
  pieces: WoodPiece[] = []
  add(p: Vector3, s: Vector3, yaw: number, shade = 1, tilt = 0) {
    this.pieces.push({ p, s, yaw, shade, tilt })
  }
  build(time: IUniform<number>, shadows: boolean) {
    const mat = new MeshLambertMaterial({ color: '#ffffff' })
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
          vec2 ip = vec2(instanceMatrix[3][0], instanceMatrix[3][2]);
          transformed.y += sin(uTime * 0.9 + dot(ip, vec2(0.11, 0.07))) * 0.025;`,
        )
    }
    const mesh = new InstancedMesh(new BoxGeometry(1, 1, 1), mat, this.pieces.length)
    const m = new Matrix4()
    const q = new Quaternion()
    const e = new Euler()
    const base = new Color('#6b5641')
    const c = new Color()
    this.pieces.forEach((w, i) => {
      e.set(w.tilt ?? 0, w.yaw, 0)
      q.setFromEuler(e)
      m.compose(w.p, q, w.s)
      mesh.setMatrixAt(i, m)
      mesh.setColorAt(i, c.copy(base).multiplyScalar(w.shade))
    })
    mesh.castShadow = shadows
    mesh.receiveShadow = shadows
    mesh.computeBoundingSphere()
    return { mesh, mat }
  }
}

function signTexture(index: number, label: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 176
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#2a2520'
  ctx.fillRect(0, 0, 512, 176)
  ctx.strokeStyle = 'rgba(236, 222, 196, 0.25)'
  ctx.lineWidth = 3
  ctx.strokeRect(10, 10, 492, 156)
  ctx.fillStyle = 'rgba(236, 222, 196, 0.6)'
  ctx.font = '500 22px "JetBrains Mono Variable", ui-monospace, monospace'
  ctx.fillText(`${String(index).padStart(2, '0')} / 06`, 32, 52)
  ctx.fillStyle = '#efe3cc'
  ctx.font = '600 64px "Inter Variable", system-ui, sans-serif'
  ctx.fillText(label.toUpperCase(), 30, 130)
  const tex = new CanvasTexture(canvas)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 4
  return tex
}

export interface HarborVisual {
  id: DestinationId
  hitBox: Box3
  marker: Vector3
  lanterns: number[]
  /** Smoothed 0..1 marker emphasis. */
  emphasis: number
}

export class Docks {
  readonly group = new Group()
  readonly harbors: HarborVisual[] = []
  private markers: InstancedMesh
  private markerMat = new MeshBasicMaterial({ color: '#f1dfbf', transparent: true, opacity: 0.9 })
  private signMats: MeshLambertMaterial[] = []
  private m = new Matrix4()
  private q = new Quaternion()
  private s = new Vector3()
  private p = new Vector3()

  constructor(layout: WorldLayout, wood: WoodBuilder, lanterns: Lanterns) {
    const rand = rng(5)
    for (const pier of layout.piers) {
      const f = facingDir(pier.facing)
      const len = Math.hypot(pier.tip.x - pier.root.x, pier.tip.z - pier.root.z)
      const side = { x: f.z, z: -f.x }
      // Deck planks across the pier axis.
      for (let d = 0; d <= len + 1.5; d += 0.6) {
        if (pier.broken && rand() < 0.3) continue
        const x = pier.root.x + f.x * d
        const z = pier.root.z + f.z * d
        const tilt = pier.broken ? (rand() - 0.5) * 0.25 : 0
        wood.add(new Vector3(x, DECK_HEIGHT + (pier.broken ? -rand() * 0.3 : 0), z), new Vector3(2.6, 0.1, 0.48), pier.facing, 0.85 + rand() * 0.3, tilt)
      }
      // Posts every ~3 m on both sides.
      for (let d = 0; d <= len + 1.5; d += 3) {
        for (const k of [-1, 1]) {
          wood.add(
            new Vector3(pier.root.x + f.x * d + side.x * 1.2 * k, -0.3, pier.root.z + f.z * d + side.z * 1.2 * k),
            new Vector3(0.24, 2.6, 0.24),
            pier.facing,
            0.7,
          )
        }
      }
      if (pier.id === 'abandoned') {
        lanterns.add(new Vector3(pier.tip.x + side.x * 1.2, 2.3, pier.tip.z + side.z * 1.2), 0.35, 'abandoned-dock')
        continue
      }

      const dest = DESTINATIONS.find((d) => d.id === pier.id)!
      const lanternIds: number[] = []
      for (const k of [-1, 1]) {
        const px = pier.tip.x + side.x * 1.25 * k
        const pz = pier.tip.z + side.z * 1.25 * k
        wood.add(new Vector3(px, 1.9, pz), new Vector3(0.16, 2.2, 0.16), pier.facing, 0.6)
        lanterns.add(new Vector3(px, 3.15, pz), 1, dest.id)
        lanternIds.push(lanterns.list.length - 1)
      }

      // Sign near the pier root, facing open water.
      const sx = pier.root.x + f.x * 2.5 + side.x * 2.4
      const sz = pier.root.z + f.z * 2.5 + side.z * 2.4
      for (const k of [-1, 1]) {
        wood.add(new Vector3(sx + side.x * 1.3 * k, 1.6, sz + side.z * 1.3 * k), new Vector3(0.14, 3, 0.14), pier.facing, 0.6)
      }
      const signMat = new MeshLambertMaterial({ map: signTexture(dest.index, dest.label), emissive: '#ffffff' })
      signMat.emissiveMap = signMat.map
      this.signMats.push(signMat)
      const sign = new Mesh(new PlaneGeometry(3, 1.03), signMat)
      sign.position.set(sx + f.x * 0.09, 2.55, sz + f.z * 0.09)
      sign.rotation.y = pier.facing
      this.group.add(sign)

      const marker = new Vector3(sx, 5.2, sz)
      const hitBox = new Box3().setFromPoints([
        new Vector3(pier.root.x - 3, -1, pier.root.z - 3),
        new Vector3(pier.tip.x + 3, 6, pier.tip.z + 3),
        marker.clone().addScalar(1.5),
        marker.clone().subScalar(1.5),
      ])
      this.harbors.push({ id: dest.id, hitBox, marker, lanterns: lanternIds, emphasis: 0 })
    }

    // Stilt platforms in the open water.
    for (const st of layout.structures) {
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        wood.add(new Vector3(st.x + dx * 1.3, -0.1, st.z + dz * 1.3), new Vector3(0.22, 2.8, 0.22), st.yaw, 0.65)
      }
      wood.add(new Vector3(st.x, 1.25, st.z), new Vector3(3.2, 0.14, 3.2), st.yaw, 0.95)
    }

    this.markers = new InstancedMesh(new OctahedronGeometry(0.42, 0), this.markerMat, this.harbors.length)
    this.markers.frustumCulled = false
    this.group.add(this.markers)
  }

  /** tiers drive marker size; `active` (waypoint or docked) adds a lantern highlight. */
  update(t: number, dt: number, tiers: Record<DestinationId, Tier>, active: DestinationId | null, lanterns: Lanterns, reduced: boolean) {
    this.harbors.forEach((h, i) => {
      const target = active === h.id ? 1 : tiers[h.id] >= 1 ? 0.6 : 0.25
      h.emphasis += (target - h.emphasis) * Math.min(1, dt * 3)
      const bob = reduced ? 0 : Math.sin(t * 1.4 + i) * 0.22
      const spin = reduced ? 0 : t * 0.6 + i
      const sc = 0.55 + h.emphasis * 0.75
      this.q.setFromAxisAngle(UP, spin)
      this.s.setScalar(sc)
      this.m.compose(this.p.set(h.marker.x, h.marker.y + bob, h.marker.z), this.q, this.s)
      this.markers.setMatrixAt(i, this.m)
      const hl = active === h.id ? 1 : tiers[h.id] >= 3 ? 0.6 : tiers[h.id] >= 2 ? 0.25 : 0
      for (const li of h.lanterns) {
        const l = lanterns.list[li]
        l.highlight += (hl - l.highlight) * Math.min(1, dt * 2.5)
      }
    })
    this.markers.instanceMatrix.needsUpdate = true
  }

  applyEnv(env: EnvState) {
    // Signs glow faintly at night so they stay readable without becoming neon.
    for (const m of this.signMats) m.emissiveIntensity = 0.18 + env.lantern * 0.22
    this.markerMat.color.lerpColors(MARKER_DAY, MARKER_NIGHT, env.lantern)
  }

  dispose() {
    this.group.traverse((o) => {
      if (o instanceof Mesh) o.geometry.dispose()
    })
    this.signMats.forEach((m) => {
      m.map?.dispose()
      m.dispose()
    })
    this.markerMat.dispose()
  }
}

const UP = new Vector3(0, 1, 0)
const MARKER_DAY = new Color('#3c4a55')
const MARKER_NIGHT = new Color('#f3d9a8')
